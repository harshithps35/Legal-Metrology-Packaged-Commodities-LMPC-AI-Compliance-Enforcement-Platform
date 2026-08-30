"""
LMPC Compliance System — Regex-Based Field Matchers

Deterministic pattern matching for well-structured label fields:
MRP, tax declaration, net quantity, dates, unit sale price, batch/lot,
and FSSAI license number.

Each matcher returns a list of FieldMatch objects with the extracted
value, confidence, and the source text span for bounding box linkage.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FieldMatch:
    """A single regex-matched field value."""
    field_id: str
    raw_match: str            # The exact text span that matched
    value: str                # Cleaned/normalized extracted value
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    confidence: float = 1.0   # Regex matches are high confidence by default
    match_start: int = 0      # Character offset in source text
    match_end: int = 0
    pattern_used: str = ""    # Which pattern triggered the match
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = {
            "field_id": self.field_id,
            "raw_match": self.raw_match,
            "value": self.value,
            "confidence": round(self.confidence, 2),
            "match_span": [self.match_start, self.match_end],
        }
        if self.numeric_value is not None:
            d["numeric_value"] = self.numeric_value
        if self.unit:
            d["unit"] = self.unit
        if self.metadata:
            d["metadata"] = self.metadata
        return d


# ---------- Unit Normalization Map ----------

UNIT_NORMALIZATION = {
    "g": "g", "gm": "g", "gms": "g", "gram": "g", "grams": "g",
    "kg": "kg", "kgs": "kg",
    "ml": "ml", "mL": "ml",
    "l": "l", "ltr": "l", "ltrs": "l", "litre": "l", "litres": "l",
    "liter": "l", "liters": "l",
    "m": "m", "cm": "cm", "mm": "mm",
    "units": "units", "nos": "units", "pcs": "units", "pieces": "units",
    "count": "units", "N": "units",
}

# Conversion to grams/ml for font-size threshold lookup
UNIT_TO_GRAMS = {
    "g": 1.0, "kg": 1000.0,
    "ml": 1.0, "l": 1000.0,
    "cm": 1.0, "m": 100.0, "mm": 0.1,
}


def normalize_unit(unit: str) -> str:
    """Normalize a unit string to its canonical form."""
    return UNIT_NORMALIZATION.get(unit.lower().strip("."), unit.lower())


def to_grams_or_ml(value: float, unit: str) -> Optional[float]:
    """Convert a quantity to grams (or ml, treated equivalently) for font-size rules."""
    normalized = normalize_unit(unit)
    factor = UNIT_TO_GRAMS.get(normalized)
    if factor is None:
        return None
    return value * factor


# ---------- MRP Matcher ----------

def match_mrp(text: str) -> list[FieldMatch]:
    """Extract Maximum Retail Price declarations.

    Patterns:
    - "MRP ₹199", "M.R.P. Rs. 45.00", "MRP: Rs 250/-"
    - Bare currency: "₹199" (lower confidence fallback)
    """
    matches: list[FieldMatch] = []

    # Primary: MRP keyword + price
    primary_pattern = (
        r"(?i)(?:MRP|M\.?\s*R\.?\s*P\.?|Maximum\s*Retail\s*Price)"
        r"[\s.:=\-]*"
        r"(?:(?:Rs\.?|₹|INR)\s*)?"
        r"([\d,]+(?:\.\d{1,2})?)"
        r"\s*(?:/\-|/-|/\-)?"
    )

    for m in re.finditer(primary_pattern, text):
        price_str = m.group(1).replace(",", "")
        try:
            price_val = float(price_str)
        except ValueError:
            continue

        matches.append(FieldMatch(
            field_id="mrp",
            raw_match=m.group(0).strip(),
            value=f"₹{price_val:.2f}",
            numeric_value=price_val,
            confidence=0.95,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="mrp_keyword",
        ))

    # Fallback: bare currency symbol + number (no MRP keyword)
    if not matches:
        fallback_pattern = r"(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:/\-|/-|/\-)?"
        for m in re.finditer(fallback_pattern, text):
            price_str = m.group(1).replace(",", "")
            try:
                price_val = float(price_str)
            except ValueError:
                continue

            # Only accept reasonable MRP values
            if 1.0 <= price_val <= 100000.0:
                matches.append(FieldMatch(
                    field_id="mrp",
                    raw_match=m.group(0).strip(),
                    value=f"₹{price_val:.2f}",
                    numeric_value=price_val,
                    confidence=0.65,
                    match_start=m.start(),
                    match_end=m.end(),
                    pattern_used="currency_fallback",
                ))

    return matches


# ---------- Tax Declaration Matcher ----------

def match_tax_declaration(text: str) -> list[FieldMatch]:
    """Detect 'inclusive of all taxes' or equivalent phrasing."""
    matches: list[FieldMatch] = []

    patterns = [
        (r"(?i)incl(?:usive)?\.?\s*(?:of\s+)?all\s+taxes", 0.95),
        (r"(?i)including\s+all\s+taxes", 0.95),
        (r"(?i)all\s+taxes\s+incl(?:uded|\.)?", 0.90),
        (r"(?i)incl\.?\s*(?:of\s+)?(?:all\s+)?tax(?:es)?", 0.80),
    ]

    for pattern, conf in patterns:
        for m in re.finditer(pattern, text):
            matches.append(FieldMatch(
                field_id="tax_declaration",
                raw_match=m.group(0).strip(),
                value=m.group(0).strip(),
                confidence=conf,
                match_start=m.start(),
                match_end=m.end(),
                pattern_used="tax_declaration",
            ))

    return matches


# ---------- Net Quantity Matcher ----------

def match_net_quantity(text: str) -> list[FieldMatch]:
    """Extract net quantity declarations with value and unit.

    Patterns:
    - "Net Wt. 200g", "Net Qty: 500 ml", "Net Weight 1.5 kg"
    - Bare: "200g", "500ml" (lower confidence)
    """
    matches: list[FieldMatch] = []

    # Primary: with keyword
    keyword_pattern = (
        r"(?i)(?:Net\s*(?:Qty\.?|Quantity|Weight|Wt\.?|Vol\.?|Volume|Content(?:s)?)\s*)"
        r"[\s.:=\-]*"
        r"(?:(?:approx\.?|approximately)\s*)?"
        r"([\d]+(?:[.,]\d+)?)\s*"
        r"(kg|kgs|g|gm|gms|gram|grams|l|ltr|ltrs|litre|litres|liter|liters|ml|mL|m|cm|mm|units?|nos?\.?|pcs?\.?|pieces?|count|N)"
    )

    for m in re.finditer(keyword_pattern, text):
        val_str = m.group(1).replace(",", ".")
        unit_raw = m.group(2)
        try:
            val = float(val_str)
        except ValueError:
            continue

        norm_unit = normalize_unit(unit_raw)

        matches.append(FieldMatch(
            field_id="net_quantity",
            raw_match=m.group(0).strip(),
            value=f"{val}{norm_unit}",
            numeric_value=val,
            unit=norm_unit,
            confidence=0.95,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="net_qty_keyword",
            metadata={"grams_equivalent": to_grams_or_ml(val, unit_raw)},
        ))

    # Fallback: bare number + unit
    if not matches:
        bare_pattern = (
            r"(?<!\w)([\d]+(?:\.\d+)?)\s*"
            r"(kg|g|gm|gms|ml|mL|l|ltr|ltrs)\b"
        )
        for m in re.finditer(bare_pattern, text):
            val_str = m.group(1)
            unit_raw = m.group(2)
            try:
                val = float(val_str)
            except ValueError:
                continue

            # Filter out unreasonable values
            norm_unit = normalize_unit(unit_raw)
            grams = to_grams_or_ml(val, unit_raw)
            if grams is not None and (grams < 0.1 or grams > 100000):
                continue

            matches.append(FieldMatch(
                field_id="net_quantity",
                raw_match=m.group(0).strip(),
                value=f"{val}{norm_unit}",
                numeric_value=val,
                unit=norm_unit,
                confidence=0.60,
                match_start=m.start(),
                match_end=m.end(),
                pattern_used="bare_qty_fallback",
                metadata={"grams_equivalent": grams},
            ))

    return matches


# ---------- Date Matchers ----------

_MONTH_NAMES = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12",
    "january": "01", "february": "02", "march": "03", "april": "04",
    "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
}


def _normalize_date(date_str: str) -> Optional[str]:
    """Attempt to normalize a date string to YYYY-MM or YYYY-MM-DD format."""
    date_str = date_str.strip().strip(".")

    # DD/MM/YYYY or DD-MM-YYYY
    m = re.match(r"(\d{1,2})[/\-](\d{1,2})[/\-](20\d{2}|\d{2})", date_str)
    if m:
        day, month, year = m.group(1), m.group(2), m.group(3)
        if len(year) == 2:
            year = "20" + year
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

    # MM/YYYY or MM-YYYY
    m = re.match(r"(\d{1,2})[/\-](20\d{2}|\d{2})$", date_str)
    if m:
        month, year = m.group(1), m.group(2)
        if len(year) == 2:
            year = "20" + year
        return f"{year}-{month.zfill(2)}"

    # Mon YYYY or Month YYYY (e.g., "Jun 2026", "March 2026")
    m = re.match(r"([A-Za-z]+)[.,\s/\-]+(20\d{2}|\d{2})$", date_str)
    if m:
        month_name = m.group(1).lower()
        year = m.group(2)
        if len(year) == 2:
            year = "20" + year
        month_num = _MONTH_NAMES.get(month_name)
        if month_num:
            return f"{year}-{month_num}"

    return None


def match_manufacture_date(text: str) -> list[FieldMatch]:
    """Extract manufacturing/packing date declarations."""
    matches: list[FieldMatch] = []

    pattern = (
        r"(?i)(?:MFG|MFD|Mfg\.?\s*(?:Date|Dt\.?)?|Manufactured|PKD|Pkg\.?\s*(?:Date|Dt\.?)?"
        r"|Packed|Date\s*of\s*(?:Mfg|Manufacture|Manufacturing|Packing|Pkg|Package|Packaging|Import))"
        r"[\s.:=\-]*"
        r"([0-3]?\d[/\-][0-1]?\d[/\-](?:20)?\d{2}"
        r"|[0-1]?\d[/\-](?:20)?\d{2}"
        r"|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.,\s/\-]+(?:20)?\d{2})"
    )

    for m in re.finditer(pattern, text):
        date_raw = m.group(1).strip()
        normalized = _normalize_date(date_raw)

        matches.append(FieldMatch(
            field_id="date_manufacture",
            raw_match=m.group(0).strip(),
            value=date_raw,
            confidence=0.90,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="mfg_date",
            metadata={"normalized_date": normalized} if normalized else {},
        ))

    return matches


def match_expiry_date(text: str) -> list[FieldMatch]:
    """Extract best-before / use-by / expiry date declarations."""
    matches: list[FieldMatch] = []

    pattern = (
        r"(?i)(?:EXP|Expiry|Exp\.?\s*(?:Date|Dt\.?)?|Best\s*Before|Best\s*By|Use\s*(?:Before|By)|BB|B\.?B\.?)"
        r"[\s.:=\-]*"
        r"([0-3]?\d[/\-][0-1]?\d[/\-](?:20)?\d{2}"
        r"|[0-1]?\d[/\-](?:20)?\d{2}"
        r"|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.,\s/\-]+(?:20)?\d{2})"
    )

    for m in re.finditer(pattern, text):
        date_raw = m.group(1).strip()
        normalized = _normalize_date(date_raw)

        matches.append(FieldMatch(
            field_id="date_expiry",
            raw_match=m.group(0).strip(),
            value=date_raw,
            confidence=0.90,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="expiry_date",
            metadata={"normalized_date": normalized} if normalized else {},
        ))

    # Relative expiry fallback: "Best Before 9 months from Mfg"
    relative_pattern = (
        r"(?i)(?:Best\s*Before|BB|Shelf\s*Life)"
        r"[\s.:=\-]*"
        r"(\d+)\s*(months?|days?|years?|weeks?)"
        r"(?:\s*(?:from|of|after)\s*(?:Mfg|Manufacturing|Packing|Packaging|Manufacture))?"
    )

    for m in re.finditer(relative_pattern, text):
        matches.append(FieldMatch(
            field_id="date_expiry",
            raw_match=m.group(0).strip(),
            value=m.group(0).strip(),
            confidence=0.80,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="relative_expiry",
            metadata={"type": "relative", "duration": int(m.group(1)), "duration_unit": m.group(2)},
        ))

    return matches


# ---------- Date Fallback (Spatial Proximity) ----------

def find_unlabeled_dates(text: str) -> list[FieldMatch]:
    """Find date-like tokens that don't have an explicit keyword prefix.

    Used as a fallback when strict keyword-prefixed date matchers
    find nothing. Returns lower-confidence matches.
    """
    matches: list[FieldMatch] = []

    # Look for standalone date patterns
    date_patterns = [
        r"(\d{1,2}[/\-]\d{1,2}[/\-](?:20)?\d{2})",           # DD/MM/YYYY
        r"(\d{1,2}[/\-](?:20)?\d{2})",                         # MM/YYYY
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.,\s/\-]+(?:20)?\d{2})",  # Mon YYYY
    ]

    for pattern in date_patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            date_raw = m.group(1).strip()
            normalized = _normalize_date(date_raw)

            if normalized:
                matches.append(FieldMatch(
                    field_id="date_unlabeled",
                    raw_match=date_raw,
                    value=date_raw,
                    confidence=0.40,
                    match_start=m.start(),
                    match_end=m.end(),
                    pattern_used="unlabeled_date_fallback",
                    metadata={"normalized_date": normalized, "needs_classification": True},
                ))

    return matches


# ---------- Unit Sale Price Matcher ----------

def match_unit_sale_price(text: str) -> list[FieldMatch]:
    """Extract Unit Sale Price (USP) declarations."""
    matches: list[FieldMatch] = []

    pattern = (
        r"(?i)(?:USP|Unit\s*(?:Sale\s*)?Price|Price\s*per\s*(?:unit|kg|g|l|ml|m|piece))"
        r"[\s.:=\-]*"
        r"(?:₹|Rs\.?|INR)?\s*"
        r"([\d,]+(?:\.\d{1,2})?)\s*"
        r"(?:/|per)\s*"
        r"(kg|g|l|ml|m|unit|piece|100\s*g|100\s*ml)"
    )

    for m in re.finditer(pattern, text):
        price_str = m.group(1).replace(",", "")
        per_unit = m.group(2).strip()

        try:
            price_val = float(price_str)
        except ValueError:
            continue

        matches.append(FieldMatch(
            field_id="unit_sale_price",
            raw_match=m.group(0).strip(),
            value=f"₹{price_val:.2f}/{per_unit}",
            numeric_value=price_val,
            unit=per_unit,
            confidence=0.90,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="usp",
        ))

    return matches


# ---------- Batch / Lot Number Matcher ----------

def match_batch_number(text: str) -> list[FieldMatch]:
    """Extract batch/lot number declarations."""
    matches: list[FieldMatch] = []

    pattern = (
        r"(?i)(?:Batch|Lot|B\.?\s*No\.?|L\.?\s*No\.?|Code\s*No\.?|Batch\s*(?:No\.?|Number|#))"
        r"[\s.:=\-]*"
        r"([A-Za-z0-9][A-Za-z0-9\-/]{2,30})"
    )

    for m in re.finditer(pattern, text):
        matches.append(FieldMatch(
            field_id="batch_lot_number",
            raw_match=m.group(0).strip(),
            value=m.group(1).strip(),
            confidence=0.90,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="batch_number",
        ))

    return matches


# ---------- FSSAI License Matcher (Context-Aware Repair) ----------

VALID_INDIAN_STATE_CODES = {
    f"{i:02d}" for i in range(0, 38)
}


def repair_fssai_candidate(raw: str) -> Optional[str]:
    """Context-aware OCR character repair strictly for 14-digit FSSAI candidates.

    Replaces optical confusions only on candidate tokens:
    O/D/Q -> 0, I/l/|/! -> 1, S/s -> 5, Z/z -> 2, B -> 8
    """
    substitutions = {
        'O': '0', 'o': '0', 'D': '0', 'Q': '0',
        'I': '1', 'l': '1', '|': '1', '!': '1', 'i': '1',
        'S': '5', 's': '5',
        'Z': '2', 'z': '2',
        'B': '8',
    }
    repaired = list(raw)
    for idx, char in enumerate(repaired):
        if char in substitutions:
            repaired[idx] = substitutions[char]

    repaired_str = "".join(repaired)
    if repaired_str.isdigit() and len(repaired_str) == 14:
        # Validate statutory 1-2-2-3-6 structure
        license_type = repaired_str[0]
        state_code = repaired_str[1:3]
        if license_type in ('1', '2', '3') and state_code in VALID_INDIAN_STATE_CODES:
            return repaired_str
    return None


def match_fssai_license(text: str) -> list[FieldMatch]:
    """Extract and validate 14-digit FSSAI statutory license number.

    Format: [1: Type (1/2/3)] [2: State (01-37)] [2: Year] [3: Category] [6: Serial]
    Applies context-aware OCR repair to smudged candidate tokens.
    """
    matches: list[FieldMatch] = []

    # 1. Matches with explicit FSSAI / License keywords
    keyword_pattern = (
        r"(?i)(?:FSSAI|Lic\.?\s*(?:No\.?|Number)|License\s*No\.?|FSSAI\s*(?:Lic\.?)?\s*(?:No\.?)?)"
        r"[\s.:=\-]*"
        r"([A-Za-z0-9\-/|!]{10,20})"
    )

    for m in re.finditer(keyword_pattern, text):
        candidate_raw = re.sub(r"[\s\-./]", "", m.group(1).strip())
        
        # Check if already clean 14-digit valid syntax
        if candidate_raw.isdigit() and len(candidate_raw) == 14:
            is_valid_structure = (
                candidate_raw[0] in ('1', '2', '3') and
                candidate_raw[1:3] in VALID_INDIAN_STATE_CODES
            )
            confidence = 0.96 if is_valid_structure else 0.85
            matches.append(FieldMatch(
                field_id="fssai_license",
                raw_match=m.group(0).strip(),
                value=candidate_raw,
                confidence=confidence,
                match_start=m.start(),
                match_end=m.end(),
                pattern_used="fssai_keyword_valid",
                metadata={"repaired": False, "is_valid_structure": is_valid_structure},
            ))
            continue

        # Try context-aware OCR repair on 14-character alphanumeric string
        if len(candidate_raw) == 14:
            repaired_val = repair_fssai_candidate(candidate_raw)
            if repaired_val:
                matches.append(FieldMatch(
                    field_id="fssai_license",
                    raw_match=m.group(0).strip(),
                    value=repaired_val,
                    confidence=0.78,
                    match_start=m.start(),
                    match_end=m.end(),
                    pattern_used="fssai_ocr_repaired",
                    metadata={
                        "repaired": True,
                        "original_raw": candidate_raw,
                        "requires_manual_review": True,
                        "is_valid_structure": True,
                    },
                ))

    # 2. Standalone fallback: exact 14-digit sequence
    if not matches:
        for m in re.finditer(r"(?<!\d)(\d{14})(?!\d)", text):
            cand = m.group(1)
            is_valid = cand[0] in ('1', '2', '3') and cand[1:3] in VALID_INDIAN_STATE_CODES
            if is_valid:
                matches.append(FieldMatch(
                    field_id="fssai_license",
                    raw_match=m.group(0),
                    value=cand,
                    confidence=0.70,
                    match_start=m.start(),
                    match_end=m.end(),
                    pattern_used="fssai_14digit_valid_fallback",
                    metadata={"repaired": False, "is_valid_structure": True},
                ))

    return matches


# ---------- Multi-Price Contradiction Detector (Rule 11(2)(c)) ----------

def detect_multi_price_contradictions(text: str, mrp_matches: list[FieldMatch]) -> Optional[dict]:
    """Detect conflicting price declarations (e.g. sticker price vs original printed price).

    Statutory basis: LMPC Rule 11(2)(c) & Legal Metrology Act Sec 36 (Price Alteration).
    """
    if not mrp_matches or len(mrp_matches) < 2:
        return None

    numeric_prices = [m.numeric_value for m in mrp_matches if m.numeric_value is not None]
    distinct_prices = sorted(list(set(numeric_prices)), reverse=True)

    if len(distinct_prices) >= 2:
        # Check if the price difference is non-trivial (e.g. >= 1 rupee)
        max_price = distinct_prices[0]
        min_price = distinct_prices[-1]
        if max_price - min_price >= 1.0:
            return {
                "has_contradiction": True,
                "highest_price": max_price,
                "lowest_price": min_price,
                "all_prices": distinct_prices,
                "price_count": len(distinct_prices),
                "discrepancy_amount": max_price - min_price,
            }
    return None


# ---------- Country of Origin Matcher ----------

def match_country_of_origin(text: str) -> list[FieldMatch]:
    """Extract country of origin declarations."""
    matches: list[FieldMatch] = []

    pattern = (
        r"(?i)(?:Country\s*of\s*Origin|Made\s*in|Product\s*of|Produced\s*in|Origin\s*:?)"
        r"[\s.:=\-]*"
        r"([A-Z][A-Za-z\s]{2,30})"
    )

    for m in re.finditer(pattern, text):
        country = m.group(1).strip().rstrip(".,;:")
        # Filter out common false positives
        if country.lower() in ["the", "a", "an", "and", "or", "for", "by"]:
            continue

        matches.append(FieldMatch(
            field_id="country_of_origin",
            raw_match=m.group(0).strip(),
            value=country,
            confidence=0.88,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="country_of_origin",
        ))

    return matches


# ---------- Manufacturer / Packer Keyword Matcher ----------

def match_manufacturer_keywords(text: str) -> list[FieldMatch]:
    """Detect manufacturer/packer/importer section headers.

    Extracts the text immediately following the keyword. Full address
    parsing is handled by the NER extractor — this just identifies
    the section boundary.
    """
    matches: list[FieldMatch] = []

    pattern = (
        r"(?i)(Mfg\.?\s*(?:by|at)?|Manufactured\s*(?:by|at)"
        r"|Packed\s*(?:by|at)|Packer"
        r"|Marketed\s*(?:by|at)"
        r"|Imported\s*(?:by|at)|Importer)"
        r"[\s.:=\-]*"
        r"(.{5,200}?)(?=\n|\r|MRP|Net\s*(?:Wt|Qty)|Best\s*Before|Exp|$)"
    )

    for m in re.finditer(pattern, text, re.DOTALL):
        keyword = m.group(1).strip()
        entity_text = m.group(2).strip()

        # Determine type
        mfr_type = "manufacturer"
        kw_lower = keyword.lower()
        if "import" in kw_lower:
            mfr_type = "importer"
        elif "pack" in kw_lower:
            mfr_type = "packer"
        elif "market" in kw_lower:
            mfr_type = "marketer"

        matches.append(FieldMatch(
            field_id="manufacturer_info",
            raw_match=m.group(0).strip(),
            value=entity_text,
            confidence=0.75,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="manufacturer_keyword",
            metadata={"type": mfr_type, "keyword": keyword},
        ))

    return matches


# ---------- Run All Matchers ----------

def run_all_matchers(text: str) -> dict[str, list[FieldMatch]]:
    """Execute all regex matchers against the input text.

    Returns:
        Dictionary mapping field_id → list of FieldMatch objects.
    """
    results: dict[str, list[FieldMatch]] = {}

    matcher_funcs = [
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
    ]

    for func in matcher_funcs:
        matches = func(text)
        for match in matches:
            if match.field_id not in results:
                results[match.field_id] = []
            results[match.field_id].append(match)

    # Also run unlabeled date fallback if no keyword dates were found
    if "date_manufacture" not in results and "date_expiry" not in results:
        unlabeled = find_unlabeled_dates(text)
        if unlabeled:
            results["date_unlabeled"] = unlabeled

    return results
