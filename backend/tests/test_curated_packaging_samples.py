"""
LMPC Compliance System — 4 Curated Packaging Test Scenarios (Phase F Deliverable)

Validates:
- Scenario 1: Clean Baseline Packaging (100% Compliant, Auto-Credited)
- Scenario 2: Sticker Price Tampering & Overprint (Rule 11(2)(c) Critical Infraction)
- Scenario 3: Smudged FSSAI License with Context Repair (Routed to manual review)
- Scenario 4: Schedule II Font Height Compliance (50g < Q <= 200g -> 2.0mm minimum)
"""

import unittest
from datetime import datetime, timezone

from app.engine.font_measurer import CalibrationData, MeasurementMethod, MeasurementConfidence
from app.engine.rule_engine import evaluate_compliance, Verdict, ViolationSeverity
from app.nlp.field_extractor import ExtractedField, ExtractionResult
from app.nlp.regex_matchers import FieldMatch, detect_multi_price_contradictions, repair_fssai_candidate


class TestCuratedPackagingSamples(unittest.TestCase):

    def test_scenario_01_clean_baseline_pack(self):
        """Scenario 1: Standard compliant FMCG package (e.g. Parle-G Biscuit)."""
        fields = {
            "commodity_name": ExtractedField("commodity_name", "Biscuits", confidence=0.98, detected=True),
            "manufacturer_info": ExtractedField("manufacturer_info", "Parle Products Pvt Ltd, Vile Parle East, Mumbai 400057", confidence=0.95, detected=True),
            "net_quantity": ExtractedField("net_quantity", "100 g", numeric_value=100.0, unit="g", confidence=0.99, detected=True, font_height_px=28),
            "mrp": ExtractedField("mrp", "₹10.00", numeric_value=10.0, confidence=0.98, detected=True, font_height_px=24),
            "tax_declaration": ExtractedField("tax_declaration", "Inclusive of all taxes", confidence=0.95, detected=True),
            "date_manufacture": ExtractedField("date_manufacture", "05/2026", confidence=0.96, detected=True),
            "date_expiry": ExtractedField("date_expiry", "11/2026", confidence=0.96, detected=True),
            "consumer_care": ExtractedField("consumer_care", "care@parle.biz / 1800-22-7799", confidence=0.92, detected=True),
            "country_of_origin": ExtractedField("country_of_origin", "India", confidence=0.99, detected=True),
            "batch_lot_number": ExtractedField("batch_lot_number", "B2608A", confidence=0.95, detected=True),
            "fssai_license": ExtractedField("fssai_license", "10015022003891", confidence=0.95, detected=True),
        }
        all_matches = {
            "mrp": [FieldMatch(field_id="mrp", raw_match="MRP Rs 10.00", value="₹10.00", numeric_value=10.0)],
        }
        extraction = ExtractionResult(
            fields=fields,
            all_matches=all_matches,
            raw_text="Parle-G Biscuits Net Wt: 100g MRP Rs 10.00 (Incl. of all taxes) Mfg: 05/2026 Exp: 11/2026 FSSAI Lic No 10015022003891",
            total_fields_detected=11,
            total_fields_expected=11,
            detection_rate=1.0,
        )

        report = evaluate_compliance(extraction, category="food")
        self.assertEqual(report.verdict, Verdict.COMPLIANT)
        self.assertGreaterEqual(report.compliance_score, 90.0)
        self.assertEqual(report.critical_count, 0)

    def test_scenario_02_price_tampering_sticker(self):
        """Scenario 2: Sticker pasted over MRP with higher price (Rule 11(2)(c) / Sec 36)."""
        mrp_matches = [
            FieldMatch(field_id="mrp", raw_match="MRP ₹35.00", value="₹35.00", numeric_value=35.0), # Sticker price
            FieldMatch(field_id="mrp", raw_match="₹30.00", value="₹30.00", numeric_value=30.0),      # Original price
        ]
        contra = detect_multi_price_contradictions("MRP ₹35.00 ₹30.00", mrp_matches)
        self.assertIsNotNone(contra)
        self.assertTrue(contra["has_contradiction"])
        self.assertEqual(contra["discrepancy_amount"], 5.0)

        # In rule engine
        fields = {
            "mrp": ExtractedField("mrp", "₹35.00", numeric_value=35.0, confidence=0.95, detected=True),
            "tax_declaration": ExtractedField("tax_declaration", "Incl. of all taxes", confidence=0.95, detected=True),
            "net_quantity": ExtractedField("net_quantity", "50 g", numeric_value=50.0, unit="g", confidence=0.95, detected=True),
            "date_manufacture": ExtractedField("date_manufacture", "06/2026", confidence=0.95, detected=True),
        }
        extraction = ExtractionResult(
            fields=fields,
            all_matches={"mrp": mrp_matches},
            raw_text="MRP ₹35.00 ₹30.00 Incl. of all taxes Net Qty 50g",
            total_fields_detected=4,
            total_fields_expected=8,
            detection_rate=0.5,
        )
        report = evaluate_compliance(extraction, category="food")
        self.assertEqual(report.verdict, Verdict.NON_COMPLIANT)
        self.assertGreaterEqual(report.critical_count, 1)

        critical_violations = [v for v in report.violations if v.severity == ViolationSeverity.CRITICAL]
        self.assertTrue(any("11(2)(c)" in v.rule_code for v in critical_violations))

    def test_scenario_03_smudged_fssai_context_repair(self):
        """Scenario 3: 14-digit FSSAI with optical smudge (O->0, I->1)."""
        smudged = "1O7211O1123456" # Type 1, State 07, Year 21, Cat 101, Serial 123456
        repaired = repair_fssai_candidate(smudged)
        self.assertEqual(repaired, "10721101123456")

    def test_scenario_04_schedule_ii_font_measurement(self):
        """Scenario 4: 200g pack Schedule II threshold check (Requires >= 2.0mm)."""
        calibration = CalibrationData(
            px_per_mm=10.0, # 10 px = 1 mm
            method=MeasurementMethod.CALIBRATED,
            confidence=MeasurementConfidence.HIGH,
            source="Reference test strip",
        )
        # Font height 15 px = 1.5 mm on 200g pack (Requires 2.0mm -> Non-compliant)
        fields = {
            "commodity_name": ExtractedField("commodity_name", "Chips", confidence=0.95, detected=True),
            "net_quantity": ExtractedField("net_quantity", "200 g", numeric_value=200.0, unit="g", confidence=0.95, detected=True, font_height_px=15),
            "mrp": ExtractedField("mrp", "₹20.00", numeric_value=20.0, confidence=0.95, detected=True, font_height_px=15),
            "tax_declaration": ExtractedField("tax_declaration", "Inclusive of all taxes", confidence=0.95, detected=True),
            "date_manufacture": ExtractedField("date_manufacture", "06/2026", confidence=0.95, detected=True),
            "fssai_license": ExtractedField("fssai_license", "10015022003891", confidence=0.95, detected=True),
        }
        extraction = ExtractionResult(
            fields=fields,
            all_matches={},
            raw_text="Chips Net Qty 200g MRP Rs 20.00",
            total_fields_detected=6,
            total_fields_expected=8,
            detection_rate=0.75,
        )
        report = evaluate_compliance(extraction, category="food", calibration=calibration)
        font_violations = [v for v in report.violations if "Schedule II" in v.rule_code]
        self.assertGreaterEqual(len(font_violations), 1)


if __name__ == "__main__":
    unittest.main()
