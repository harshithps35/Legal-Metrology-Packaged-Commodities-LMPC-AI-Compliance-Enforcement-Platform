"""
LMPC Compliance System — Tests for Phase B Verification & Barcode Engine

Validates:
1. Context-aware FSSAI repair logic (1-2-2-3-6)
2. Spatial multi-price contradiction detection (Rule 11(2)(c))
3. BarcodeDetector GTIN parsing
"""

import unittest
from app.nlp.regex_matchers import (
    FieldMatch,
    detect_multi_price_contradictions,
    match_fssai_license,
    repair_fssai_candidate,
)
from app.pipeline.barcode_detector import BarcodeDetector


class TestPhaseBVerification(unittest.TestCase):

    def test_fssai_repair_valid(self):
        # 14-digit candidate with 'O' and 'I' substitutions
        # Target: Type 1, State 07 (Delhi), Year 21, Cat 101, Serial 123456
        smudged = "1O7211O1123456"
        repaired = repair_fssai_candidate(smudged)
        self.assertIsNotNone(repaired)
        self.assertEqual(repaired, "10721101123456")
        self.assertEqual(len(repaired), 14)

    def test_fssai_matcher_with_keyword(self):
        text = "FSSAI Lic. No. 10015022003891"
        matches = match_fssai_license(text)
        self.assertGreaterEqual(len(matches), 1)
        self.assertEqual(matches[0].value, "10015022003891")
        self.assertTrue(matches[0].metadata.get("is_valid_structure"))

    def test_multi_price_contradiction(self):
        mrp_matches = [
            FieldMatch(field_id="mrp", raw_match="MRP Rs 25.00", value="₹25.00", numeric_value=25.0),
            FieldMatch(field_id="mrp", raw_match="Rs 20.00", value="₹20.00", numeric_value=20.0),
        ]
        result = detect_multi_price_contradictions("MRP Rs 25.00 Rs 20.00", mrp_matches)
        self.assertIsNotNone(result)
        self.assertTrue(result["has_contradiction"])
        self.assertEqual(result["highest_price"], 25.0)
        self.assertEqual(result["lowest_price"], 20.0)
        self.assertEqual(result["discrepancy_amount"], 5.0)

    def test_gtin_extraction_from_payload(self):
        detector = BarcodeDetector()
        gtin = detector._extract_gtin_from_payload("(01)08901063012345")
        self.assertIsNotNone(gtin)
        self.assertEqual(len(gtin), 14)


if __name__ == "__main__":
    unittest.main()
