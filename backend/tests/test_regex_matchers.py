"""
Tests for regex-based field matchers.

Tests each matcher against realistic OCR text snippets covering
common label formats, edge cases, and expected failure modes.
"""

import pytest
from app.nlp.regex_matchers import (
    FieldMatch,
    match_mrp,
    match_tax_declaration,
    match_net_quantity,
    match_manufacture_date,
    match_expiry_date,
    match_unit_sale_price,
    match_batch_number,
    match_fssai_license,
    match_country_of_origin,
    match_manufacturer_keywords,
    find_unlabeled_dates,
    run_all_matchers,
    normalize_unit,
    to_grams_or_ml,
)


# ============================================================
# MRP
# ============================================================

class TestMatchMRP:

    def test_mrp_with_rupee_symbol(self):
        matches = match_mrp("MRP ₹199.00")
        assert len(matches) == 1
        assert matches[0].numeric_value == 199.00

    def test_mrp_with_rs(self):
        matches = match_mrp("M.R.P. Rs. 45.00")
        assert len(matches) == 1
        assert matches[0].numeric_value == 45.00

    def test_mrp_with_colon(self):
        matches = match_mrp("MRP: Rs 250/-")
        assert len(matches) == 1
        assert matches[0].numeric_value == 250.00

    def test_mrp_no_keyword_fallback(self):
        matches = match_mrp("Price is ₹350 for this item")
        assert len(matches) >= 1
        assert matches[0].confidence < 0.80  # Lower confidence for fallback

    def test_mrp_with_commas(self):
        matches = match_mrp("MRP ₹1,299.00")
        assert len(matches) == 1
        assert matches[0].numeric_value == 1299.00

    def test_no_mrp_in_text(self):
        matches = match_mrp("This is a random text with no price")
        assert len(matches) == 0

    def test_maximum_retail_price_full(self):
        matches = match_mrp("Maximum Retail Price ₹89.50")
        assert len(matches) == 1
        assert matches[0].numeric_value == 89.50


# ============================================================
# Tax Declaration
# ============================================================

class TestMatchTaxDeclaration:

    def test_inclusive_of_all_taxes(self):
        matches = match_tax_declaration("MRP ₹199 (Inclusive of all taxes)")
        assert len(matches) >= 1

    def test_incl_all_taxes(self):
        matches = match_tax_declaration("MRP ₹50/- Incl. of all taxes")
        assert len(matches) >= 1

    def test_all_taxes_included(self):
        matches = match_tax_declaration("₹250 all taxes included")
        assert len(matches) >= 1

    def test_no_tax_declaration(self):
        matches = match_tax_declaration("MRP ₹199")
        assert len(matches) == 0


# ============================================================
# Net Quantity
# ============================================================

class TestMatchNetQuantity:

    def test_net_wt_grams(self):
        matches = match_net_quantity("Net Wt. 200g")
        assert len(matches) == 1
        assert matches[0].numeric_value == 200
        assert matches[0].unit == "g"

    def test_net_qty_ml(self):
        matches = match_net_quantity("Net Qty: 500 ml")
        assert len(matches) == 1
        assert matches[0].numeric_value == 500
        assert matches[0].unit == "ml"

    def test_net_weight_kg(self):
        matches = match_net_quantity("Net Weight 1.5 kg")
        assert len(matches) == 1
        assert matches[0].numeric_value == 1.5
        assert matches[0].unit == "kg"

    def test_bare_quantity_fallback(self):
        matches = match_net_quantity("Contains 250ml of juice")
        assert len(matches) >= 1

    def test_net_content_litre(self):
        matches = match_net_quantity("Net Content: 2 ltr")
        assert len(matches) == 1
        assert matches[0].unit == "l"

    def test_grams_equivalent(self):
        matches = match_net_quantity("Net Wt. 500g")
        assert matches[0].metadata.get("grams_equivalent") == 500.0

    def test_kg_grams_equivalent(self):
        matches = match_net_quantity("Net Wt 2 kg")
        assert matches[0].metadata.get("grams_equivalent") == 2000.0


# ============================================================
# Dates
# ============================================================

class TestMatchManufactureDate:

    def test_mfg_mm_yyyy(self):
        matches = match_manufacture_date("MFG 06/2026")
        assert len(matches) == 1
        assert "06" in matches[0].value

    def test_mfg_date_word(self):
        matches = match_manufacture_date("Mfg. Date: 15/03/2026")
        assert len(matches) == 1

    def test_manufactured_month_name(self):
        matches = match_manufacture_date("Manufactured Mar 2026")
        assert len(matches) == 1

    def test_pkd_date(self):
        matches = match_manufacture_date("PKD: 01-06-2026")
        assert len(matches) == 1

    def test_no_mfg_date(self):
        matches = match_manufacture_date("This product is fresh")
        assert len(matches) == 0


class TestMatchExpiryDate:

    def test_exp_date(self):
        matches = match_expiry_date("EXP: 12/2027")
        assert len(matches) == 1

    def test_best_before_date(self):
        matches = match_expiry_date("Best Before Sep 2027")
        assert len(matches) == 1

    def test_use_by(self):
        matches = match_expiry_date("Use By 06/2027")
        assert len(matches) == 1

    def test_relative_expiry(self):
        matches = match_expiry_date("Best Before 9 months from Mfg")
        assert len(matches) == 1
        assert matches[0].metadata.get("type") == "relative"
        assert matches[0].metadata.get("duration") == 9

    def test_shelf_life(self):
        matches = match_expiry_date("Shelf Life 12 months")
        assert len(matches) == 1


class TestUnlabeledDates:

    def test_finds_bare_dates(self):
        matches = find_unlabeled_dates("Some text 06/2026 more text")
        assert len(matches) >= 1
        assert matches[0].confidence < 0.50


# ============================================================
# Unit Sale Price
# ============================================================

class TestMatchUSP:

    def test_usp_per_kg(self):
        matches = match_unit_sale_price("USP: ₹250.00/kg")
        assert len(matches) == 1
        assert matches[0].numeric_value == 250.00

    def test_unit_price_per_100g(self):
        matches = match_unit_sale_price("Unit Price Rs.50 per 100 g")
        assert len(matches) == 1


# ============================================================
# Batch Number
# ============================================================

class TestMatchBatch:

    def test_batch_no(self):
        matches = match_batch_number("Batch No. A2606K12")
        assert len(matches) == 1
        assert matches[0].value == "A2606K12"

    def test_lot_number(self):
        matches = match_batch_number("LOT 2603CH-B")
        assert len(matches) == 1

    def test_b_no(self):
        matches = match_batch_number("B.No. XY-123/A")
        assert len(matches) == 1


# ============================================================
# FSSAI
# ============================================================

class TestMatchFSSAI:

    def test_fssai_14_digit(self):
        matches = match_fssai_license("FSSAI Lic No. 10012345678901")
        assert len(matches) == 1
        assert matches[0].value == "10012345678901"

    def test_fssai_standalone_14digit(self):
        matches = match_fssai_license("License 10012345678901 issued")
        assert len(matches) >= 1

    def test_no_fssai(self):
        matches = match_fssai_license("Random text with no license")
        assert len(matches) == 0


# ============================================================
# Country of Origin
# ============================================================

class TestMatchCountry:

    def test_made_in_india(self):
        matches = match_country_of_origin("Made in India")
        assert len(matches) == 1
        assert "India" in matches[0].value

    def test_product_of_switzerland(self):
        matches = match_country_of_origin("Product of Switzerland")
        assert len(matches) == 1

    def test_country_of_origin_label(self):
        matches = match_country_of_origin("Country of Origin: China")
        assert len(matches) == 1
        assert "China" in matches[0].value


# ============================================================
# Manufacturer Keywords
# ============================================================

class TestMatchManufacturer:

    def test_mfg_by(self):
        text = "Mfg. by Parle Products Pvt. Ltd., Vile Parle, Mumbai\nMRP ₹30"
        matches = match_manufacturer_keywords(text)
        assert len(matches) >= 1
        assert "Parle" in matches[0].value

    def test_imported_by(self):
        text = "Imported by ABC Traders, Delhi\nNet Wt 100g"
        matches = match_manufacturer_keywords(text)
        assert len(matches) >= 1
        assert matches[0].metadata["type"] == "importer"


# ============================================================
# Unit Normalization
# ============================================================

class TestUnitNormalization:

    def test_gm_to_g(self):
        assert normalize_unit("gm") == "g"

    def test_ltr_to_l(self):
        assert normalize_unit("ltr") == "l"

    def test_litres_to_l(self):
        assert normalize_unit("litres") == "l"

    def test_pcs_to_units(self):
        assert normalize_unit("pcs") == "units"


class TestToGramsOrMl:

    def test_kg_to_grams(self):
        assert to_grams_or_ml(2.0, "kg") == 2000.0

    def test_g_stays_same(self):
        assert to_grams_or_ml(500, "g") == 500.0

    def test_l_to_ml(self):
        assert to_grams_or_ml(1.5, "l") == 1500.0


# ============================================================
# Run All Matchers
# ============================================================

class TestRunAllMatchers:

    def test_comprehensive_label(self):
        """Test against a realistic full label text."""
        label_text = """
Parle-G Gold
Glucose Biscuits
Net Wt. 200g
MRP ₹30.00 (Incl. of all taxes)
Mfg. by Parle Products Pvt. Ltd.
Vile Parle (E), Mumbai - 400057
MFG 06/2026
Best Before 9 months from Mfg
Batch No. A2606K12
FSSAI Lic No. 10012345678901
Consumer Care: 1800-123-4567
Email: consumer@parle.com
Made in India
"""
        results = run_all_matchers(label_text)

        assert "mrp" in results
        assert "tax_declaration" in results
        assert "net_quantity" in results
        assert "date_manufacture" in results
        assert "date_expiry" in results
        assert "batch_lot_number" in results
        assert "fssai_license" in results
        assert "country_of_origin" in results
        assert "manufacturer_info" in results
