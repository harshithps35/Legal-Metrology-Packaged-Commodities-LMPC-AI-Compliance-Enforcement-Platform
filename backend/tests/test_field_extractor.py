"""
Tests for the Field Extraction Orchestrator.

Tests bounding box linkage, font height estimation, best-match selection,
and the full extraction pipeline with mock OCR results.
"""

import pytest
from app.nlp.field_extractor import (
    ExtractedField,
    ExtractionResult,
    find_best_bounding_box,
    estimate_font_height_px,
    extract_fields,
    _pick_best_match,
)
from app.nlp.regex_matchers import FieldMatch
from app.pipeline.ocr_engine import OCRResult, OCRToken, OCRLine, BoundingBox


def _make_mock_ocr_result() -> OCRResult:
    """Create a mock OCR result simulating a realistic label."""
    tokens = [
        OCRToken("Parle-G", 95.0, BoundingBox(50, 20, 120, 30), 1, 1, 1, 1),
        OCRToken("Gold", 93.0, BoundingBox(180, 20, 60, 30), 1, 1, 1, 2),
        OCRToken("Glucose", 90.0, BoundingBox(50, 60, 100, 20), 1, 1, 2, 1),
        OCRToken("Biscuits", 92.0, BoundingBox(160, 60, 110, 20), 1, 1, 2, 2),
        OCRToken("Net", 88.0, BoundingBox(50, 100, 40, 18), 2, 1, 1, 1),
        OCRToken("Wt.", 85.0, BoundingBox(95, 100, 30, 18), 2, 1, 1, 2),
        OCRToken("200g", 91.0, BoundingBox(130, 100, 55, 18), 2, 1, 1, 3),
        OCRToken("MRP", 94.0, BoundingBox(50, 140, 45, 16), 3, 1, 1, 1),
        OCRToken("₹30.00", 90.0, BoundingBox(100, 140, 70, 16), 3, 1, 1, 2),
        OCRToken("(Incl.", 87.0, BoundingBox(180, 140, 50, 14), 3, 1, 1, 3),
        OCRToken("of", 85.0, BoundingBox(235, 140, 20, 14), 3, 1, 1, 4),
        OCRToken("all", 86.0, BoundingBox(260, 140, 25, 14), 3, 1, 1, 5),
        OCRToken("taxes)", 88.0, BoundingBox(290, 140, 55, 14), 3, 1, 1, 6),
        OCRToken("MFG", 89.0, BoundingBox(50, 180, 40, 14), 4, 1, 1, 1),
        OCRToken("06/2026", 87.0, BoundingBox(95, 180, 70, 14), 4, 1, 1, 2),
        OCRToken("Best", 86.0, BoundingBox(50, 210, 40, 14), 5, 1, 1, 1),
        OCRToken("Before", 84.0, BoundingBox(95, 210, 55, 14), 5, 1, 1, 2),
        OCRToken("9", 90.0, BoundingBox(155, 210, 12, 14), 5, 1, 1, 3),
        OCRToken("months", 88.0, BoundingBox(172, 210, 60, 14), 5, 1, 1, 4),
        OCRToken("from", 85.0, BoundingBox(237, 210, 40, 14), 5, 1, 1, 5),
        OCRToken("Mfg", 83.0, BoundingBox(282, 210, 30, 14), 5, 1, 1, 6),
        OCRToken("Consumer", 82.0, BoundingBox(50, 260, 80, 14), 6, 1, 1, 1),
        OCRToken("Care:", 80.0, BoundingBox(135, 260, 45, 14), 6, 1, 1, 2),
        OCRToken("1800-123-4567", 78.0, BoundingBox(185, 260, 130, 14), 6, 1, 1, 3),
    ]

    lines = [
        OCRLine(tokens[0:2], line_num=1, block_num=1),
        OCRLine(tokens[2:4], line_num=2, block_num=1),
        OCRLine(tokens[4:7], line_num=1, block_num=2),
        OCRLine(tokens[7:13], line_num=1, block_num=3),
        OCRLine(tokens[13:15], line_num=1, block_num=4),
        OCRLine(tokens[15:21], line_num=1, block_num=5),
        OCRLine(tokens[21:24], line_num=1, block_num=6),
    ]

    raw_text = (
        "Parle-G Gold\n"
        "Glucose Biscuits\n"
        "Net Wt. 200g\n"
        "MRP ₹30.00 (Incl. of all taxes)\n"
        "MFG 06/2026\n"
        "Best Before 9 months from Mfg\n"
        "Consumer Care: 1800-123-4567"
    )

    return OCRResult(
        raw_text=raw_text,
        tokens=tokens,
        lines=lines,
        image_width=500,
        image_height=300,
        engine="tesseract",
        language="hin+eng",
        avg_confidence=87.5,
    )


class TestBoundingBoxLinkage:

    def test_finds_matching_tokens(self):
        tokens = [
            OCRToken("MRP", 90, BoundingBox(10, 100, 40, 15), 1, 1, 1, 1),
            OCRToken("₹30.00", 85, BoundingBox(60, 100, 70, 15), 1, 1, 1, 2),
            OCRToken("Net", 88, BoundingBox(10, 50, 30, 12), 1, 1, 2, 1),
        ]

        match = FieldMatch(
            field_id="mrp",
            raw_match="MRP ₹30.00",
            value="₹30.00",
            confidence=0.95,
        )

        bbox = find_best_bounding_box(match, tokens)
        assert bbox is not None
        assert bbox["x"] == 10
        assert bbox["w"] == 120  # 10 to 130 (60+70)

    def test_returns_none_for_no_match(self):
        tokens = [
            OCRToken("Hello", 90, BoundingBox(10, 10, 50, 15), 1, 1, 1, 1),
        ]

        match = FieldMatch(
            field_id="mrp",
            raw_match="MRP ₹199",
            value="₹199",
            confidence=0.95,
        )

        bbox = find_best_bounding_box(match, tokens)
        assert bbox is None

    def test_empty_tokens(self):
        match = FieldMatch(field_id="mrp", raw_match="MRP", value="MRP", confidence=0.9)
        assert find_best_bounding_box(match, []) is None


class TestFontHeightEstimation:

    def test_estimates_height(self):
        tokens = [
            OCRToken("MRP", 90, BoundingBox(10, 100, 40, 18), 1, 1, 1, 1),
            OCRToken("₹30", 85, BoundingBox(60, 100, 35, 16), 1, 1, 1, 2),
        ]

        match = FieldMatch(
            field_id="mrp",
            raw_match="MRP ₹30",
            value="₹30",
            confidence=0.95,
        )

        height = estimate_font_height_px(match, tokens)
        assert height is not None
        assert height == 18  # Median of [18] (only "MRP" matches by word)


class TestPickBestMatch:

    def test_picks_highest_confidence(self):
        matches = [
            FieldMatch(field_id="mrp", raw_match="₹30", value="₹30", confidence=0.60),
            FieldMatch(field_id="mrp", raw_match="MRP ₹30.00", value="₹30.00", confidence=0.95),
        ]
        best = _pick_best_match(matches)
        assert best.confidence == 0.95

    def test_breaks_tie_by_length(self):
        matches = [
            FieldMatch(field_id="mrp", raw_match="₹30", value="₹30", confidence=0.90),
            FieldMatch(field_id="mrp", raw_match="MRP ₹30.00", value="₹30.00", confidence=0.90),
        ]
        best = _pick_best_match(matches)
        assert "MRP" in best.raw_match


class TestFullExtraction:

    def test_extraction_from_mock_ocr(self):
        ocr = _make_mock_ocr_result()
        result = extract_fields(ocr)

        assert isinstance(result, ExtractionResult)

        # Should detect these fields
        assert result.fields["mrp"].detected is True
        assert result.fields["net_quantity"].detected is True
        assert result.fields["date_manufacture"].detected is True
        assert result.fields["tax_declaration"].detected is True
        assert result.fields["date_expiry"].detected is True

    def test_extraction_produces_values(self):
        ocr = _make_mock_ocr_result()
        result = extract_fields(ocr)

        mrp = result.fields["mrp"]
        assert mrp.numeric_value == 30.00

        nq = result.fields["net_quantity"]
        assert nq.numeric_value == 200
        assert nq.unit == "g"

    def test_detection_rate(self):
        ocr = _make_mock_ocr_result()
        result = extract_fields(ocr)

        assert result.total_fields_expected > 0
        assert result.detection_rate > 0.0

    def test_to_dict(self):
        ocr = _make_mock_ocr_result()
        result = extract_fields(ocr)
        d = result.to_dict()

        assert "fields" in d
        assert "summary" in d
        assert "total_detected" in d["summary"]

    def test_undetected_fields_marked(self):
        ocr = _make_mock_ocr_result()
        result = extract_fields(ocr)

        # Country of origin is not in the mock text
        coo = result.fields["country_of_origin"]
        assert coo.detected is False
        assert coo.confidence == 0.0
