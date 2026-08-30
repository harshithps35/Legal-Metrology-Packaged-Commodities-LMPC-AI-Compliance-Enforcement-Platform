"""
Tests for the OCR Engine module.

Tests the data structures (BoundingBox, OCRToken, OCRLine, OCRResult)
and the line-grouping logic. Tesseract integration tests require
Tesseract to be installed and are skipped if unavailable.
"""

import numpy as np
import pytest

from app.pipeline.ocr_engine import (
    BoundingBox,
    OCRToken,
    OCRLine,
    OCRResult,
    TesseractOCR,
)


class TestBoundingBox:
    """Test BoundingBox data structure."""

    def test_to_dict(self):
        bb = BoundingBox(x=10, y=20, width=100, height=30)
        d = bb.to_dict()
        assert d == {"x": 10, "y": 20, "w": 100, "h": 30}

    def test_area(self):
        bb = BoundingBox(x=0, y=0, width=50, height=20)
        assert bb.area == 1000

    def test_center(self):
        bb = BoundingBox(x=10, y=20, width=100, height=40)
        assert bb.center == (60, 40)


class TestOCRToken:
    """Test OCRToken data structure."""

    def test_to_dict(self):
        token = OCRToken(
            text="MRP",
            confidence=95.5,
            bounding_box=BoundingBox(10, 20, 50, 15),
            block_num=1,
            par_num=1,
            line_num=1,
            word_num=1,
        )
        d = token.to_dict()
        assert d["text"] == "MRP"
        assert d["confidence"] == 95.5
        assert "bounding_box" in d


class TestOCRLine:
    """Test OCRLine grouping and bounding box calculation."""

    def _make_line(self) -> OCRLine:
        tokens = [
            OCRToken("MRP", 90.0, BoundingBox(10, 100, 40, 15), 1, 1, 1, 1),
            OCRToken("₹199", 85.0, BoundingBox(60, 100, 50, 15), 1, 1, 1, 2),
        ]
        return OCRLine(tokens=tokens, line_num=1, block_num=1)

    def test_line_text(self):
        line = self._make_line()
        assert line.text == "MRP ₹199"

    def test_avg_confidence(self):
        line = self._make_line()
        assert line.avg_confidence == 87.5

    def test_line_bounding_box(self):
        line = self._make_line()
        bb = line.bounding_box

        assert bb.x == 10      # leftmost x
        assert bb.y == 100     # topmost y
        assert bb.width == 100  # from x=10 to x=110 (60+50)
        assert bb.height == 15

    def test_empty_line(self):
        line = OCRLine(tokens=[], line_num=0, block_num=0)
        assert line.text == ""
        assert line.avg_confidence == 0.0

    def test_to_dict(self):
        line = self._make_line()
        d = line.to_dict()
        assert "text" in d
        assert "tokens" in d
        assert len(d["tokens"]) == 2


class TestOCRResult:
    """Test OCRResult serialization."""

    def test_to_dict(self):
        result = OCRResult(
            raw_text="MRP ₹199\nNet Wt. 200g",
            tokens=[],
            lines=[],
            image_width=1000,
            image_height=600,
            engine="tesseract",
            language="hin+eng",
            avg_confidence=88.0,
        )
        d = result.to_dict()

        assert d["engine"] == "tesseract"
        assert d["language"] == "hin+eng"
        assert d["image_size"]["width"] == 1000
        assert d["avg_confidence"] == 88.0


class TestLineGrouping:
    """Test the token-to-line grouping logic."""

    def test_groups_by_block_and_line(self):
        tokens = [
            OCRToken("Hello", 90, BoundingBox(10, 10, 50, 15), block_num=1, line_num=1, word_num=1),
            OCRToken("World", 85, BoundingBox(70, 10, 50, 15), block_num=1, line_num=1, word_num=2),
            OCRToken("Foo", 80, BoundingBox(10, 50, 30, 15), block_num=1, line_num=2, word_num=1),
            OCRToken("Bar", 75, BoundingBox(10, 100, 30, 15), block_num=2, line_num=1, word_num=1),
        ]

        lines = TesseractOCR._group_into_lines(tokens)

        assert len(lines) == 3
        assert lines[0].text == "Hello World"
        assert lines[1].text == "Foo"
        assert lines[2].text == "Bar"

    def test_sorts_tokens_left_to_right(self):
        tokens = [
            OCRToken("Second", 90, BoundingBox(100, 10, 60, 15), block_num=1, line_num=1, word_num=2),
            OCRToken("First", 90, BoundingBox(10, 10, 50, 15), block_num=1, line_num=1, word_num=1),
        ]

        lines = TesseractOCR._group_into_lines(tokens)

        assert lines[0].text == "First Second"

    def test_empty_tokens(self):
        lines = TesseractOCR._group_into_lines([])
        assert lines == []
