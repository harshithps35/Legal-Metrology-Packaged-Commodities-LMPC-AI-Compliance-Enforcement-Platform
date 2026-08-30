"""
LMPC Compliance System — Scan Service

Orchestrates the full scan pipeline: image save → preprocess → OCR →
field extraction → font measurement → rule engine → database persist.

This is the "glue" layer that connects all Phase 1–4 modules into
a single callable service used by the API routes.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, normalize_image_url, resolve_image_path
from app.db.models.models import (
    ExtractedField as ExtractedFieldModel,
    Scan,
    ScanStatus,
    Violation as ViolationModel,
    ViolationSeverity as ViolationSeverityDB,
)
from app.engine.font_measurer import CalibrationData, calibrate_tier1
from app.engine.rule_engine import ComplianceReport, evaluate_compliance
from app.nlp.field_extractor import ExtractionResult, extract_fields
from app.nlp.regex_matchers import to_grams_or_ml
from app.pipeline.ocr_engine import OCRResult, run_ocr_pipeline
from app.pipeline.preprocessor import preprocess_label_image

logger = logging.getLogger(__name__)
settings = get_settings()


async def save_upload_image(file: UploadFile) -> str:
    """Save an uploaded image to disk and return its normalized web URL path (/uploads/<filename>)."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "image.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = upload_dir / filename

    async with aiofiles.open(filepath, "wb") as out:
        content = await file.read()
        await out.write(content)

    return f"/uploads/{filename}"



async def run_scan_pipeline(
    image_path: str,
    category: Optional[str] = None,
    calibration: Optional[CalibrationData] = None,
    product_name: Optional[str] = None,
    brand: Optional[str] = None,
) -> dict:
    """Execute the full compliance scan pipeline.

    Steps:
    1. Load and preprocess image (Phase 1)
    2. Run OCR extraction (Phase 1)
    3. Extract structured fields (Phase 2)
    4. Run rule engine with font measurement (Phase 3 + 4)

    Args:
        image_path: Path to the saved image file.
        category: Commodity category ID (e.g., "food").
        calibration: Optional Tier 2 calibration data.
        product_name: Optional product name.
        brand: Optional brand name.

    Returns:
        Dict with keys: ocr_result, extraction, compliance_report.
    """
    # --- Phase 1: Preprocess + OCR ---
    # Resolve local disk path from URL/path
    disk_path = str(resolve_image_path(image_path) or image_path)
    
    # Offload CPU-bound OCR to a thread to avoid blocking the event loop
    pipeline_output = await asyncio.to_thread(
        run_ocr_pipeline,
        image_path=disk_path,
        preprocess=True,
        attempt_perspective=True,
    )


    ocr_data = pipeline_output["ocr_result"]
    preprocess_info = pipeline_output["preprocessing"]

    # Reconstruct OCRResult from dict for field extraction
    from app.pipeline.ocr_engine import OCRResult, OCRToken, OCRLine, BoundingBox

    tokens = []
    lines = []
    for line_data in ocr_data.get("lines", []):
        line_tokens = []
        for t in line_data.get("tokens", []):
            bb = t.get("bounding_box", {})
            token = OCRToken(
                text=t["text"],
                confidence=t["confidence"],
                bounding_box=BoundingBox(
                    x=bb.get("x", 0),
                    y=bb.get("y", 0),
                    width=bb.get("w", 0),
                    height=bb.get("h", 0),
                ),
                block_num=t.get("block_num", 0),
                line_num=t.get("line_num", 0),
                word_num=t.get("word_num", 0),
            )
            tokens.append(token)
            line_tokens.append(token)
        if line_tokens:
            lines.append(OCRLine(
                tokens=line_tokens,
                line_num=line_data.get("tokens", [{}])[0].get("line_num", 0) if line_data.get("tokens") else 0,
                block_num=line_data.get("tokens", [{}])[0].get("block_num", 0) if line_data.get("tokens") else 0,
            ))

    ocr_result = OCRResult(
        raw_text=ocr_data.get("raw_text", ""),
        tokens=tokens,
        lines=lines,
        image_width=ocr_data.get("image_size", {}).get("width", 2000),
        image_height=ocr_data.get("image_size", {}).get("height", 1500),
        engine=ocr_data.get("engine", "tesseract"),
        language=ocr_data.get("language", "hin+eng"),
        avg_confidence=ocr_data.get("avg_confidence", 0.0),
    )

    # --- Phase 2: Field Extraction ---
    extraction = await asyncio.to_thread(
        extract_fields,
        ocr_result,
        category=category,
        product_name=product_name,
        brand=brand,
    )

    # --- Phase 3+4: Font Measurement + Rule Engine ---
    report = await asyncio.to_thread(
        evaluate_compliance,
        extraction=extraction,
        category=category,
        calibration=calibration,
        image_width_px=ocr_result.image_width,
        image_height_px=ocr_result.image_height,
    )

    return {
        "ocr_result": ocr_data,
        "preprocessing": preprocess_info,
        "extraction": extraction,
        "compliance_report": report,
    }


async def persist_scan_results(
    db: AsyncSession,
    user_id: int,
    image_url: str,
    product_name: Optional[str],
    brand: Optional[str],
    category: Optional[str],
    extraction: ExtractionResult,
    report: ComplianceReport,
    raw_ocr_text: str,
    assignment_id: Optional[int] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    gps_accuracy_meters: Optional[float] = None,
    location_name: Optional[str] = None,
    client_evidence_hash: Optional[str] = None,
    barcode_data: Optional[dict] = None,
) -> Scan:
    """Persist scan results to the database with GPS chain of custody and assignment credits."""
    import hashlib
    from app.db.models.models import (
        ApprovalStatus,
        AssignmentCredit,
        EvidenceFile,
    )

    # Map verdict to ScanStatus
    status_map = {
        "COMPLIANT": ScanStatus.COMPLIANT,
        "NON_COMPLIANT": ScanStatus.NON_COMPLIANT,
        "REQUIRES_MANUAL_REVIEW": ScanStatus.REQUIRES_REVIEW,
    }
    scan_status = status_map.get(report.verdict.value, ScanStatus.REQUIRES_REVIEW)

    # Determine approval status for two-tier regulatory sanction
    if scan_status == ScanStatus.NON_COMPLIANT and report.critical_count > 0:
        approval_status = ApprovalStatus.PENDING_SANCTION
    else:
        approval_status = ApprovalStatus.AUTO_APPROVED

    # Infer product name from extraction if not provided
    if not product_name:
        cn = extraction.fields.get("commodity_name")
        if cn and cn.detected:
            product_name = cn.value

    # Normalize image URL
    normalized_img_url = normalize_image_url(image_url)

    # Compute inspection signature
    now = datetime.now(timezone.utc)
    sig_payload = f"{client_evidence_hash or ''}:{latitude}:{longitude}:{user_id}:{now.isoformat()}"
    inspection_signature = hashlib.sha256(sig_payload.encode()).hexdigest()

    # Barcode cross-check status
    barcode_status = "MATCHED" if barcode_data and barcode_data.get("detected") else "NOT_DETECTED"

    scan = Scan(
        user_id=user_id,
        assignment_id=assignment_id,
        product_name=product_name,
        brand=brand,
        category=category,
        image_url=normalized_img_url,
        status=scan_status,
        compliance_score=report.compliance_score,
        raw_ocr_text=raw_ocr_text,
        calibration_method=report.metadata.get("calibration_method"),
        latitude=latitude,
        longitude=longitude,
        gps_accuracy_meters=gps_accuracy_meters,
        location_name=location_name,
        client_evidence_hash=client_evidence_hash or hashlib.sha256(normalized_img_url.encode()).hexdigest(),
        inspection_signature=inspection_signature,
        barcode_data=barcode_data,
        barcode_cross_check_status=barcode_status,
        approval_status=approval_status,
    )
    db.add(scan)
    await db.flush()

    # Add EvidenceFile
    evidence_file = EvidenceFile(
        scan_id=scan.id,
        file_type="original",
        storage_path=normalized_img_url,
        file_hash=scan.client_evidence_hash,
        mime_type="image/jpeg",
    )

    db.add(evidence_file)

    # If scan is tied to an assignment, record AssignmentCredit
    if assignment_id:
        credit = AssignmentCredit(
            assignment_id=assignment_id,
            scan_id=scan.id,
            credited_at=now,
        )
        db.add(credit)

    # Persist extracted fields
    for field_id, ext_field in extraction.fields.items():
        font_status = None
        if field_id in report.font_measurements:
            font_status = report.font_measurements[field_id].get("status")

        db_field = ExtractedFieldModel(
            scan_id=scan.id,
            field_name=ext_field.field_id,
            field_value=ext_field.value,
            normalized_value=ext_field.normalized_value,
            confidence=ext_field.confidence,
            bounding_box=ext_field.bounding_box,
            font_size_mm=None,  # Populated if font measurement exists
            font_status=font_status,
            measurement_method=ext_field.source,
        )

        if field_id in report.font_measurements:
            db_field.font_size_mm = report.font_measurements[field_id].get("font_height_mm")
            db_field.measurement_method = report.font_measurements[field_id].get("measurement_method")

        db.add(db_field)

    # Persist violations
    for violation in report.violations:
        db_violation = ViolationModel(
            scan_id=scan.id,
            rule_code=violation.rule_code,
            field_id=violation.field_id,
            severity=ViolationSeverityDB(violation.severity.value),
            title=violation.title,
            description=violation.description,
            recommendation=violation.recommendation,
        )
        db.add(db_violation)

    await db.flush()
    await db.refresh(scan)

    return scan


async def re_evaluate_scan(
    db: AsyncSession,
    scan: Scan,
    category: Optional[str] = None,
) -> ComplianceReport:
    """Re-run the rule engine after manual field corrections.

    Rebuilds the ExtractionResult from the database fields,
    then runs evaluate_compliance again.
    """
    from app.nlp.field_extractor import ExtractedField as ExtractedFieldSchema, ExtractionResult

    # Build ExtractionResult from DB fields
    fields: dict[str, ExtractedFieldSchema] = {}
    field_heights: dict[str, int] = {}

    for db_field in scan.extracted_fields:
        fid = db_field.field_name
        # Parse numeric and unit for net quantity / mrp
        num_val = None
        unit_val = None
        if db_field.field_value:
            if fid == "net_quantity":
                from app.nlp.regex_matchers import match_net_quantity
                m = match_net_quantity(db_field.field_value)
                if m:
                    num_val = m[0].numeric_value
                    unit_val = m[0].unit
            elif fid == "mrp":
                from app.nlp.regex_matchers import match_mrp
                m = match_mrp(db_field.field_value)
                if m:
                    num_val = m[0].numeric_value

        bb = db_field.bounding_box
        font_h = int(bb.get("h", 0)) if isinstance(bb, dict) and bb.get("h") else None

        fields[fid] = ExtractedFieldSchema(
            field_id=fid,
            display_name=fid.replace("_", " ").title(),
            detected=db_field.field_value is not None,
            value=db_field.field_value,
            normalized_value=db_field.normalized_value,
            numeric_value=num_val,
            unit=unit_val,
            confidence=db_field.confidence or 0.0,
            bounding_box=bb,
            font_height_px=font_h,
            source=db_field.measurement_method or "manual",
            metadata={},
        )

    # Fill in missing field IDs with not-detected
    all_field_ids = [
        "commodity_name", "net_quantity", "mrp", "tax_declaration",
        "manufacturer_info", "date_manufacture", "date_expiry",
        "consumer_care", "country_of_origin", "unit_sale_price",
        "batch_lot_number", "fssai_license",
    ]
    for fid in all_field_ids:
        if fid not in fields:
            fields[fid] = ExtractedFieldSchema(
                field_id=fid,
                display_name=fid.replace("_", " ").title(),
                detected=False,
                confidence=0.0,
                source="none",
            )

    detected = sum(1 for f in fields.values() if f.detected)
    extraction = ExtractionResult(
        fields=fields,
        all_matches={},
        raw_text=scan.raw_ocr_text or "",
        total_fields_detected=detected,
        total_fields_expected=7,
        detection_rate=detected / 7,
    )

    # Re-evaluate
    report = evaluate_compliance(
        extraction=extraction,
        category=category or scan.category,
    )

    # Update scan record
    status_map = {
        "COMPLIANT": ScanStatus.COMPLIANT,
        "NON_COMPLIANT": ScanStatus.NON_COMPLIANT,
        "REQUIRES_MANUAL_REVIEW": ScanStatus.REQUIRES_REVIEW,
    }
    scan.status = status_map.get(report.verdict.value, ScanStatus.REQUIRES_REVIEW)
    scan.compliance_score = report.compliance_score

    # Replace violations
    for old_v in scan.violations:
        await db.delete(old_v)

    for violation in report.violations:
        db.add(ViolationModel(
            scan_id=scan.id,
            rule_code=violation.rule_code,
            field_id=violation.field_id,
            severity=ViolationSeverityDB(violation.severity.value),
            title=violation.title,
            description=violation.description,
            recommendation=violation.recommendation,
        ))

    await db.flush()

    return report
