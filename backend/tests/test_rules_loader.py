"""
Tests for the LMPC Rules Loader module.

Validates that rules_lmpc.json loads correctly, contains all expected
fields, and that helper functions return correct values.
"""

import pytest
from app.rules.rules_loader import (
    load_rules,
    get_mandatory_fields,
    get_field_by_id,
    get_font_size_rules,
    get_min_font_height,
    get_severity_definitions,
    get_verdict_logic,
    get_commodity_categories,
    get_category_by_id,
)


class TestRulesLoading:
    """Test that the rules JSON loads and has the expected structure."""

    def test_rules_load_successfully(self):
        rules = load_rules()
        assert isinstance(rules, dict)

    def test_rules_has_required_top_level_keys(self):
        rules = load_rules()
        required = ["mandatory_fields", "font_size_rules", "severity_definitions", "verdict_logic"]
        for key in required:
            assert key in rules, f"Missing top-level key: {key}"

    def test_rules_has_meta(self):
        rules = load_rules()
        assert "meta" in rules
        assert "title" in rules["meta"]
        assert "Legal Metrology" in rules["meta"]["title"]


class TestMandatoryFields:
    """Test mandatory field definitions."""

    def test_mandatory_fields_is_list(self):
        fields = get_mandatory_fields()
        assert isinstance(fields, list)
        assert len(fields) > 0

    def test_all_fields_have_required_keys(self):
        required_keys = ["field_id", "display_name", "mandatory", "detection_strategy", "severity_if_missing"]
        for field in get_mandatory_fields():
            for key in required_keys:
                assert key in field, f"Field '{field.get('field_id', '?')}' missing key: {key}"

    def test_core_mandatory_fields_exist(self):
        core_ids = ["commodity_name", "net_quantity", "mrp", "manufacturer_info",
                     "date_manufacture", "consumer_care"]
        for field_id in core_ids:
            field = get_field_by_id(field_id)
            assert field is not None, f"Core field '{field_id}' not found in rules"
            assert field["mandatory"] is True, f"Core field '{field_id}' should be mandatory"

    def test_mrp_has_regex_patterns(self):
        mrp = get_field_by_id("mrp")
        assert mrp is not None
        assert "regex_patterns" in mrp
        assert len(mrp["regex_patterns"]) > 0

    def test_mrp_requires_tax_declaration(self):
        mrp = get_field_by_id("mrp")
        assert mrp["format_rules"]["must_include_tax_declaration"] is True

    def test_net_quantity_has_unit_normalization(self):
        nq = get_field_by_id("net_quantity")
        assert "unit_normalization" in nq
        assert nq["unit_normalization"]["gm"] == "g"
        assert nq["unit_normalization"]["ltr"] == "l"

    def test_conditional_fields_have_logic(self):
        conditional_ids = ["date_expiry", "country_of_origin", "unit_sale_price"]
        for field_id in conditional_ids:
            field = get_field_by_id(field_id)
            assert field is not None, f"Conditional field '{field_id}' not found"
            assert field["conditional"] is True
            assert "conditional_logic" in field

    def test_nonexistent_field_returns_none(self):
        assert get_field_by_id("nonexistent_field_xyz") is None


class TestFontSizeRules:
    """Test font size threshold logic."""

    def test_font_size_rules_has_thresholds(self):
        rules = get_font_size_rules()
        assert "thresholds" in rules
        assert len(rules["thresholds"]) == 4  # 4 tiers per LMPC Schedule II

    def test_small_package_font_size(self):
        # ≤ 50g: 1.5mm printed, 1.0mm blown
        assert get_min_font_height(30, is_printed=True) == 1.5
        assert get_min_font_height(30, is_printed=False) == 1.0
        assert get_min_font_height(50, is_printed=True) == 1.5

    def test_medium_package_font_size(self):
        # 50-200g: 2.0mm
        assert get_min_font_height(100, is_printed=True) == 2.0
        assert get_min_font_height(200, is_printed=True) == 2.0

    def test_large_package_font_size(self):
        # 200-1000g: 4.0mm
        assert get_min_font_height(500, is_printed=True) == 4.0

    def test_extra_large_package_font_size(self):
        # > 1000g: 6.0mm
        assert get_min_font_height(2000, is_printed=True) == 6.0
        assert get_min_font_height(5000, is_printed=True) == 6.0

    def test_tolerance_band_exists(self):
        rules = get_font_size_rules()
        assert "tolerance_band_percent" in rules
        assert rules["tolerance_band_percent"] == 10


class TestSeverityAndVerdict:
    """Test severity definitions and verdict logic."""

    def test_three_severity_levels(self):
        sev = get_severity_definitions()
        assert "CRITICAL" in sev
        assert "MAJOR" in sev
        assert "MINOR" in sev

    def test_severity_has_colors(self):
        sev = get_severity_definitions()
        for level in ["CRITICAL", "MAJOR", "MINOR"]:
            assert "color" in sev[level]

    def test_verdict_logic_has_three_outcomes(self):
        vl = get_verdict_logic()
        assert "COMPLIANT" in vl
        assert "NON_COMPLIANT" in vl
        assert "REQUIRES_MANUAL_REVIEW" in vl


class TestCommodityCategories:
    """Test commodity category definitions."""

    def test_categories_exist(self):
        cats = get_commodity_categories()
        assert isinstance(cats, list)
        assert len(cats) >= 5

    def test_food_category_requires_expiry(self):
        food = get_category_by_id("food")
        assert food is not None
        assert food["requires_expiry"] is True
        assert food["requires_fssai"] is True

    def test_electronics_no_expiry(self):
        elec = get_category_by_id("electronics")
        assert elec is not None
        assert elec["requires_expiry"] is False

    def test_nonexistent_category_returns_none(self):
        assert get_category_by_id("nonexistent_cat") is None
