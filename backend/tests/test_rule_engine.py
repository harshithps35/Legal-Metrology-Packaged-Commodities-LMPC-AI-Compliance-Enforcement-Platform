"""
Tests for the LMPC Rule Engine.

Tests cover:
- Individual rule checks (Rules 1–6)
- Scoring logic
- Verdict determination
- Full evaluate_compliance pipeline with mock data
- Edge cases: empty extraction, all-pass, all-fail
"""

import pytest
from datetime import datetime, timezone

from app.engine.rule_engine import (
    ComplianceReport,
    Verdict,
    Violation,
    ViolationSeverity,
    _calculate_compliance_score,
    _check_date_validity,
    _check_dual_pricing,
    _check_low_confidence_fields,
    _check_mandatory_presence,
    _check_metric_units,
    _check_mrp_format,
    _determine_verdict,
    evaluate_compliance,
)
from app.engine.font_measurer import CalibrationData, MeasurementMethod, MeasurementConfidence
from app.nlp.field_extractor import ExtractedField, ExtractionResult
from app.nlp.regex_matchers import FieldMatch


# ---------- Helpers ----------

def _make_field(field_id: str, detected: bool, value: str = "", confidence: float = 0.9,
                numeric_value=None, unit=None, metadata=None, font_height_px=None) -> ExtractedField:
    return ExtractedField(
        field_id=field_id,
        display_name=field_id.replace("_", " ").title(),
        detected=detected,
        value=value if detected else None,
        confidence=confidence if detected else 0.0,
        numeric_value=numeric_value,
        unit=unit,
        source="regex",
        metadata=metadata or {},
        font_height_px=font_height_px,
    )


def _make_extraction(fields: dict[str, ExtractedField],
                     all_matches: dict = None) -> ExtractionResult:
    detected = sum(1 for f in fields.values() if f.detected)
    return ExtractionResult(
        fields=fields,
        all_matches=all_matches or {},
        raw_text="mock text",
        total_fields_detected=detected,
        total_fields_expected=7,
        detection_rate=detected / 7,
    )


def _make_compliant_fields() -> dict[str, ExtractedField]:
    """Create a full set of detected fields simulating a compliant label."""
    return {
        "commodity_name": _make_field("commodity_name", True, "Glucose Biscuits"),
        "net_quantity": _make_field("net_quantity", True, "200g", numeric_value=200, unit="g",
                                   metadata={"grams_equivalent": 200}),
        "mrp": _make_field("mrp", True, "₹30.00", numeric_value=30.0),
        "tax_declaration": _make_field("tax_declaration", True, "Incl. of all taxes"),
        "manufacturer_info": _make_field("manufacturer_info", True, "Parle Products Pvt. Ltd."),
        "date_manufacture": _make_field("date_manufacture", True, "06/2026",
                                        metadata={"normalized_date": "2026-06"}),
        "date_expiry": _make_field("date_expiry", True, "Best Before 9 months from Mfg",
                                   metadata={"type": "relative", "duration": 9}),
        "consumer_care": _make_field("consumer_care", True, "1800-123-4567"),
        "country_of_origin": _make_field("country_of_origin", False),
        "unit_sale_price": _make_field("unit_sale_price", False),
        "batch_lot_number": _make_field("batch_lot_number", True, "A2606K12"),
        "fssai_license": _make_field("fssai_license", True, "10012345678901"),
    }


# ============================================================
# Rule 1: Mandatory Presence
# ============================================================

class TestMandatoryPresence:

    def test_all_present_no_violations(self):
        fields = _make_compliant_fields()
        extraction = _make_extraction(fields)
        violations = _check_mandatory_presence(extraction)
        core_missing = [v for v in violations if v.field_id in
                        ["commodity_name", "net_quantity", "mrp", "manufacturer_info",
                         "date_manufacture", "consumer_care"]]
        assert len(core_missing) == 0

    def test_missing_mrp_is_critical(self):
        fields = _make_compliant_fields()
        fields["mrp"] = _make_field("mrp", False)
        extraction = _make_extraction(fields)
        violations = _check_mandatory_presence(extraction)
        mrp_violations = [v for v in violations if v.field_id == "mrp"]
        assert len(mrp_violations) == 1
        assert mrp_violations[0].severity == ViolationSeverity.CRITICAL

    def test_missing_consumer_care_is_critical(self):
        fields = _make_compliant_fields()
        fields["consumer_care"] = _make_field("consumer_care", False)
        extraction = _make_extraction(fields)
        violations = _check_mandatory_presence(extraction)
        cc_violations = [v for v in violations if v.field_id == "consumer_care"]
        assert len(cc_violations) == 1
        assert cc_violations[0].severity == ViolationSeverity.CRITICAL

    def test_missing_manufacturer_is_critical(self):
        fields = _make_compliant_fields()
        fields["manufacturer_info"] = _make_field("manufacturer_info", False)
        extraction = _make_extraction(fields)
        violations = _check_mandatory_presence(extraction)
        mfr_violations = [v for v in violations if v.field_id == "manufacturer_info"]
        assert len(mfr_violations) == 1
        assert mfr_violations[0].severity == ViolationSeverity.CRITICAL

    def test_expiry_not_required_for_electronics(self):
        fields = _make_compliant_fields()
        fields["date_expiry"] = _make_field("date_expiry", False)
        extraction = _make_extraction(fields)
        violations = _check_mandatory_presence(extraction, category="electronics")
        exp_violations = [v for v in violations if v.field_id == "date_expiry"]
        assert len(exp_violations) == 0

    def test_expiry_required_for_food(self):
        fields = _make_compliant_fields()
        fields["date_expiry"] = _make_field("date_expiry", False)
        extraction = _make_extraction(fields)
        violations = _check_mandatory_presence(extraction, category="food")
        exp_violations = [v for v in violations if v.field_id == "date_expiry"]
        assert len(exp_violations) == 1


# ============================================================
# Rule 2: MRP Format
# ============================================================

class TestMRPFormat:

    def test_mrp_with_tax_no_violation(self):
        fields = _make_compliant_fields()
        extraction = _make_extraction(fields)
        violations = _check_mrp_format(extraction)
        assert len(violations) == 0

    def test_mrp_without_tax_violation(self):
        fields = _make_compliant_fields()
        fields["tax_declaration"] = _make_field("tax_declaration", False)
        extraction = _make_extraction(fields)
        violations = _check_mrp_format(extraction)
        assert len(violations) == 1
        assert violations[0].severity == ViolationSeverity.MAJOR

    def test_no_mrp_no_violation(self):
        fields = _make_compliant_fields()
        fields["mrp"] = _make_field("mrp", False)
        extraction = _make_extraction(fields)
        violations = _check_mrp_format(extraction)
        assert len(violations) == 0  # No MRP → no tax check


# ============================================================
# Rule 3: Dual Pricing
# ============================================================

class TestDualPricing:

    def test_single_price_no_violation(self):
        fields = _make_compliant_fields()
        matches = {"mrp": [FieldMatch("mrp", "MRP ₹30", "₹30", numeric_value=30.0, confidence=0.95)]}
        extraction = _make_extraction(fields, all_matches=matches)
        violations = _check_dual_pricing(extraction)
        assert len(violations) == 0

    def test_dual_prices_critical(self):
        fields = _make_compliant_fields()
        matches = {"mrp": [
            FieldMatch("mrp", "MRP ₹30", "₹30", numeric_value=30.0, confidence=0.95),
            FieldMatch("mrp", "₹45", "₹45", numeric_value=45.0, confidence=0.60),
        ]}
        extraction = _make_extraction(fields, all_matches=matches)
        violations = _check_dual_pricing(extraction)
        assert len(violations) == 1
        assert violations[0].severity == ViolationSeverity.CRITICAL

    def test_same_price_twice_no_violation(self):
        fields = _make_compliant_fields()
        matches = {"mrp": [
            FieldMatch("mrp", "MRP ₹30", "₹30", numeric_value=30.0, confidence=0.95),
            FieldMatch("mrp", "₹30.00", "₹30", numeric_value=30.0, confidence=0.60),
        ]}
        extraction = _make_extraction(fields, all_matches=matches)
        violations = _check_dual_pricing(extraction)
        assert len(violations) == 0


# ============================================================
# Rule 4: Metric Units
# ============================================================

class TestMetricUnits:

    def test_standard_unit_no_violation(self):
        fields = _make_compliant_fields()
        extraction = _make_extraction(fields)
        violations = _check_metric_units(extraction)
        assert len(violations) == 0

    def test_imperial_unit_violation(self):
        fields = _make_compliant_fields()
        fields["net_quantity"] = _make_field("net_quantity", True, "8 oz", unit="oz", numeric_value=8)
        extraction = _make_extraction(fields)
        violations = _check_metric_units(extraction)
        assert len(violations) == 1
        assert violations[0].severity == ViolationSeverity.MAJOR


# ============================================================
# Rule 5: Date Validity
# ============================================================

class TestDateValidity:

    def test_future_expiry_no_violation(self):
        fields = _make_compliant_fields()
        fields["date_expiry"] = _make_field("date_expiry", True, "Dec 2030",
                                            metadata={"normalized_date": "2030-12"})
        extraction = _make_extraction(fields)
        violations = _check_date_validity(extraction)
        exp_violations = [v for v in violations if v.field_id == "date_expiry"]
        assert len(exp_violations) == 0

    def test_past_expiry_critical(self):
        fields = _make_compliant_fields()
        fields["date_expiry"] = _make_field("date_expiry", True, "Jan 2020",
                                            metadata={"normalized_date": "2020-01"})
        extraction = _make_extraction(fields)
        violations = _check_date_validity(extraction)
        exp_violations = [v for v in violations if v.field_id == "date_expiry"]
        assert len(exp_violations) == 1
        assert exp_violations[0].severity == ViolationSeverity.CRITICAL
        assert "Expired" in exp_violations[0].title

    def test_relative_expiry_no_parse(self):
        """Relative expiry dates should not trigger expiry check."""
        fields = _make_compliant_fields()
        fields["date_expiry"] = _make_field("date_expiry", True, "Best Before 9 months from Mfg",
                                            metadata={"type": "relative", "duration": 9})
        extraction = _make_extraction(fields)
        violations = _check_date_validity(extraction)
        exp_violations = [v for v in violations if v.field_id == "date_expiry"]
        assert len(exp_violations) == 0


# ============================================================
# Scoring
# ============================================================

class TestScoring:

    def test_perfect_score(self):
        score = _calculate_compliance_score([], total_fields=7, detected_fields=7)
        assert score == 100.0

    def test_critical_penalty(self):
        violations = [Violation("R1", "mrp", ViolationSeverity.CRITICAL, "Missing MRP", "")]
        score = _calculate_compliance_score(violations, 7, 6)
        assert score == 80.0

    def test_major_penalty(self):
        violations = [Violation("R2", "tax", ViolationSeverity.MAJOR, "Missing tax", "")]
        score = _calculate_compliance_score(violations, 7, 7)
        assert score == 92.0  # 100 - 10 + 2 (coverage bonus)

    def test_multiple_violations(self):
        violations = [
            Violation("R1", "mrp", ViolationSeverity.CRITICAL, "Missing MRP", ""),
            Violation("R2", "tax", ViolationSeverity.MAJOR, "Missing tax", ""),
            Violation("R3", "batch", ViolationSeverity.MINOR, "Missing batch", ""),
        ]
        score = _calculate_compliance_score(violations, 7, 5)
        assert score < 70.0

    def test_score_floors_at_zero(self):
        violations = [
            Violation("R1", "f1", ViolationSeverity.CRITICAL, "", ""),
            Violation("R1", "f2", ViolationSeverity.CRITICAL, "", ""),
            Violation("R1", "f3", ViolationSeverity.CRITICAL, "", ""),
            Violation("R1", "f4", ViolationSeverity.CRITICAL, "", ""),
            Violation("R1", "f5", ViolationSeverity.CRITICAL, "", ""),
            Violation("R1", "f6", ViolationSeverity.CRITICAL, "", ""),
        ]
        score = _calculate_compliance_score(violations, 7, 1)
        assert score == 0.0

    def test_low_coverage_penalty(self):
        score_good = _calculate_compliance_score([], 7, 7)
        score_bad = _calculate_compliance_score([], 7, 3)
        assert score_good > score_bad


# ============================================================
# Verdict Determination
# ============================================================

class TestVerdict:

    def test_no_violations_compliant(self):
        verdict = _determine_verdict([], [])
        assert verdict == Verdict.COMPLIANT

    def test_critical_non_compliant(self):
        violations = [Violation("R1", "mrp", ViolationSeverity.CRITICAL, "", "")]
        verdict = _determine_verdict(violations, [])
        assert verdict == Verdict.NON_COMPLIANT

    def test_major_requires_review(self):
        violations = [Violation("R2", "tax", ViolationSeverity.MAJOR, "", "")]
        verdict = _determine_verdict(violations, [])
        assert verdict == Verdict.REQUIRES_MANUAL_REVIEW

    def test_minor_only_compliant(self):
        violations = [Violation("R3", "batch", ViolationSeverity.MINOR, "", "")]
        verdict = _determine_verdict(violations, [])
        assert verdict == Verdict.COMPLIANT

    def test_low_confidence_requires_review(self):
        verdict = _determine_verdict([], ["commodity_name"])
        assert verdict == Verdict.REQUIRES_MANUAL_REVIEW

    def test_critical_overrides_low_confidence(self):
        violations = [Violation("R1", "mrp", ViolationSeverity.CRITICAL, "", "")]
        verdict = _determine_verdict(violations, ["commodity_name"])
        assert verdict == Verdict.NON_COMPLIANT


# ============================================================
# Low Confidence Detection
# ============================================================

class TestLowConfidence:

    def test_all_high_confidence(self):
        fields = _make_compliant_fields()
        extraction = _make_extraction(fields)
        low = _check_low_confidence_fields(extraction)
        assert len(low) == 0

    def test_low_confidence_flagged(self):
        fields = _make_compliant_fields()
        fields["commodity_name"] = _make_field("commodity_name", True, "Biscuits", confidence=0.35)
        extraction = _make_extraction(fields)
        low = _check_low_confidence_fields(extraction)
        assert "commodity_name" in low


# ============================================================
# Full Pipeline
# ============================================================

class TestEvaluateCompliance:

    def test_compliant_label(self):
        fields = _make_compliant_fields()
        extraction = _make_extraction(fields)
        report = evaluate_compliance(extraction, category="food")

        assert isinstance(report, ComplianceReport)
        assert report.compliance_score > 80
        assert report.verdict in (Verdict.COMPLIANT, Verdict.REQUIRES_MANUAL_REVIEW)

    def test_non_compliant_missing_critical_fields(self):
        fields = _make_compliant_fields()
        fields["mrp"] = _make_field("mrp", False)
        fields["manufacturer_info"] = _make_field("manufacturer_info", False)
        fields["consumer_care"] = _make_field("consumer_care", False)
        extraction = _make_extraction(fields)
        report = evaluate_compliance(extraction)

        assert report.verdict == Verdict.NON_COMPLIANT
        assert report.critical_count >= 3
        assert report.compliance_score < 50

    def test_report_to_dict(self):
        fields = _make_compliant_fields()
        extraction = _make_extraction(fields)
        report = evaluate_compliance(extraction)
        d = report.to_dict()

        assert "verdict" in d
        assert "compliance_score" in d
        assert "violation_summary" in d
        assert "violations" in d
        assert "field_statuses" in d

    def test_expired_product_non_compliant(self):
        fields = _make_compliant_fields()
        fields["date_expiry"] = _make_field("date_expiry", True, "Jan 2020",
                                            metadata={"normalized_date": "2020-01"})
        extraction = _make_extraction(fields)
        report = evaluate_compliance(extraction)

        assert report.verdict == Verdict.NON_COMPLIANT
        expired_violations = [v for v in report.violations if "Expired" in v.title]
        assert len(expired_violations) == 1

    def test_empty_extraction(self):
        """Edge case: no fields detected at all."""
        fields = {
            fid: _make_field(fid, False)
            for fid in ["commodity_name", "net_quantity", "mrp", "tax_declaration",
                        "manufacturer_info", "date_manufacture", "date_expiry",
                        "consumer_care", "country_of_origin", "unit_sale_price",
                        "batch_lot_number", "fssai_license"]
        }
        extraction = _make_extraction(fields)
        report = evaluate_compliance(extraction)

        assert report.verdict == Verdict.NON_COMPLIANT
        assert report.compliance_score < 20
        assert report.total_violations > 0

    def test_dual_pricing_in_full_pipeline(self):
        fields = _make_compliant_fields()
        matches = {"mrp": [
            FieldMatch("mrp", "MRP ₹30", "₹30", numeric_value=30.0, confidence=0.95),
            FieldMatch("mrp", "₹45", "₹45", numeric_value=45.0, confidence=0.60),
        ]}
        extraction = _make_extraction(fields, all_matches=matches)
        report = evaluate_compliance(extraction)

        dual_violations = [v for v in report.violations if "Dual" in v.title]
        assert len(dual_violations) == 1
        assert report.verdict == Verdict.NON_COMPLIANT

    def test_with_calibration_data(self):
        """Test passing explicit calibration to skip auto-Tier1."""
        fields = _make_compliant_fields()
        fields["mrp"] = _make_field("mrp", True, "₹30", numeric_value=30.0, font_height_px=20)
        fields["net_quantity"] = _make_field("net_quantity", True, "200g", numeric_value=200,
                                            unit="g", font_height_px=18,
                                            metadata={"grams_equivalent": 200})
        extraction = _make_extraction(fields)

        cal = CalibrationData(
            px_per_mm=10.0,
            method=MeasurementMethod.CALIBRATED,
            confidence=MeasurementConfidence.HIGH,
        )
        report = evaluate_compliance(extraction, calibration=cal)

        assert isinstance(report, ComplianceReport)
        assert "calibration_method" in report.metadata
