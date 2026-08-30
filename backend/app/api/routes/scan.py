"""
LMPC Compliance System — Scan API Routes

Core scan endpoints:
- POST   /scan              → Upload image & run compliance pipeline
- GET    /scans             → Paginated scan history with filters
- GET    /scans/{id}        → Detailed scan result
- PATCH  /scans/{id}/fields → Human-in-the-loop field corrections
- DELETE /scans/{id}        → Delete a scan record
"""

import logging
import math
import os
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.schemas import (
    ComplianceReportResponse,
    ExtractedFieldResponse,
    FieldCorrectionBatchRequest,
    FieldCorrectionResponse,
    PaginatedScansResponse,
    ScanDetailResponse,
    ScanSummaryResponse,
    UserResponse,
    VerdictResponse,
    ViolationResponse,
)
from app.core.config import normalize_image_url, resolve_image_path
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.models import (
    ExtractedField as ExtractedFieldModel,
    Scan,
    ScanStatus,
    User,
    UserRole,
    Violation as ViolationModel,
)


OFFICIAL_ROLES = {
    UserRole.STATE_COMMISSIONER,
    UserRole.DIRECTOR,
    UserRole.CLMO,
    UserRole.CLMO_SUPERVISOR,
    UserRole.ALMO,
    UserRole.SUPERINTENDENT,
    UserRole.SUPERVISOR,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.INSPECTOR,
    UserRole.SUB_INSPECTOR,
    UserRole.RESOLUTION_DESK,
}
from app.services.scan_service import (
    persist_scan_results,
    re_evaluate_scan,
    run_scan_pipeline,
    save_upload_image,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Scan"])


# ---------- POST /scan ----------

@router.post("/scan", response_model=ScanDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_scan(
    file: Annotated[UploadFile, File(description="Product label image (JPEG/PNG)")],
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    product_name: Annotated[Optional[str], Form()] = None,
    brand: Annotated[Optional[str], Form()] = None,
    category: Annotated[Optional[str], Form()] = None,
    assignment_id: Annotated[Optional[int], Form()] = None,
    latitude: Annotated[Optional[float], Form()] = None,
    longitude: Annotated[Optional[float], Form()] = None,
    gps_accuracy_meters: Annotated[Optional[float], Form()] = None,
    location_name: Annotated[Optional[str], Form()] = None,
    client_evidence_hash: Annotated[Optional[str], Form()] = None,
):
    """Upload a product label image and run the full compliance pipeline."""
    # Validate file type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type: {file.content_type}. Only images are accepted.",
        )

    try:
        # Save image
        image_path = await save_upload_image(file)

        # Run the full pipeline
        result = await run_scan_pipeline(
            image_path=image_path,
            category=category,
            product_name=product_name,
            brand=brand,
        )

        # Detect packaging barcode GTIN
        barcode_info = None
        try:
            from app.pipeline.barcode_detector import BarcodeDetector
            from app.pipeline.preprocessor import load_image
            img_np = load_image(image_path)
            if img_np is not None:
                barcode_info = BarcodeDetector().detect_and_decode(img_np)
        except Exception as b_err:
            logger.warning(f"Barcode detection skipped: {b_err}")

        # Persist to database
        scan = await persist_scan_results(
            db=db,
            user_id=current_user.id,
            image_url=image_path,
            product_name=product_name,
            brand=brand,
            category=category,
            extraction=result["extraction"],
            report=result["compliance_report"],
            raw_ocr_text=result["ocr_result"].get("raw_text", ""),
            assignment_id=assignment_id,
            latitude=latitude,
            longitude=longitude,
            gps_accuracy_meters=gps_accuracy_meters,
            location_name=location_name,
            client_evidence_hash=client_evidence_hash,
            barcode_data=barcode_info,
        )

        # Reload with relationships
        await db.refresh(scan, attribute_names=["extracted_fields", "violations", "user"])

        return _build_scan_detail_response(scan, result["compliance_report"])

    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception("Scan pipeline failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan processing failed: {str(e)}",
        )


# ---------- GET /scans ----------

@router.get("/scans", response_model=PaginatedScansResponse)
async def list_scans(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by scan status"),
    category: Optional[str] = Query(None, description="Filter by commodity category"),
    search: Optional[str] = Query(None, description="Search by product name or brand"),
):
    """List scans with pagination and optional filters.

    Inspectors see their own scans. Admins see all scans.
    """
    query = select(Scan)

    # Role-based filtering: Directorate officials can view all scans; non-officials only view their own
    if current_user.role not in OFFICIAL_ROLES:
        query = query.where(Scan.user_id == current_user.id)

    # Apply filters
    if status_filter:
        try:
            scan_status = ScanStatus(status_filter)
            query = query.where(Scan.status == scan_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}. "
                       f"Valid: {[s.value for s in ScanStatus]}",
            )

    if category:
        query = query.where(Scan.category == category)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            Scan.product_name.ilike(search_pattern) | Scan.brand.ilike(search_pattern)
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(Scan.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    scans = result.scalars().all()

    return PaginatedScansResponse(
        items=[ScanSummaryResponse.model_validate(s) for s in scans],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


# ---------- GET /scans/{id} ----------

@router.get("/scans/{scan_id}", response_model=ScanDetailResponse)
async def get_scan_detail(
    scan_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get detailed scan result with extracted fields, violations, and report."""
    scan = await _get_scan_or_404(db, scan_id, current_user)
    return _build_scan_detail_response(scan)


@router.get("/scans/{scan_id}/image")
async def get_scan_image(
    scan_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Serve the stored product label image for this scan (requires auth)."""
    scan = await _get_scan_or_404(db, scan_id, current_user)
    file_path = resolve_image_path(scan.image_url)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image file not found")
    return FileResponse(str(file_path))



# ---------- PATCH /scans/{id}/fields ----------

@router.patch("/scans/{scan_id}/fields", response_model=FieldCorrectionResponse)
async def correct_scan_fields(
    scan_id: int,
    body: FieldCorrectionBatchRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Human-in-the-loop: correct misdetected field values.

    After corrections, optionally re-runs the rule engine to update
    the compliance verdict in real time.
    """
    scan = await _get_scan_or_404(db, scan_id, current_user)

    corrected_ids: list[str] = []

    VALID_FIELD_IDS = {
        "commodity_name", "net_quantity", "mrp", "tax_declaration",
        "manufacturer_info", "date_manufacture", "date_expiry",
        "consumer_care", "country_of_origin", "unit_sale_price",
        "batch_lot_number", "fssai_license",
    }

    for correction in body.corrections:
        val = (correction.corrected_value or "").strip()
        if not val:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrected value for '{correction.field_id}' cannot be empty.",
            )

        if correction.field_id not in VALID_FIELD_IDS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid field_id '{correction.field_id}'. Must be one of {sorted(list(VALID_FIELD_IDS))}",
            )

        # Find the existing extracted field
        target_field = None
        for ef in scan.extracted_fields:
            if ef.field_name == correction.field_id:
                target_field = ef
                break

        if target_field is None:
            # Create a new field record for previously undetected fields
            target_field = ExtractedFieldModel(
                scan_id=scan.id,
                field_name=correction.field_id,
            )
            db.add(target_field)

        # Apply correction
        target_field.field_value = val
        target_field.normalized_value = val
        target_field.is_manually_corrected = True
        target_field.confidence = 1.0  # Manual correction = full confidence

        corrected_ids.append(correction.field_id)

    await db.flush()

    # Re-evaluate compliance if requested
    new_verdict = None
    new_score = None

    if body.re_evaluate:
        await db.refresh(scan, attribute_names=["extracted_fields", "violations"])
        report = await re_evaluate_scan(db, scan)
        new_verdict = report.verdict.value
        new_score = report.compliance_score

    return FieldCorrectionResponse(
        scan_id=scan.id,
        corrected_fields=corrected_ids,
        re_evaluated=body.re_evaluate,
        new_verdict=new_verdict,
        new_compliance_score=new_score,
    )


# ---------- DELETE /scans/{id} ----------

@router.delete("/scans/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(
    scan_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a scan and all its associated data."""
    scan = await _get_scan_or_404(db, scan_id, current_user)
    await db.delete(scan)


# ---------- Helpers ----------

async def _get_scan_or_404(
    db: AsyncSession,
    scan_id: int,
    current_user: User,
) -> Scan:
    """Load a scan with relationships, checking ownership/admin access."""
    result = await db.execute(
        select(Scan)
        .options(
            selectinload(Scan.extracted_fields),
            selectinload(Scan.violations),
            selectinload(Scan.user),
        )
        .where(Scan.id == scan_id)
    )
    scan = result.scalar_one_or_none()

    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan {scan_id} not found",
        )

    # Access check (all officials can access all product scans; non-officials only access their own)
    if current_user.role not in OFFICIAL_ROLES and scan.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this scan",
        )

    return scan


def _build_scan_detail_response(
    scan: Scan,
    compliance_report=None,
) -> ScanDetailResponse:
    """Build a ScanDetailResponse from a Scan ORM model."""

    # Convert extracted fields
    extracted_fields = []
    for ef in scan.extracted_fields:
        extracted_fields.append(ExtractedFieldResponse(
            field_id=ef.field_name,
            display_name=ef.field_name.replace("_", " ").title(),
            detected=ef.field_value is not None,
            value=ef.field_value,
            normalized_value=ef.normalized_value,
            confidence=ef.confidence or 0.0,
            bounding_box=ef.bounding_box,
            font_height_px=None,
            font_status=ef.font_status,
            source=ef.measurement_method or "",
            is_manually_corrected=ef.is_manually_corrected,
        ))

    # Convert violations
    violations = [
        ViolationResponse(
            id=v.id,
            rule_code=v.rule_code,
            field_id=v.field_id or "",
            severity=v.severity.value,
            title=v.title,
            description=v.description or "",
            recommendation=v.recommendation or "",
        )
        for v in scan.violations
    ]

    # Convert user
    user_resp = UserResponse(
        id=scan.user.id,
        username=scan.user.username,
        email=scan.user.email,
        full_name=scan.user.full_name,
        role=scan.user.role.value,
        department=scan.user.department,
        is_active=scan.user.is_active,
        created_at=scan.user.created_at,
    )

    # Build compliance report response if provided
    report_resp = None
    if compliance_report:
        report_dict = compliance_report.to_dict()
        report_resp = ComplianceReportResponse(
            verdict=VerdictResponse(**report_dict["verdict"]),
            compliance_score=report_dict["compliance_score"],
            violation_summary=report_dict["violation_summary"],
            violations=violations,
            field_statuses=report_dict["field_statuses"],
            font_measurements=report_dict["font_measurements"],
            metadata=report_dict.get("metadata", {}),
        )

    return ScanDetailResponse(
        id=scan.id,
        product_name=scan.product_name,
        brand=scan.brand,
        category=scan.category,
        image_url=scan.image_url,
        status=scan.status.value,
        compliance_score=scan.compliance_score,
        raw_ocr_text=scan.raw_ocr_text,
        calibration_method=scan.calibration_method,
        latitude=scan.latitude,
        longitude=scan.longitude,
        gps_accuracy_meters=scan.gps_accuracy_meters,
        location_name=scan.location_name,
        client_evidence_hash=scan.client_evidence_hash,
        inspection_signature=scan.inspection_signature,
        barcode_data=scan.barcode_data,
        barcode_cross_check_status=scan.barcode_cross_check_status,
        approval_status=scan.approval_status.value if hasattr(scan.approval_status, "value") else str(scan.approval_status),
        super_admin_reviewer_id=scan.super_admin_reviewer_id,
        super_admin_review_notes=scan.super_admin_review_notes,
        sanctioned_at=scan.sanctioned_at,
        created_at=scan.created_at,
        updated_at=scan.updated_at,
        user=user_resp,
        extracted_fields=extracted_fields,
        violations=violations,
        compliance_report=report_resp,
    )
