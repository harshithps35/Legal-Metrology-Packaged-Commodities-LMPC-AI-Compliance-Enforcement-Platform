"""
Tests for the Font Size Measurement & Compliance Check module.

Tests cover:
- Package dimension estimation from net quantity
- Tier 1 (relative ratio) calibration
- Tier 2 (reference object) calibration
- Pixel-to-mm conversion
- Three-way compliance classification (compliant / borderline / non_compliant)
- Single field and batch measurement
- Edge cases and error handling
"""

import pytest
from app.engine.font_measurer import (
    CalibrationData,
    FontComplianceStatus,
    FontMeasurement,
    MeasurementConfidence,
    MeasurementMethod,
    calibrate_tier1,
    calibrate_tier2,
    calibrate_tier2_custom,
    check_font_compliance,
    estimate_package_dimensions,
    get_available_reference_objects,
    measure_all_fields,
    measure_field_font,
    px_to_mm,
)


# ============================================================
# Package Dimension Estimation
# ============================================================

class TestPackageDimensionEstimation:

    def test_small_sachet(self):
        dims = estimate_package_dimensions(10)
        assert dims["width_mm"] == 60
        assert dims["height_mm"] == 80

    def test_100g_packet(self):
        dims = estimate_package_dimensions(100)
        assert dims["width_mm"] == 100
        assert dims["height_mm"] == 140

    def test_200g_packet(self):
        dims = estimate_package_dimensions(200)
        assert dims["width_mm"] == 160
        assert dims["height_mm"] == 220

    def test_1kg_packet(self):
        dims = estimate_package_dimensions(1000)
        assert dims["width_mm"] == 250
        assert dims["height_mm"] == 350

    def test_very_large(self):
        dims = estimate_package_dimensions(10000)
        assert dims["width_mm"] == 300  # Falls through to last entry

    def test_zero_grams(self):
        dims = estimate_package_dimensions(0)
        assert dims["width_mm"] > 0


# ============================================================
# Tier 1 Calibration
# ============================================================

class TestTier1Calibration:

    def test_basic_calibration(self):
        cal = calibrate_tier1(
            image_width_px=2000,
            image_height_px=1500,
            net_qty_grams=200,
        )
        assert cal.method == MeasurementMethod.RELATIVE
        assert cal.px_per_mm > 0
        assert cal.confidence in (MeasurementConfidence.MEDIUM, MeasurementConfidence.LOW)

    def test_with_package_bbox(self):
        cal = calibrate_tier1(
            image_width_px=2000,
            image_height_px=1500,
            net_qty_grams=200,
            package_bbox={"x": 100, "y": 100, "w": 1600, "h": 1200},
        )
        assert cal.px_per_mm > 0

    def test_different_quantities_give_different_scales(self):
        cal_small = calibrate_tier1(2000, 1500, net_qty_grams=50)
        cal_large = calibrate_tier1(2000, 1500, net_qty_grams=1000)

        # Larger package → smaller px_per_mm (more mm per pixel)
        assert cal_large.px_per_mm < cal_small.px_per_mm

    def test_source_description(self):
        cal = calibrate_tier1(2000, 1500, net_qty_grams=500)
        assert "500" in cal.source
        assert "mm" in cal.source


# ============================================================
# Tier 2 Calibration
# ============================================================

class TestTier2Calibration:

    def test_credit_card_calibration(self):
        # Credit card width: 85.6mm, say it measures 856 pixels
        cal = calibrate_tier2("credit_card", 856.0, "width")
        assert cal.method == MeasurementMethod.CALIBRATED
        assert cal.confidence == MeasurementConfidence.HIGH
        assert abs(cal.px_per_mm - 10.0) < 0.1  # ~10 px/mm

    def test_coin_calibration(self):
        # ₹1 coin diameter: 25mm, say it measures 250 pixels
        cal = calibrate_tier2("1_rupee_coin", 250.0, "diameter")
        assert abs(cal.px_per_mm - 10.0) < 0.1

    def test_unknown_reference_raises(self):
        with pytest.raises(ValueError, match="Unknown reference object"):
            calibrate_tier2("nonexistent_object", 100.0)

    def test_custom_calibration(self):
        cal = calibrate_tier2_custom(
            known_dimension_mm=30.0,
            measured_dimension_px=300.0,
        )
        assert abs(cal.px_per_mm - 10.0) < 0.01
        assert cal.confidence == MeasurementConfidence.HIGH

    def test_custom_calibration_invalid_input(self):
        with pytest.raises(ValueError):
            calibrate_tier2_custom(0, 100)

        with pytest.raises(ValueError):
            calibrate_tier2_custom(30, -10)


# ============================================================
# Pixel to MM Conversion
# ============================================================

class TestPxToMm:

    def test_basic_conversion(self):
        cal = CalibrationData(px_per_mm=10.0, method=MeasurementMethod.CALIBRATED,
                              confidence=MeasurementConfidence.HIGH)
        assert px_to_mm(20, cal) == 2.0
        assert px_to_mm(40, cal) == 4.0

    def test_zero_px_per_mm(self):
        cal = CalibrationData(px_per_mm=0.0, method=MeasurementMethod.RELATIVE,
                              confidence=MeasurementConfidence.LOW)
        assert px_to_mm(20, cal) == 0.0

    def test_fractional_result(self):
        cal = CalibrationData(px_per_mm=8.0, method=MeasurementMethod.CALIBRATED,
                              confidence=MeasurementConfidence.HIGH)
        result = px_to_mm(12, cal)
        assert abs(result - 1.5) < 0.01


# ============================================================
# Compliance Check
# ============================================================

class TestFontCompliance:

    def test_compliant(self):
        """Font height meets or exceeds the minimum."""
        status = check_font_compliance(font_height_mm=3.0, min_required_mm=2.0)
        assert status == FontComplianceStatus.COMPLIANT

    def test_exactly_at_minimum(self):
        """Font height exactly at minimum is compliant."""
        status = check_font_compliance(font_height_mm=2.0, min_required_mm=2.0)
        assert status == FontComplianceStatus.COMPLIANT

    def test_borderline(self):
        """Font height within tolerance band below minimum."""
        # 10% tolerance of 2.0mm = 0.2mm, so borderline range is 1.8-2.0mm
        status = check_font_compliance(font_height_mm=1.85, min_required_mm=2.0, tolerance_percent=10.0)
        assert status == FontComplianceStatus.BORDERLINE

    def test_non_compliant(self):
        """Font height well below minimum."""
        status = check_font_compliance(font_height_mm=1.0, min_required_mm=2.0)
        assert status == FontComplianceStatus.NON_COMPLIANT

    def test_just_outside_tolerance(self):
        """Font height just below the tolerance band."""
        # Tolerance of 10% on 4.0mm = 0.4mm, lower bound = 3.6mm
        status = check_font_compliance(font_height_mm=3.5, min_required_mm=4.0, tolerance_percent=10.0)
        assert status == FontComplianceStatus.NON_COMPLIANT

    def test_zero_minimum(self):
        """Zero minimum should return UNKNOWN."""
        status = check_font_compliance(font_height_mm=2.0, min_required_mm=0.0)
        assert status == FontComplianceStatus.UNKNOWN

    def test_generous_tolerance(self):
        """Wide tolerance should classify more as borderline."""
        status = check_font_compliance(font_height_mm=1.5, min_required_mm=2.0, tolerance_percent=30.0)
        assert status == FontComplianceStatus.BORDERLINE

    def test_zero_tolerance(self):
        """No tolerance band — must meet exact minimum."""
        status = check_font_compliance(font_height_mm=1.99, min_required_mm=2.0, tolerance_percent=0.0)
        assert status == FontComplianceStatus.NON_COMPLIANT


# ============================================================
# Single Field Measurement
# ============================================================

class TestMeasureFieldFont:

    def _make_calibration(self, px_per_mm: float = 10.0) -> CalibrationData:
        return CalibrationData(
            px_per_mm=px_per_mm,
            method=MeasurementMethod.CALIBRATED,
            confidence=MeasurementConfidence.HIGH,
        )

    def test_compliant_small_package(self):
        """30g package, printed, min = 1.5mm. Font at 2mm (20px @ 10px/mm)."""
        result = measure_field_font(
            field_id="mrp",
            font_height_px=20,
            calibration=self._make_calibration(10.0),
            net_qty_grams=30,
            is_printed=True,
        )
        assert result.font_height_mm == 2.0
        assert result.min_required_mm == 1.5
        assert result.status == FontComplianceStatus.COMPLIANT

    def test_non_compliant_medium_package(self):
        """500g package, printed, min = 4.0mm. Font at 2mm (20px @ 10px/mm)."""
        result = measure_field_font(
            field_id="net_quantity",
            font_height_px=20,
            calibration=self._make_calibration(10.0),
            net_qty_grams=500,
            is_printed=True,
        )
        assert result.font_height_mm == 2.0
        assert result.min_required_mm == 4.0
        assert result.status == FontComplianceStatus.NON_COMPLIANT

    def test_blown_moulded_lower_threshold(self):
        """30g package, blown/moulded, min = 1.0mm (lower than printed)."""
        result = measure_field_font(
            field_id="mrp",
            font_height_px=12,
            calibration=self._make_calibration(10.0),
            net_qty_grams=30,
            is_printed=False,
        )
        assert result.min_required_mm == 1.0
        assert result.font_height_mm == 1.2
        assert result.status == FontComplianceStatus.COMPLIANT

    def test_result_to_dict(self):
        result = measure_field_font(
            field_id="mrp",
            font_height_px=20,
            calibration=self._make_calibration(10.0),
            net_qty_grams=200,
        )
        d = result.to_dict()
        assert "font_height_mm" in d
        assert "min_required_mm" in d
        assert "status" in d
        assert "measurement_method" in d
        assert "confidence" in d


# ============================================================
# Batch Measurement
# ============================================================

class TestMeasureAllFields:

    def test_measures_applicable_fields(self):
        cal = CalibrationData(px_per_mm=10.0, method=MeasurementMethod.CALIBRATED,
                              confidence=MeasurementConfidence.HIGH)

        field_heights = {
            "mrp": 20,
            "net_quantity": 18,
            "date_manufacture": 15,
            "commodity_name": 22,
            "some_non_font_field": 10,  # Not in applies_to_fields
        }

        results = measure_all_fields(field_heights, cal, net_qty_grams=200)

        # Should only measure fields listed in font_size_rules.applies_to_fields
        for field_id, measurement in results.items():
            assert isinstance(measurement, FontMeasurement)
            assert measurement.font_height_px > 0

    def test_skips_zero_height(self):
        cal = CalibrationData(px_per_mm=10.0, method=MeasurementMethod.CALIBRATED,
                              confidence=MeasurementConfidence.HIGH)

        results = measure_all_fields({"mrp": 0}, cal, net_qty_grams=200)
        assert "mrp" not in results


# ============================================================
# Reference Objects
# ============================================================

class TestReferenceObjects:

    def test_available_reference_objects(self):
        refs = get_available_reference_objects()
        assert len(refs) > 0

        # Should include common items
        ids = [r["id"] for r in refs]
        assert "credit_card" in ids
        assert "1_rupee_coin" in ids

    def test_each_has_description(self):
        for ref in get_available_reference_objects():
            assert "description" in ref
