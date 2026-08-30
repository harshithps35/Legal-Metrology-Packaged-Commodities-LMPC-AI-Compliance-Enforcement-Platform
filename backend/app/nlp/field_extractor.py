"""
LMPC Compliance System — Field Extraction Orchestrator

Main entry point that combines regex matchers + NER extractors to produce
a unified structured field JSON from raw OCR text + bounding boxes.

This module:
1. Runs all regex matchers (regex_matchers.py)
2. Runs NER extractors (ner_extractor.py)
3. Merges results, resolving duplicates by confidence
4. Links extracted field values to their OCR bounding boxes
5. Outputs a clean structured JSON for the rule engine
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from app.nlp.regex_matchers import FieldMatch, run_all_matchers
from app.nlp.ner_extractor import run_all_ner_extractors
from app.pipeline.ocr_engine import OCRResult, OCRToken, BoundingBox

logger = logging.getLogger(__name__)


@dataclass
class ExtractedField:
    """A fully resolved extracted field ready for the rule engine."""
    field_id: str
    display_name: str
    detected: bool
    value: Optional[str] = None
    normalized_value: Optional[str] = None
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    confidence: float = 0.0
    bounding_box: Optional[dict] = None     # {"x", "y", "w", "h"}
    font_height_px: Optional[int] = None    # For font-size check (Phase 3)
    source: str = ""                        # "regex" | "ner" | "regex+ner"
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = {
            "field_id": self.field_id,
            "display_name": self.display_name,
            "detected": self.detected,
            "value": self.value,
            "confidence": round(self.confidence, 2),
            "source": self.source,
        }
        if self.normalized_value:
            d["normalized_value"] = self.normalized_value
        if self.numeric_value is not None:
            d["numeric_value"] = self.numeric_value
        if self.unit:
            d["unit"] = self.unit
        if self.bounding_box:
            d["bounding_box"] = self.bounding_box
        if self.font_height_px is not None:
            d["font_height_px"] = self.font_height_px
        if self.metadata:
            d["metadata"] = self.metadata
        return d


@dataclass
class ExtractionResult:
    """Complete extraction output for a single label."""
    fields: dict[str, ExtractedField]
    all_matches: dict[str, list[FieldMatch]]  # Raw matches before dedup
    raw_text: str
    total_fields_detected: int = 0
    total_fields_expected: int = 0
    detection_rate: float = 0.0

    def to_dict(self) -> dict:
        return {
            "fields": {k: v.to_dict() for k, v in self.fields.items()},
            "summary": {
                "total_detected": self.total_fields_detected,
                "total_expected": self.total_fields_expected,
                "detection_rate": round(self.detection_rate, 2),
            },
        }


# ---------- Field Display Names ----------

_FIELD_DISPLAY_NAMES = {
    "commodity_name": "Name of Commodity",
    "net_quantity": "Net Quantity",
    "mrp": "Maximum Retail Price (MRP)",
    "tax_declaration": "Tax Inclusivity Declaration",
    "manufacturer_info": "Manufacturer / Packer / Importer",
    "date_manufacture": "Date of Manufacture",
    "date_expiry": "Best Before / Expiry Date",
    "consumer_care": "Consumer Care Details",
    "country_of_origin": "Country of Origin",
    "unit_sale_price": "Unit Sale Price (USP)",
    "batch_lot_number": "Batch / Lot Number",
    "fssai_license": "FSSAI License Number",
}

# Core mandatory fields (always expected)
_CORE_MANDATORY_FIELDS = [
    "commodity_name",
    "net_quantity",
    "mrp",
    "tax_declaration",
    "manufacturer_info",
    "date_manufacture",
    "consumer_care",
]


# ---------- Bounding Box Linkage ----------

def find_best_bounding_box(
    field_match: FieldMatch,
    ocr_tokens: list[OCRToken],
) -> Optional[dict]:
    """Link a field match back to its OCR bounding box.

    Searches for OCR tokens whose text overlaps with the matched value,
    and returns the enclosing bounding box that covers all matching tokens.

    Args:
        field_match: The regex/NER match to link.
        ocr_tokens: List of OCR tokens with bounding boxes.

    Returns:
        Enclosing bounding box dict, or None if no linkage found.
    """
    if not ocr_tokens:
        return None

    # Extract key words from the match value to search for
    match_words = set(
        w.lower().strip(".,;:₹()/-")
        for w in field_match.raw_match.split()
        if len(w.strip(".,;:₹()/-")) > 1
    )

    if not match_words:
        return None

    # Find tokens whose text matches any word in the field match
    matching_tokens: list[OCRToken] = []
    for token in ocr_tokens:
        token_text = token.text.lower().strip(".,;:₹()/-")
        if token_text in match_words:
            matching_tokens.append(token)

    if not matching_tokens:
        # Fallback: partial substring match
        for token in ocr_tokens:
            token_lower = token.text.lower()
            for word in match_words:
                if word in token_lower or token_lower in word:
                    matching_tokens.append(token)
                    break

    if not matching_tokens:
        return None

    # Compute enclosing bounding box
    x_min = min(t.bounding_box.x for t in matching_tokens)
    y_min = min(t.bounding_box.y for t in matching_tokens)
    x_max = max(t.bounding_box.x + t.bounding_box.width for t in matching_tokens)
    y_max = max(t.bounding_box.y + t.bounding_box.height for t in matching_tokens)

    return {
        "x": x_min,
        "y": y_min,
        "w": x_max - x_min,
        "h": y_max - y_min,
    }


def estimate_font_height_px(
    field_match: FieldMatch,
    ocr_tokens: list[OCRToken],
) -> Optional[int]:
    """Estimate the font pixel height for a matched field.

    Uses the median bounding box height of matching tokens as the
    estimated character height (in pixels). The rule engine will
    convert this to mm using calibration data.
    """
    if not ocr_tokens:
        return None

    match_words = set(
        w.lower().strip(".,;:₹()/-")
        for w in field_match.raw_match.split()
        if len(w.strip(".,;:₹()/-")) > 1
    )

    heights = []
    for token in ocr_tokens:
        token_text = token.text.lower().strip(".,;:₹()/-")
        if token_text in match_words:
            heights.append(token.bounding_box.height)

    if not heights:
        return None

    # Use median to be robust against outlier tokens
    heights.sort()
    mid = len(heights) // 2
    return heights[mid]


# ---------- Merge & Dedup Logic ----------

def _pick_best_match(matches: list[FieldMatch]) -> FieldMatch:
    """From multiple matches for the same field, pick the best one.

    Selection criteria:
    1. Highest confidence
    2. Ties broken by longest raw_match (more context = more reliable)
    """
    return max(matches, key=lambda m: (m.confidence, len(m.raw_match)))


# ---------- Main Extraction Pipeline ----------

def extract_fields(
    ocr_result: OCRResult,
    category: Optional[str] = None,
    product_name: Optional[str] = None,
    brand: Optional[str] = None,
) -> ExtractionResult:
    """Run the full field extraction pipeline.

    1. Execute regex matchers on raw OCR text
    2. Execute NER extractors
    3. Merge, dedup, and link bounding boxes
    4. Return structured ExtractionResult

    Args:
        ocr_result: Output from the OCR engine (Phase 1).
        category: Optional commodity category for conditional field logic.
        product_name: Optional user-specified product name from inspection form.
        brand: Optional user-specified brand name.

    Returns:
        ExtractionResult with all detected fields.
    """
    raw_text = ocr_result.raw_text
    ocr_tokens = ocr_result.tokens
    lines_text = [line.text for line in ocr_result.lines]

    # --- Step 1: Regex matching ---
    regex_matches = run_all_matchers(raw_text)

    # --- Step 2: NER extraction ---
    mfr_section = None
    if "manufacturer_info" in regex_matches:
        mfr_section = regex_matches["manufacturer_info"][0].value

    ner_matches = run_all_ner_extractors(
        raw_text,
        lines=lines_text,
        manufacturer_section=mfr_section,
    )

    # --- Step 3: Merge regex + NER results ---
    all_matches: dict[str, list[FieldMatch]] = {}

    for field_id, matches in regex_matches.items():
        all_matches.setdefault(field_id, []).extend(matches)

    for field_id, matches in ner_matches.items():
        all_matches.setdefault(field_id, []).extend(matches)

    # Add inspector provided metadata if given
    if product_name and product_name.strip():
        all_matches.setdefault("commodity_name", []).append(
            FieldMatch(
                field_id="commodity_name",
                raw_match=product_name.strip(),
                value=product_name.strip(),
                confidence=0.95,
                pattern_used="inspector_input",
            )
        )
    if brand and brand.strip():
        all_matches.setdefault("manufacturer_info", []).append(
            FieldMatch(
                field_id="manufacturer_info",
                raw_match=brand.strip(),
                value=brand.strip(),
                confidence=0.85,
                pattern_used="brand_input",
            )
        )

    # --- Step 4: Resolve best match per field + link bounding boxes ---
    fields: dict[str, ExtractedField] = {}

    for field_id in _FIELD_DISPLAY_NAMES:
        display_name = _FIELD_DISPLAY_NAMES[field_id]

        if field_id in all_matches and all_matches[field_id]:
            best = _pick_best_match(all_matches[field_id])

            # Link to bounding box
            bbox = find_best_bounding_box(best, ocr_tokens)
            font_h = estimate_font_height_px(best, ocr_tokens)

            # Determine source
            has_regex = any(
                m.pattern_used not in ("spacy_ner", "spacy_product", "first_line_heuristic", "consumer_care_section", "no_header_fallback")
                for m in all_matches[field_id]
            )
            has_ner = any(
                m.pattern_used in ("spacy_ner", "spacy_product", "first_line_heuristic", "consumer_care_section", "no_header_fallback")
                for m in all_matches[field_id]
            )
            source = "regex+ner" if (has_regex and has_ner) else ("ner" if has_ner else "regex")

            fields[field_id] = ExtractedField(
                field_id=field_id,
                display_name=display_name,
                detected=True,
                value=best.value,
                normalized_value=best.metadata.get("normalized_date"),
                numeric_value=best.numeric_value,
                unit=best.unit,
                confidence=best.confidence,
                bounding_box=bbox,
                font_height_px=font_h,
                source=source,
                metadata=best.metadata,
            )
        else:
            # Field not detected
            fields[field_id] = ExtractedField(
                field_id=field_id,
                display_name=display_name,
                detected=False,
                confidence=0.0,
                source="none",
            )

    # --- Step 5: Compute summary stats ---
    expected = len(_CORE_MANDATORY_FIELDS)
    detected = sum(1 for fid in _CORE_MANDATORY_FIELDS if fields.get(fid, ExtractedField("", "", False)).detected)
    rate = detected / expected if expected > 0 else 0.0

    return ExtractionResult(
        fields=fields,
        all_matches=all_matches,
        raw_text=raw_text,
        total_fields_detected=detected,
        total_fields_expected=expected,
        detection_rate=rate,
    )
