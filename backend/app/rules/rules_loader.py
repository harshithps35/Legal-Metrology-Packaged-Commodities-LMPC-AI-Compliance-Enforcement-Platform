"""
LMPC Compliance System — Rules Loader

Loads and provides access to the LMPC rules configuration.
This is the ONLY module that reads rules_lmpc.json.
All other modules import from here — never parse the JSON directly.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings


@lru_cache()
def load_rules() -> dict[str, Any]:
    """Load the LMPC rules JSON file and return as a dictionary.

    Returns:
        Parsed rules dictionary with keys:
        - mandatory_fields: list of field definitions
        - font_size_rules: font height thresholds
        - dual_pricing_rules: dual pricing detection config
        - metric_unit_rules: prohibited units
        - commodity_categories: category definitions
        - severity_definitions: severity level metadata
        - verdict_logic: verdict determination conditions
    """
    settings = get_settings()
    rules_path = Path(settings.RULES_FILE)

    if not rules_path.exists():
        raise FileNotFoundError(
            f"Rules file not found at {rules_path}. "
            "Ensure rules_lmpc.json exists in backend/app/rules/."
        )

    with open(rules_path, "r", encoding="utf-8") as f:
        rules = json.load(f)

    # Basic validation
    required_keys = [
        "mandatory_fields",
        "font_size_rules",
        "severity_definitions",
        "verdict_logic",
    ]
    for key in required_keys:
        if key not in rules:
            raise ValueError(
                f"Rules file is missing required key: '{key}'. "
                "Check rules_lmpc.json integrity."
            )

    return rules


def get_mandatory_fields() -> list[dict]:
    """Return the list of mandatory field definitions."""
    return load_rules()["mandatory_fields"]


def get_field_by_id(field_id: str) -> dict | None:
    """Look up a single field definition by its field_id."""
    for field in get_mandatory_fields():
        if field["field_id"] == field_id:
            return field
    return None


def get_font_size_rules() -> dict:
    """Return the font size thresholds and tolerance config."""
    return load_rules()["font_size_rules"]


def get_min_font_height(net_qty_grams: float, is_printed: bool = True) -> float:
    """Determine the minimum required font height (mm) for a given net quantity.

    Args:
        net_qty_grams: Net quantity normalized to grams (or ml, treated equivalently).
        is_printed: True for printed labels, False for blown/moulded/perforated.

    Returns:
        Minimum required font height in millimeters.
    """
    font_rules = get_font_size_rules()
    key = "min_font_height_printed" if is_printed else "min_font_height_blown_moulded_perforated"

    for threshold in font_rules["thresholds"]:
        max_qty = threshold["net_quantity_max"]
        if max_qty is None or net_qty_grams <= max_qty:
            return threshold[key]

    # Fallback: largest threshold (> 1kg)
    return font_rules["thresholds"][-1][key]


def get_severity_definitions() -> dict:
    """Return severity level metadata (colors, icons, descriptions)."""
    return load_rules()["severity_definitions"]


def get_verdict_logic() -> dict:
    """Return verdict determination conditions."""
    return load_rules()["verdict_logic"]


def get_commodity_categories() -> list[dict]:
    """Return commodity category definitions for conditional field logic."""
    return load_rules()["commodity_categories"]["categories"]


def get_category_by_id(category_id: str) -> dict | None:
    """Look up a commodity category by its ID."""
    for cat in get_commodity_categories():
        if cat["id"] == category_id:
            return cat
    return None
