"""
LMPC Compliance System — Font Size Measurement & Compliance Check

Converts OCR bounding box pixel heights to real-world millimeters
using a tiered calibration strategy, then validates against LMPC
Rule 9 / Schedule II minimum font height requirements.

Tier 1 (Relative Ratio):
    Estimates real-world package dimensions from the declared net quantity
    and commodity category, then scales detected text pixel height
    proportionally. Always available, lower precision.

Tier 2 (Reference Object Calibration):
    Uses a known-size reference object (coin, card, printed marker)
    detected in the image to compute an exact px-per-mm scale factor.
    Higher precision, requires user action.

Every measurement carries a `measurement_method` and `confidence` tag
so downstream reports never present estimates with false precision.
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from app.rules.rules_loader import get_font_size_rules, get_min_font_height

logger = logging.getLogger(__name__)


# ---------- Enums & Data Structures ----------

class MeasurementMethod(str, Enum):
    RELATIVE = "relative"
    CALIBRATED = "calibrated"


class MeasurementConfidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class FontComplianceStatus(str, Enum):
    COMPLIANT = "compliant"
    BORDERLINE = "borderline"
    NON_COMPLIANT = "non_compliant"
    UNKNOWN = "unknown"


@dataclass
class FontMeasurement:
    """Result of a single field's font size measurement."""
    field_id: str
    font_height_px: int
    font_height_mm: float
    min_required_mm: float
    status: FontComplianceStatus
    measurement_method: MeasurementMethod
    confidence: MeasurementConfidence
    tolerance_percent: float = 10.0
    details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "field_id": self.field_id,
            "font_height_px": self.font_height_px,
            "font_height_mm": round(self.font_height_mm, 2),
            "min_required_mm": self.min_required_mm,
            "status": self.status.value,
            "measurement_method": self.measurement_method.value,
            "confidence": self.confidence.value,
            "details": self.details,
        }


@dataclass
class CalibrationData:
    """Calibration information for pixel-to-mm conversion."""
    px_per_mm: float
    method: MeasurementMethod
    confidence: MeasurementConfidence
    source: str = ""  # Description of how calibration was obtained
    reference_object: Optional[str] = None  # e.g. "coin", "credit_card", "marker"

    def to_dict(self) -> dict:
        return {
            "px_per_mm": round(self.px_per_mm, 3),
            "method": self.method.value,
            "confidence": self.confidence.value,
            "source": self.source,
        }


# ---------- Standard Package Size Tables ----------

# Estimated real-world package dimensions (width in mm) based on
# net quantity ranges. These are rough averages across common Indian
# FMCG packaging — used for Tier 1 relative ratio estimation.

_PACKAGE_WIDTH_ESTIMATES: list[dict] = [
    # Small sachets / pouches
    {"min_g": 0, "max_g": 20, "width_mm": 60, "height_mm": 80},
    {"min_g": 20, "max_g": 50, "width_mm": 80, "height_mm": 100},
    # Small packets
    {"min_g": 50, "max_g": 100, "width_mm": 100, "height_mm": 140},
    {"min_g": 100, "max_g": 200, "width_mm": 130, "height_mm": 170},
    # Medium packets / pouches
    {"min_g": 200, "max_g": 500, "width_mm": 160, "height_mm": 220},
    # Large packets
    {"min_g": 500, "max_g": 1000, "width_mm": 200, "height_mm": 280},
    # Extra large / bulk
    {"min_g": 1000, "max_g": 5000, "width_mm": 250, "height_mm": 350},
    {"min_g": 5000, "max_g": 999999, "width_mm": 300, "height_mm": 400},
]

# Known reference object dimensions (mm)
_REFERENCE_OBJECTS = {
    "1_rupee_coin": {"diameter_mm": 25.0, "description": "₹1 coin (2019 series)"},
    "2_rupee_coin": {"diameter_mm": 27.0, "description": "₹2 coin"},
    "5_rupee_coin": {"diameter_mm": 23.0, "description": "₹5 coin"},
    "10_rupee_coin": {"diameter_mm": 27.0, "description": "₹10 coin"},
    "credit_card": {"width_mm": 85.6, "height_mm": 53.98, "description": "Standard ISO/IEC 7810 ID-1 card"},
    "aadhaar_card": {"width_mm": 85.6, "height_mm": 53.98, "description": "Aadhaar card (same as credit card)"},
    "a4_short_edge": {"width_mm": 210.0, "description": "A4 paper short edge"},
    "custom_marker": {"width_mm": 100.0, "description": "Printed 10cm calibration strip"},
}


# ---------- Tier 1: Relative Ratio Calibration ----------

def estimate_package_dimensions(net_qty_grams: float) -> dict:
    """Estimate real-world package width and height from net quantity.

    Args:
        net_qty_grams: Net quantity in grams (or ml, treated equivalently).

    Returns:
        Dict with estimated 'width_mm' and 'height_mm'.
    """
    for entry in _PACKAGE_WIDTH_ESTIMATES:
        if entry["min_g"] <= net_qty_grams < entry["max_g"]:
            return {"width_mm": entry["width_mm"], "height_mm": entry["height_mm"]}

    # Fallback for very large quantities
    return _PACKAGE_WIDTH_ESTIMATES[-1].copy()


def calibrate_tier1(
    image_width_px: int,
    image_height_px: int,
    net_qty_grams: float,
    package_bbox: Optional[dict] = None,
) -> CalibrationData:
    """Tier 1 calibration: estimate px_per_mm from declared net quantity.

    If a package bounding box is provided (from label contour detection),
    uses that region's pixel dimensions. Otherwise, assumes the package
    fills most of the image frame.

    Args:
        image_width_px: Full image width in pixels.
        image_height_px: Full image height in pixels.
        net_qty_grams: Declared net quantity converted to grams/ml.
        package_bbox: Optional detected label bounding box {"x","y","w","h"}.

    Returns:
        CalibrationData with estimated px_per_mm.
    """
    est = estimate_package_dimensions(net_qty_grams)
    est_width_mm = est["width_mm"]
    est_height_mm = est["height_mm"]

    # Use package bounding box if available, else assume ~80% of image is package
    if package_bbox:
        pkg_width_px = package_bbox["w"]
        pkg_height_px = package_bbox["h"]
    else:
        pkg_width_px = int(image_width_px * 0.80)
        pkg_height_px = int(image_height_px * 0.80)

    # Calculate px_per_mm from both dimensions and average
    px_per_mm_w = pkg_width_px / est_width_mm if est_width_mm > 0 else 1.0
    px_per_mm_h = pkg_height_px / est_height_mm if est_height_mm > 0 else 1.0
    px_per_mm = (px_per_mm_w + px_per_mm_h) / 2.0

    # Confidence based on how close the two estimates are (agreement = confidence)
    ratio = min(px_per_mm_w, px_per_mm_h) / max(px_per_mm_w, px_per_mm_h) if max(px_per_mm_w, px_per_mm_h) > 0 else 0

    if ratio > 0.85:
        confidence = MeasurementConfidence.MEDIUM
    else:
        confidence = MeasurementConfidence.LOW

    return CalibrationData(
        px_per_mm=px_per_mm,
        method=MeasurementMethod.RELATIVE,
        confidence=confidence,
        source=f"Estimated from net_qty={net_qty_grams}g → package ~{est_width_mm}×{est_height_mm}mm",
    )


# ---------- Tier 2: Reference Object Calibration ----------

def calibrate_tier2(
    reference_object_id: str,
    reference_dimension_px: float,
    dimension_type: str = "width",
) -> CalibrationData:
    """Tier 2 calibration: compute exact px_per_mm from a known reference object.

    Args:
        reference_object_id: Key from _REFERENCE_OBJECTS (e.g. "credit_card").
        reference_dimension_px: Measured pixel dimension of the reference object.
        dimension_type: "width", "height", or "diameter".

    Returns:
        CalibrationData with precise px_per_mm.
    """
    ref = _REFERENCE_OBJECTS.get(reference_object_id)
    if ref is None:
        raise ValueError(
            f"Unknown reference object: '{reference_object_id}'. "
            f"Available: {list(_REFERENCE_OBJECTS.keys())}"
        )

    # Get the real-world dimension
    if dimension_type == "diameter" and "diameter_mm" in ref:
        real_mm = ref["diameter_mm"]
    elif dimension_type == "height" and "height_mm" in ref:
        real_mm = ref["height_mm"]
    elif "width_mm" in ref:
        real_mm = ref["width_mm"]
    else:
        raise ValueError(f"Dimension '{dimension_type}' not available for '{reference_object_id}'")

    px_per_mm = reference_dimension_px / real_mm

    return CalibrationData(
        px_per_mm=px_per_mm,
        method=MeasurementMethod.CALIBRATED,
        confidence=MeasurementConfidence.HIGH,
        source=f"Calibrated from {ref.get('description', reference_object_id)}: "
               f"{reference_dimension_px:.0f}px = {real_mm}mm",
        reference_object=reference_object_id,
    )


def calibrate_tier2_custom(
    known_dimension_mm: float,
    measured_dimension_px: float,
) -> CalibrationData:
    """Tier 2 calibration with a custom known dimension.

    For cases where the user provides an arbitrary known measurement
    (e.g., "the barcode is 30mm wide and measures 150px").

    Args:
        known_dimension_mm: Real-world size in millimeters.
        measured_dimension_px: Measured pixel size of the same object.

    Returns:
        CalibrationData with precise px_per_mm.
    """
    if known_dimension_mm <= 0 or measured_dimension_px <= 0:
        raise ValueError("Both dimensions must be positive")

    px_per_mm = measured_dimension_px / known_dimension_mm

    return CalibrationData(
        px_per_mm=px_per_mm,
        method=MeasurementMethod.CALIBRATED,
        confidence=MeasurementConfidence.HIGH,
        source=f"Custom calibration: {measured_dimension_px:.0f}px = {known_dimension_mm}mm",
    )


# ---------- Font Height Conversion ----------

def px_to_mm(height_px: int, calibration: CalibrationData) -> float:
    """Convert a pixel height to millimeters using calibration data.

    Args:
        height_px: Text bounding box height in pixels.
        calibration: Active calibration data.

    Returns:
        Estimated height in millimeters.
    """
    if calibration.px_per_mm <= 0:
        return 0.0
    return height_px / calibration.px_per_mm


# ---------- Compliance Check ----------

def check_font_compliance(
    font_height_mm: float,
    min_required_mm: float,
    tolerance_percent: float = 10.0,
) -> FontComplianceStatus:
    """Determine font compliance status against the minimum requirement.

    Three-way classification:
    - COMPLIANT: font_height >= min_required
    - BORDERLINE: font_height is within tolerance% below min_required
    - NON_COMPLIANT: font_height is more than tolerance% below min_required

    Args:
        font_height_mm: Measured font height in mm.
        min_required_mm: Minimum required font height per LMPC rules.
        tolerance_percent: ±% tolerance band for "borderline" classification.

    Returns:
        FontComplianceStatus enum value.
    """
    if min_required_mm <= 0:
        return FontComplianceStatus.UNKNOWN

    if font_height_mm >= min_required_mm:
        return FontComplianceStatus.COMPLIANT

    # Check if within tolerance band
    tolerance_mm = min_required_mm * (tolerance_percent / 100.0)
    lower_bound = min_required_mm - tolerance_mm

    if font_height_mm >= lower_bound:
        return FontComplianceStatus.BORDERLINE

    return FontComplianceStatus.NON_COMPLIANT


# ---------- Main Measurement Pipeline ----------

def measure_field_font(
    field_id: str,
    font_height_px: int,
    calibration: CalibrationData,
    net_qty_grams: float,
    is_printed: bool = True,
    tolerance_percent: Optional[float] = None,
) -> FontMeasurement:
    """Measure and validate a single field's font size.

    Args:
        field_id: The field being measured (e.g., "mrp", "net_quantity").
        font_height_px: Pixel height of the field's text bounding box.
        calibration: Active calibration data (Tier 1 or Tier 2).
        net_qty_grams: Declared net quantity in grams/ml.
        is_printed: True for printed labels, False for blown/moulded.
        tolerance_percent: Override the default tolerance. Uses rules config if None.

    Returns:
        FontMeasurement with compliance status and all metrics.
    """
    # Get tolerance from rules if not overridden
    if tolerance_percent is None:
        font_rules = get_font_size_rules()
        tolerance_percent = font_rules.get("tolerance_band_percent", 10.0)

    # Convert pixel height to mm
    height_mm = px_to_mm(font_height_px, calibration)

    # Get minimum required height from rules
    min_required = get_min_font_height(net_qty_grams, is_printed=is_printed)

    # Check compliance
    status = check_font_compliance(height_mm, min_required, tolerance_percent)

    return FontMeasurement(
        field_id=field_id,
        font_height_px=font_height_px,
        font_height_mm=height_mm,
        min_required_mm=min_required,
        status=status,
        measurement_method=calibration.method,
        confidence=calibration.confidence,
        tolerance_percent=tolerance_percent,
        details={
            "px_per_mm": round(calibration.px_per_mm, 3),
            "calibration_source": calibration.source,
            "is_printed": is_printed,
            "net_qty_grams": net_qty_grams,
        },
    )


def measure_all_fields(
    field_heights: dict[str, int],
    calibration: CalibrationData,
    net_qty_grams: float,
    is_printed: bool = True,
) -> dict[str, FontMeasurement]:
    """Measure font compliance for multiple extracted fields.

    Args:
        field_heights: Mapping of field_id → font_height_px.
        calibration: Active calibration data.
        net_qty_grams: Declared net quantity in grams/ml.
        is_printed: True for printed labels.

    Returns:
        Dictionary mapping field_id → FontMeasurement.
    """
    results: dict[str, FontMeasurement] = {}

    # Fields that require font-size checking per LMPC rules
    font_check_fields = get_font_size_rules().get("applies_to_fields", [])

    for field_id, height_px in field_heights.items():
        if field_id not in font_check_fields:
            continue

        if height_px <= 0:
            continue

        results[field_id] = measure_field_font(
            field_id=field_id,
            font_height_px=height_px,
            calibration=calibration,
            net_qty_grams=net_qty_grams,
            is_printed=is_printed,
        )

    return results


# ---------- Utility: Available Reference Objects ----------

def get_available_reference_objects() -> list[dict]:
    """Return the list of supported reference objects for Tier 2 calibration.

    Useful for the frontend to display calibration options to the user.
    """
    return [
        {"id": obj_id, **obj_data}
        for obj_id, obj_data in _REFERENCE_OBJECTS.items()
    ]
