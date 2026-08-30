"""
LMPC Compliance System — Rule Engine

Takes the structured field JSON from the NLP layer (Phase 2) and the
font measurement results (Phase 3), runs every statutory check from
the Legal Metrology (Packaged Commodities) Rules 2011, and produces
a verdict with an itemized violation report.

Rules implemented:
    Rule 1: Presence of mandatory fields
    Rule 2: Format compliance (MRP tax declaration, standard units, etc.)
    Rule 3: Dual pricing prohibition
    Rule 4: Metric unit validation
    Rule 5: Date validity and expiry check
    Rule 6: Font height compliance (Schedule II / Rule 9)

Outputs:
    - Severity-graded violation list (CRITICAL / MAJOR / MINOR)
    - Overall verdict: COMPLIANT | NON_COMPLIANT | REQUIRES_MANUAL_REVIEW
    - Compliance score (0–100%)
"""

import calendar
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from app.engine.font_measurer import (
    CalibrationData,
    FontComplianceStatus,
    FontMeasurement,
    MeasurementMethod,
    MeasurementConfidence,
    calibrate_tier1,
    measure_all_fields,
)
from app.nlp.field_extractor import ExtractedField, ExtractionResult
from app.nlp.regex_matchers import normalize_unit, to_grams_or_ml
from app.rules.rules_loader import (
    get_category_by_id,
    get_field_by_id,
    get_font_size_rules,
    get_mandatory_fields,
    get_severity_definitions,
    get_verdict_logic,
    load_rules,
)

logger = logging.getLogger(__name__)


# ---------- Data Structures ----------

class ViolationSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    MAJOR = "MAJOR"
    MINOR = "MINOR"


class Verdict(str, Enum):
    COMPLIANT = "COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"
    REQUIRES_MANUAL_REVIEW = "REQUIRES_MANUAL_REVIEW"


@dataclass
class Violation:
    """A single compliance violation."""
    rule_code: str
    field_id: str
    severity: ViolationSeverity
    title: str
    description: str
    recommendation: str = ""

    def to_dict(self) -> dict:
        return {
            "rule_code": self.rule_code,
            "field_id": self.field_id,
            "severity": self.severity.value,
            "title": self.title,
            "description": self.description,
            "recommendation": self.recommendation,
        }


@dataclass
class ComplianceReport:
    """Full compliance evaluation report."""
    verdict: Verdict
    compliance_score: float  # 0–100
    total_violations: int
    critical_count: int
    major_count: int
    minor_count: int
    violations: list[Violation]
    field_statuses: dict[str, dict]     # field_id → {detected, compliant, issues}
    font_measurements: dict[str, dict]  # field_id → FontMeasurement dict
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        sev_defs = get_severity_definitions()
        return {
            "verdict": {
                "status": self.verdict.value,
                "display_name": self.verdict.value.replace("_", " ").title(),
                "color": sev_defs.get(self.verdict.value, {}).get("color", "#6B7280")
                         if self.verdict == Verdict.NON_COMPLIANT else
                         ("#16A34A" if self.verdict == Verdict.COMPLIANT else "#F59E0B"),
            },
            "compliance_score": round(self.compliance_score, 1),
            "violation_summary": {
                "total": self.total_violations,
                "critical": self.critical_count,
                "major": self.major_count,
                "minor": self.minor_count,
            },
            "violations": [v.to_dict() for v in self.violations],
            "field_statuses": self.field_statuses,
            "font_measurements": self.font_measurements,
            "metadata": self.metadata,
        }


# ---------- Individual Rule Checks ----------

def _check_mandatory_presence(
    extraction: ExtractionResult,
    category: Optional[str] = None,
) -> list[Violation]:
    """Rule 1: Check presence of all mandatory fields.

    Uses rules_lmpc.json to determine which fields are mandatory
    and which are conditional based on commodity category.
    """
    violations: list[Violation] = []
    rule_definitions = get_mandatory_fields()

    cat_info = get_category_by_id(category) if category else None

    for rule_def in rule_definitions:
        field_id = rule_def["field_id"]
        is_mandatory = rule_def["mandatory"]
        is_conditional = rule_def.get("conditional", False)

        # Skip non-mandatory, non-conditional fields
        if not is_mandatory:
            continue

        # Handle conditional fields
        if is_conditional:
            cond = rule_def.get("conditional_logic", {})

            # Expiry date: only required for perishable categories
            if field_id == "date_expiry" and cat_info:
                if not cat_info.get("requires_expiry", False):
                    continue

            # Country of origin: only required for imported goods
            if field_id == "country_of_origin":
                # Check if "importer" or "imported" keywords were found
                mfr = extraction.fields.get("manufacturer_info")
                if mfr and mfr.detected:
                    mfr_type = mfr.metadata.get("type", "")
                    if mfr_type != "importer":
                        # Not imported — skip country of origin check
                        continue
                else:
                    continue

            # USP: conditional, skip if not clear
            if field_id == "unit_sale_price":
                continue  # Treat as advisory for now

        # Check if field was detected
        ext_field = extraction.fields.get(field_id)
        if ext_field is None or not ext_field.detected:
            severity_str = rule_def.get("severity_if_missing", "MAJOR")
            severity = ViolationSeverity(severity_str)

            violations.append(Violation(
                rule_code=rule_def.get("rule_reference", "LMPC"),
                field_id=field_id,
                severity=severity,
                title=f"Missing: {rule_def['display_name']}",
                description=(
                    f"The mandatory field '{rule_def['display_name']}' was not "
                    f"detected on the label. {rule_def.get('description', '')}"
                ),
                recommendation=f"Add {rule_def['display_name']} to the product label.",
            ))

    return violations


def _check_mrp_format(extraction: ExtractionResult) -> list[Violation]:
    """Rule 2: Check MRP formatting — must include tax declaration."""
    violations: list[Violation] = []

    mrp = extraction.fields.get("mrp")
    tax = extraction.fields.get("tax_declaration")

    if mrp and mrp.detected:
        # Check for tax declaration
        if not tax or not tax.detected:
            violations.append(Violation(
                rule_code="Rule 6(1)(c) proviso",
                field_id="tax_declaration",
                severity=ViolationSeverity.MAJOR,
                title="Missing 'Inclusive of all taxes' declaration",
                description=(
                    "MRP is printed on the label but the mandatory phrase "
                    "'Inclusive of all taxes' (or equivalent) was not found. "
                    "Per LMPC Rules, MRP must explicitly state that it is "
                    "inclusive of all taxes."
                ),
                recommendation=(
                    "Add 'Inclusive of all taxes' or '(Incl. of all taxes)' "
                    "immediately after or below the MRP declaration."
                ),
            ))

    return violations


def _check_dual_pricing(extraction: ExtractionResult) -> list[Violation]:
    """Rule 3: Check for dual pricing and illegal sticker price alteration.

    Statutory basis: LMPC Rule 11(2)(c) & Legal Metrology Act 2009 Sec 36/37.
    """
    violations: list[Violation] = []

    mrp_matches = extraction.all_matches.get("mrp", [])

    if len(mrp_matches) > 1:
        # Extract unique numeric values
        prices = set()
        for match in mrp_matches:
            if match.numeric_value is not None:
                prices.add(match.numeric_value)

        if len(prices) > 1:
            prices_str = ", ".join(f"₹{p:.2f}" for p in sorted(prices))
            violations.append(Violation(
                rule_code="Rule 11(2)(c) & LM Act S.36",
                field_id="mrp",
                severity=ViolationSeverity.CRITICAL,
                title="Illegal Price Sticker Alteration / Dual Pricing",
                description=(
                    f"Multiple contradictory MRP declarations detected: {prices_str}. "
                    f"Altering, overwriting, or pasting price stickers over original packaging "
                    f"is strictly prohibited under Rule 11(2)(c) of LMPC Rules 2011 and Section 36 of LM Act 2009."
                ),
                recommendation="Ensure the original manufacturer MRP is unaltered without overlying stickers.",
            ))

    return violations


def _check_fssai_statutory_syntax(extraction: ExtractionResult, category: Optional[str] = None) -> list[Violation]:
    """Rule 8: Verify FSSAI 14-digit statutory license structure for Food products."""
    violations: list[Violation] = []
    
    # Only enforce for food category or if FSSAI is detected
    fssai_field = extraction.fields.get("fssai_license")
    if not fssai_field or not fssai_field.detected:
        if category and category.lower() == "food":
            violations.append(Violation(
                rule_code="FSSAI Sec 31",
                field_id="fssai_license",
                severity=ViolationSeverity.CRITICAL,
                title="Missing 14-Digit FSSAI License Number",
                description="Food packaging must prominently display the 14-digit FSSAI license number.",
                recommendation="Print the mandatory 14-digit FSSAI license number alongside the FSSAI logo.",
            ))
        return violations

    metadata = fssai_field.metadata or {}
    val = fssai_field.value or ""

    # Check if OCR repaired candidate requires manual confirmation
    if metadata.get("repaired") is True:
        violations.append(Violation(
            rule_code="FSSAI Sec 31",
            field_id="fssai_license",
            severity=ViolationSeverity.MINOR,
            title="FSSAI License Requires Physical Confirmation",
            description=(
                f"FSSAI license number was auto-repaired from smudged OCR candidate '{metadata.get('original_raw', val)}' "
                f"to statutory 14-digit syntax '{val}'. Physical label verification required."
            ),
            recommendation="Confirm the 14-digit FSSAI number against the physical product package.",
        ))

    return violations


def _check_metric_units(extraction: ExtractionResult) -> list[Violation]:
    """Rule 4: Check that net quantity uses standard metric/SI units."""
    violations: list[Violation] = []

    rules = load_rules()
    prohibited = rules.get("metric_unit_rules", {}).get("prohibited_units", [])

    nq = extraction.fields.get("net_quantity")
    if nq and nq.detected and nq.unit:
        raw_unit = nq.unit.lower().strip(".")
        if raw_unit in [u.lower() for u in prohibited]:
            violations.append(Violation(
                rule_code="Rule 5 / Legal Metrology Act 2009",
                field_id="net_quantity",
                severity=ViolationSeverity.MAJOR,
                title=f"Non-standard unit: '{nq.unit}'",
                description=(
                    f"The net quantity uses '{nq.unit}' which is not a standard "
                    f"metric/SI unit permitted under the Legal Metrology Act. "
                    f"Imperial or US customary units are prohibited as the sole "
                    f"quantity declaration."
                ),
                recommendation=(
                    "Use standard metric units: g, kg, ml, l, m, cm, or units/count."
                ),
            ))

    return violations


def _check_date_validity(extraction: ExtractionResult) -> list[Violation]:
    """Rule 5: Check date formatting and expiry validity."""
    violations: list[Violation] = []
    now = datetime.now(timezone.utc)

    # Check expiry date — if present, it must not be in the past
    exp = extraction.fields.get("date_expiry")
    if exp and exp.detected:
        normalized = exp.metadata.get("normalized_date") or exp.normalized_value
        if normalized and not exp.metadata.get("type") == "relative":
            try:
                # Parse normalized date (YYYY-MM or YYYY-MM-DD)
                parts = normalized.split("-")
                year = int(parts[0])
                month = int(parts[1]) if len(parts) > 1 else 12
                day = int(parts[2]) if len(parts) > 2 else calendar.monthrange(year, month)[1]

                exp_date = datetime(year, month, day, tzinfo=timezone.utc)

                if exp_date < now:
                    violations.append(Violation(
                        rule_code="Rule 6(1)(f)",
                        field_id="date_expiry",
                        severity=ViolationSeverity.CRITICAL,
                        title="Product Expired",
                        description=(
                            f"The product's expiry/best-before date ({exp.value}) "
                            f"is in the past. This product should not be sold."
                        ),
                        recommendation="Remove expired products from sale.",
                    ))
            except (ValueError, IndexError):
                # Could not parse date — flag as minor
                violations.append(Violation(
                    rule_code="Rule 6(1)(f)",
                    field_id="date_expiry",
                    severity=ViolationSeverity.MINOR,
                    title="Unreadable expiry date format",
                    description=(
                        f"The expiry date '{exp.value}' could not be parsed "
                        f"into a valid date. The format may be non-standard."
                    ),
                    recommendation=(
                        "Use a standard date format: MM/YYYY, DD/MM/YYYY, or Month YYYY."
                    ),
                ))

    # Check manufacture date — should not be in the future
    mfg = extraction.fields.get("date_manufacture")
    if mfg and mfg.detected:
        normalized = mfg.metadata.get("normalized_date") or mfg.normalized_value
        if normalized:
            try:
                parts = normalized.split("-")
                year = int(parts[0])
                month = int(parts[1]) if len(parts) > 1 else 1

                mfg_date = datetime(year, month, 1, tzinfo=timezone.utc)

                if mfg_date > now:
                    violations.append(Violation(
                        rule_code="Rule 6(1)(e)",
                        field_id="date_manufacture",
                        severity=ViolationSeverity.MAJOR,
                        title="Future manufacture date",
                        description=(
                            f"The manufacture date ({mfg.value}) appears to be "
                            f"in the future, which is likely an error."
                        ),
                        recommendation="Verify the manufacture date is correct.",
                    ))
            except (ValueError, IndexError):
                pass

    return violations


def _check_font_compliance(
    extraction: ExtractionResult,
    calibration: Optional[CalibrationData] = None,
    image_width_px: int = 2000,
    image_height_px: int = 1500,
) -> tuple[list[Violation], dict[str, dict]]:
    """Rule 6: Check font height compliance against Schedule II thresholds.

    Returns:
        Tuple of (violations_list, font_measurements_dict).
    """
    violations: list[Violation] = []
    font_results: dict[str, dict] = {}

    # Get net quantity for font threshold lookup
    nq = extraction.fields.get("net_quantity")
    if not nq or not nq.detected or nq.numeric_value is None:
        # Without net quantity, we cannot determine the font threshold
        return violations, font_results

    # Convert to grams/ml
    unit = nq.unit or "g"
    net_qty_grams = to_grams_or_ml(nq.numeric_value, unit)
    if net_qty_grams is None:
        net_qty_grams = nq.numeric_value  # Use raw value as fallback

    # Build calibration if not provided
    if calibration is None:
        calibration = calibrate_tier1(
            image_width_px=image_width_px,
            image_height_px=image_height_px,
            net_qty_grams=net_qty_grams,
        )

    # Collect font heights from extraction
    field_heights: dict[str, int] = {}
    for field_id, ext_field in extraction.fields.items():
        if ext_field.detected and ext_field.font_height_px and ext_field.font_height_px > 0:
            field_heights[field_id] = ext_field.font_height_px

    if not field_heights:
        return violations, font_results

    # Measure all fields
    measurements = measure_all_fields(
        field_heights=field_heights,
        calibration=calibration,
        net_qty_grams=net_qty_grams,
        is_printed=True,
    )

    # Convert to violations
    for field_id, measurement in measurements.items():
        font_results[field_id] = measurement.to_dict()

        if measurement.status == FontComplianceStatus.NON_COMPLIANT:
            field_def = get_field_by_id(field_id)
            display_name = field_def["display_name"] if field_def else field_id

            violations.append(Violation(
                rule_code="Rule 9 / Schedule II",
                field_id=field_id,
                severity=ViolationSeverity.MAJOR,
                title=f"Font size too small: {display_name}",
                description=(
                    f"The '{display_name}' text measures approximately "
                    f"{measurement.font_height_mm:.1f}mm, which is below the "
                    f"minimum required {measurement.min_required_mm:.1f}mm for "
                    f"a {net_qty_grams:.0f}g package. "
                    f"Measurement method: {measurement.measurement_method.value} "
                    f"(confidence: {measurement.confidence.value})."
                ),
                recommendation=(
                    f"Increase the font size of '{display_name}' to at least "
                    f"{measurement.min_required_mm:.1f}mm as per Schedule II."
                ),
            ))

        elif measurement.status == FontComplianceStatus.BORDERLINE:
            field_def = get_field_by_id(field_id)
            display_name = field_def["display_name"] if field_def else field_id

            violations.append(Violation(
                rule_code="Rule 9 / Schedule II",
                field_id=field_id,
                severity=ViolationSeverity.MINOR,
                title=f"Font size borderline: {display_name}",
                description=(
                    f"The '{display_name}' text measures approximately "
                    f"{measurement.font_height_mm:.1f}mm, which is within the "
                    f"±{measurement.tolerance_percent:.0f}% tolerance band of the "
                    f"minimum {measurement.min_required_mm:.1f}mm. This is flagged "
                    f"as borderline rather than a definitive violation due to "
                    f"measurement uncertainty "
                    f"({measurement.measurement_method.value} method, "
                    f"{measurement.confidence.value} confidence)."
                ),
                recommendation=(
                    f"Consider increasing the font size of '{display_name}' to "
                    f"clearly meet the {measurement.min_required_mm:.1f}mm minimum."
                ),
            ))

    return violations, font_results


def _check_low_confidence_fields(
    extraction: ExtractionResult,
    threshold: float = 0.6,
) -> list[str]:
    """Identify fields with confidence below the review threshold.

    These don't generate violations but affect the verdict — if any
    detected field has confidence < threshold, the overall verdict
    becomes REQUIRES_MANUAL_REVIEW instead of COMPLIANT.
    """
    low_conf_fields: list[str] = []

    for field_id, ext_field in extraction.fields.items():
        if ext_field.detected and ext_field.confidence < threshold:
            low_conf_fields.append(field_id)

    return low_conf_fields


# ---------- Scoring ----------

def _calculate_compliance_score(
    violations: list[Violation],
    total_fields: int,
    detected_fields: int,
) -> float:
    """Calculate a balanced 0–100 compliance score.

    Weighted Scoring Model:
    - Field Coverage (40 pts): (detected / total) * 40
    - Statutory Rules Compliance (60 pts):
      - CRITICAL violation: -25 pts
      - MAJOR violation: -12 pts
      - MINOR violation: -4 pts
    """
    total = max(1, total_fields)
    coverage = min(1.0, max(0.0, detected_fields / total))
    coverage_score = coverage * 40.0

    rule_score = 60.0
    for v in violations:
        if v.severity == ViolationSeverity.CRITICAL:
            rule_score -= 25.0
        elif v.severity == ViolationSeverity.MAJOR:
            rule_score -= 12.0
        elif v.severity == ViolationSeverity.MINOR:
            rule_score -= 4.0

    rule_score = max(0.0, rule_score)
    total_score = coverage_score + rule_score
    return round(max(0.0, min(100.0, total_score)), 1)


def _determine_verdict(
    violations: list[Violation],
    low_confidence_fields: list[str],
) -> Verdict:
    """Determine the overall compliance verdict.

    Logic:
    - Any CRITICAL violation → NON_COMPLIANT
    - 3+ MAJOR violations → NON_COMPLIANT (escalation)
    - No CRITICAL but any MAJOR → REQUIRES_MANUAL_REVIEW
    - Any field with confidence < 0.6 → REQUIRES_MANUAL_REVIEW
    - Otherwise → COMPLIANT
    """
    critical = sum(1 for v in violations if v.severity == ViolationSeverity.CRITICAL)
    major = sum(1 for v in violations if v.severity == ViolationSeverity.MAJOR)

    if critical > 0 or major >= 3:
        return Verdict.NON_COMPLIANT

    if major > 0 or len(low_confidence_fields) > 0:
        return Verdict.REQUIRES_MANUAL_REVIEW

    return Verdict.COMPLIANT


# ---------- Main Entry Point ----------

def evaluate_compliance(
    extraction: ExtractionResult,
    category: Optional[str] = None,
    calibration: Optional[CalibrationData] = None,
    image_width_px: int = 2000,
    image_height_px: int = 1500,
) -> ComplianceReport:
    """Run the full LMPC rule engine and produce a compliance report.

    This is the main entry point for Phase 4. It takes the output
    of Phase 2 (field extraction) and Phase 3 (font calibration),
    evaluates all six statutory rules, and returns a comprehensive
    compliance report.

    Args:
        extraction: Output from field_extractor.extract_fields().
        category: Commodity category ID (e.g., "food", "cosmetics").
        calibration: Pre-computed calibration data. If None, Tier 1
                     calibration is computed automatically.
        image_width_px: Image width for auto-calibration.
        image_height_px: Image height for auto-calibration.

    Returns:
        ComplianceReport with verdict, score, and itemized violations.
    """
    all_violations: list[Violation] = []

    # --- Rule 1: Mandatory field presence ---
    all_violations.extend(
        _check_mandatory_presence(extraction, category=category)
    )

    # --- Rule 2: MRP format (tax declaration) ---
    all_violations.extend(
        _check_mrp_format(extraction)
    )

    # --- Rule 3: Dual pricing ---
    all_violations.extend(
        _check_dual_pricing(extraction)
    )

    # --- Rule 4: Metric unit validation ---
    all_violations.extend(
        _check_metric_units(extraction)
    )

    # --- Rule 5: Date validity ---
    all_violations.extend(
        _check_date_validity(extraction)
    )

    # --- Rule 6: Font size compliance ---
    font_violations, font_measurements = _check_font_compliance(
        extraction,
        calibration=calibration,
        image_width_px=image_width_px,
        image_height_px=image_height_px,
    )
    all_violations.extend(font_violations)

    # --- Rule 8: Statutory FSSAI license syntax ---
    all_violations.extend(
        _check_fssai_statutory_syntax(extraction, category=category)
    )

    # --- Low confidence check ---
    low_conf = _check_low_confidence_fields(extraction)

    # --- Scoring ---
    score = _calculate_compliance_score(
        all_violations,
        total_fields=extraction.total_fields_expected,
        detected_fields=extraction.total_fields_detected,
    )

    # --- Verdict ---
    verdict = _determine_verdict(all_violations, low_conf)

    # --- Severity counts ---
    critical = sum(1 for v in all_violations if v.severity == ViolationSeverity.CRITICAL)
    major = sum(1 for v in all_violations if v.severity == ViolationSeverity.MAJOR)
    minor = sum(1 for v in all_violations if v.severity == ViolationSeverity.MINOR)

    # --- Field statuses ---
    field_statuses: dict[str, dict] = {}
    for field_id, ext_field in extraction.fields.items():
        field_violations = [v for v in all_violations if v.field_id == field_id]
        field_statuses[field_id] = {
            "detected": ext_field.detected,
            "value": ext_field.value,
            "confidence": round(ext_field.confidence, 2),
            "compliant": len(field_violations) == 0,
            "issues": [v.title for v in field_violations],
        }

    return ComplianceReport(
        verdict=verdict,
        compliance_score=score,
        total_violations=len(all_violations),
        critical_count=critical,
        major_count=major,
        minor_count=minor,
        violations=all_violations,
        field_statuses=field_statuses,
        font_measurements=font_measurements,
        metadata={
            "category": category,
            "low_confidence_fields": low_conf,
            "detection_rate": round(extraction.detection_rate, 2),
            "calibration_method": calibration.method.value if calibration else "auto_tier1",
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        },
    )


def evaluate_statutory_field_visit_trigger(violations: list) -> dict:
    """Computes statutory severity triage, visit mandate, and waiver permissions.
    
    Guardrails:
    - CRITICAL: Mandatory on-site visit. CANNOT BE WAIVED by any authority (including CLMO).
    - MAJOR: Field visit recommended. CLMO can waive ONLY with written justification >= 20 chars.
    - MINOR: Field visit is forbidden (Use Digital Correction Loop instead).
    """
    has_critical = False
    has_major = False
    has_minor = False

    critical_reasons = []
    major_reasons = []

    for v in violations:
        sev = getattr(v, "severity", None)
        if isinstance(sev, Enum):
            sev = sev.value
        elif isinstance(v, dict):
            sev = v.get("severity")
        
        sev_str = str(sev).upper() if sev else "MINOR"
        title = getattr(v, "title", None) or (v.get("title") if isinstance(v, dict) else "")
        code = getattr(v, "rule_code", None) or (v.get("rule_code") if isinstance(v, dict) else "")

        if sev_str == "CRITICAL":
            has_critical = True
            critical_reasons.append(f"{code}: {title}" if code else title)
        elif sev_str == "MAJOR":
            has_major = True
            major_reasons.append(f"{code}: {title}" if code else title)
        elif sev_str == "MINOR":
            has_minor = True

    if has_critical:
        return {
            "triage_severity": "CRITICAL",
            "visit_required": True,
            "can_waive_visit": False,
            "can_digital_approve": False,
            "visit_trigger_reason": " | ".join(critical_reasons) or "Statutory Critical Breach",
            "waiver_prohibition_reason": (
                "Field visit CANNOT be waived for CRITICAL violations (Rule 11(2)(c), "
                "price alteration/sticker tampering, forged/falsified license numbers). "
                "Physical on-site evidence is statutorily required under the Indian Evidence Act."
            ),
        }
    elif has_major:
        return {
            "triage_severity": "MAJOR",
            "visit_required": True,
            "can_waive_visit": True,
            "can_digital_approve": False,
            "visit_trigger_reason": " | ".join(major_reasons) or "Schedule II / Statutory Mandatory Deficiencies",
            "waiver_prohibition_reason": None,
        }
    elif has_minor:
        return {
            "triage_severity": "MINOR",
            "visit_required": False,
            "can_waive_visit": True,
            "can_digital_approve": True,
            "visit_trigger_reason": None,
            "waiver_prohibition_reason": "Field visit not warranted for MINOR deficiencies. Use Digital Correction Loop instead.",
        }
    else:
        return {
            "triage_severity": "NONE",
            "visit_required": False,
            "can_waive_visit": True,
            "can_digital_approve": True,
            "visit_trigger_reason": None,
            "waiver_prohibition_reason": None,
        }
