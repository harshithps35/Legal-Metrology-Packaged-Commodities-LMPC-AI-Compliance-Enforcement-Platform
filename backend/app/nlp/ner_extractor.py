"""
LMPC Compliance System — NER-Based Entity Extractor

Uses spaCy Named Entity Recognition and rule-based patterns to extract
semi-structured fields that regex alone can't reliably capture:
- Manufacturer / Packer / Importer name and address
- Consumer care details (phone, email, name, address)
- Commodity / product name

Also provides phone number and email extraction via regex patterns
that are better expressed as standalone utility functions.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional

from app.nlp.regex_matchers import FieldMatch

logger = logging.getLogger(__name__)

# Try to load spaCy — graceful fallback if not installed
try:
    import spacy
    _NLP_MODEL: Optional[spacy.language.Language] = None
except ImportError:
    spacy = None  # type: ignore[assignment]
    _NLP_MODEL = None


def _get_nlp() -> Optional["spacy.language.Language"]:
    """Lazy-load the spaCy model (singleton)."""
    global _NLP_MODEL

    if spacy is None:
        logger.warning("spaCy not installed — NER extraction disabled")
        return None

    if _NLP_MODEL is None:
        try:
            _NLP_MODEL = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning(
                "spaCy model 'en_core_web_sm' not found. "
                "Install with: python -m spacy download en_core_web_sm"
            )
            return None

    return _NLP_MODEL


# ---------- Phone Number Extractor ----------

# Indian phone number patterns
_PHONE_PATTERNS = [
    # Toll-free: 1800-XXX-XXXX
    r"(?:1800[\s\-]?\d{3}[\s\-]?\d{4})",
    # +91 XXXXX XXXXX
    r"(?:\+91[\s\-]?\d{5}[\s\-]?\d{5})",
    # 0XX-XXXXXXXX (landline with STD code)
    r"(?:0\d{2,4}[\s\-]?\d{6,8})",
    # 10-digit mobile
    r"(?:(?<!\d)[6-9]\d{9}(?!\d))",
]

_PHONE_REGEX = re.compile("|".join(f"({p})" for p in _PHONE_PATTERNS))


def extract_phone_numbers(text: str) -> list[str]:
    """Extract Indian phone numbers from text."""
    phones = []
    for m in _PHONE_REGEX.finditer(text):
        phone = m.group(0).strip()
        # Normalize: remove extra spaces/dashes for storage
        normalized = re.sub(r"[\s\-]+", "", phone)
        if len(normalized) >= 10:
            phones.append(phone)
    return phones


# ---------- Email Extractor ----------

_EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)


def extract_emails(text: str) -> list[str]:
    """Extract email addresses from text."""
    return [m.group(0) for m in _EMAIL_REGEX.finditer(text)]


# ---------- Consumer Care Section Detector ----------

_CONSUMER_CARE_TRIGGERS = [
    r"(?i)consumer\s*(?:care|helpline|complaint|grievance|service)",
    r"(?i)customer\s*(?:care|service|support|helpline)",
    r"(?i)toll\s*free",
    r"(?i)helpline",
    r"(?i)(?:for\s*)?feedback",
    r"(?i)grievance",
    r"(?i)contact\s*(?:us|details?|info)",
    r"(?i)for\s*(?:any\s*)?(?:complaint|query|queries|enquir)",
]


def detect_consumer_care_section(text: str) -> Optional[tuple[int, int, str]]:
    """Detect the consumer care section in the text.

    Returns:
        Tuple of (start_index, end_index, matched_section_text), or None.
    """
    for trigger in _CONSUMER_CARE_TRIGGERS:
        m = re.search(trigger, text)
        if m:
            # Capture up to 300 chars after the trigger (typically contains
            # phone, email, and address for consumer care)
            section_start = m.start()
            section_end = min(m.end() + 300, len(text))

            # Try to find a natural boundary (double newline or next section header)
            remaining = text[m.end():section_end]
            boundary_match = re.search(
                r"\n\s*\n|(?:MRP|Net\s*(?:Wt|Qty)|Mfg|Best\s*Before|Ingredients)",
                remaining,
                re.IGNORECASE,
            )
            if boundary_match:
                section_end = m.end() + boundary_match.start()

            section_text = text[section_start:section_end].strip()
            return (section_start, section_end, section_text)

    return None


def extract_consumer_care(text: str) -> Optional[FieldMatch]:
    """Extract consumer care details: section text, phone numbers, and emails.

    Combines trigger detection with phone/email extraction within the
    detected section.
    """
    section = detect_consumer_care_section(text)

    if section is None:
        # Even without a section header, look for phone + email anywhere
        phones = extract_phone_numbers(text)
        emails = extract_emails(text)

        if phones or emails:
            return FieldMatch(
                field_id="consumer_care",
                raw_match="(no section header found)",
                value="Contact info found without explicit section",
                confidence=0.40,
                match_start=0,
                match_end=0,
                pattern_used="no_header_fallback",
                metadata={
                    "phones": phones,
                    "emails": emails,
                    "has_section_header": False,
                },
            )
        return None

    start, end, section_text = section

    # Extract phone and email from within the section
    phones = extract_phone_numbers(section_text)
    emails = extract_emails(section_text)

    # Confidence is higher if we found both a header AND contact details
    conf = 0.60
    if phones or emails:
        conf = 0.90
    if phones and emails:
        conf = 0.95

    return FieldMatch(
        field_id="consumer_care",
        raw_match=section_text,
        value=section_text,
        confidence=conf,
        match_start=start,
        match_end=end,
        pattern_used="consumer_care_section",
        metadata={
            "phones": phones,
            "emails": emails,
            "has_section_header": True,
        },
    )


# ---------- spaCy NER Entity Extraction ----------

@dataclass
class NEREntity:
    """An entity extracted by spaCy NER."""
    text: str
    label: str   # ORG, GPE, LOC, PERSON, etc.
    start: int
    end: int


def extract_ner_entities(text: str) -> list[NEREntity]:
    """Run spaCy NER and return all detected entities."""
    nlp = _get_nlp()
    if nlp is None:
        return []

    doc = nlp(text)

    entities = []
    for ent in doc.ents:
        entities.append(NEREntity(
            text=ent.text,
            label=ent.label_,
            start=ent.start_char,
            end=ent.end_char,
        ))

    return entities


def extract_manufacturer_via_ner(
    text: str,
    section_text: Optional[str] = None,
) -> Optional[FieldMatch]:
    """Use spaCy NER to extract manufacturer/packer organization and address.

    If section_text is provided (from regex keyword matching), NER runs
    only on that section for better accuracy. Otherwise, searches the
    full text for ORG + GPE entities.
    """
    target_text = section_text or text
    entities = extract_ner_entities(target_text)

    if not entities:
        return None

    orgs = [e for e in entities if e.label in ("ORG", "PRODUCT")]
    locations = [e for e in entities if e.label in ("GPE", "LOC")]

    if not orgs and not locations:
        return None

    org_names = [e.text for e in orgs]
    loc_names = [e.text for e in locations]

    # Build a combined value
    parts = []
    if org_names:
        parts.append(org_names[0])
    if loc_names:
        parts.append(", ".join(loc_names))

    value = " — ".join(parts) if parts else target_text[:100]

    conf = 0.50
    if orgs and locations:
        conf = 0.80
    if section_text:
        conf += 0.10  # Higher confidence when we're in the right section

    return FieldMatch(
        field_id="manufacturer_info",
        raw_match=target_text[:200],
        value=value,
        confidence=min(conf, 0.95),
        match_start=0,
        match_end=len(target_text),
        pattern_used="spacy_ner",
        metadata={
            "organizations": org_names,
            "locations": loc_names,
            "all_entities": [{"text": e.text, "label": e.label} for e in entities],
        },
    )


# ---------- Commodity Name Extractor ----------

def extract_commodity_name(text: str, lines: Optional[list[str]] = None) -> Optional[FieldMatch]:
    """Attempt to identify the commodity/product generic name.

    Strategy:
    1. Look for explicit "Product:" or "Contents:" labels
    2. Use spaCy NER PRODUCT entities
    3. Heuristic: first few prominent lines often contain the product name

    This is the least reliable extraction — often needs manual review.
    """
    # Strategy 1: Explicit label or keyword match
    pattern = r"(?i)(?:Product|Contents?|Item|Commodity)\s*[:.\-=]\s*(.{3,100})"
    m = re.search(pattern, text)
    if m:
        return FieldMatch(
            field_id="commodity_name",
            raw_match=m.group(0).strip(),
            value=m.group(1).strip(),
            confidence=0.85,
            match_start=m.start(),
            match_end=m.end(),
            pattern_used="commodity_keyword",
        )

    # Strategy 1b: Common packaged commodity keywords
    common_commodities = (
        r"(?i)\b(Lip\s*Care|Lip\s*Balm|Face\s*Wash|Face\s*Cream|Body\s*Lotion|Hair\s*Oil|"
        r"Biscuits?|Glucose\s*Biscuits|Cookies?|Potato\s*Chips|Chips|Namkeen|Snacks?|"
        r"Toothpaste|Shampoo|Conditioner|Soap|Bathing\s*Bar|Detergent\s*Powder|Dishwash|"
        r"Fruit\s*Juice|Mango\s*Drink|Nectar|Soft\s*Drink|Atta|Wheat\s*Flour|Basmati\s*Rice)\b"
    )
    m_comm = re.search(common_commodities, text)
    if m_comm:
        return FieldMatch(
            field_id="commodity_name",
            raw_match=m_comm.group(0).strip(),
            value=m_comm.group(0).strip(),
            confidence=0.80,
            match_start=m_comm.start(),
            match_end=m_comm.end(),
            pattern_used="commodity_dictionary",
        )

    # Strategy 2: spaCy PRODUCT entities
    entities = extract_ner_entities(text)
    products = [e for e in entities if e.label == "PRODUCT"]
    if products:
        prod = products[0]
        return FieldMatch(
            field_id="commodity_name",
            raw_match=prod.text,
            value=prod.text,
            confidence=0.60,
            match_start=prod.start,
            match_end=prod.end,
            pattern_used="spacy_product",
        )

    # Strategy 3: Heuristic — first non-trivial line
    if lines:
        for line in lines[:5]:
            stripped = line.strip()
            # Skip lines that are clearly other fields or gibberish
            if re.match(r"(?i)^(MRP|Net|Mfg|Exp|Best|FSSAI|Batch|₹|Rs|r\s*comp)", stripped):
                continue
            if len(stripped) > 3 and len(stripped) < 80:
                return FieldMatch(
                    field_id="commodity_name",
                    raw_match=stripped,
                    value=stripped,
                    confidence=0.40,
                    match_start=0,
                    match_end=len(stripped),
                    pattern_used="first_line_heuristic",
                )

    return None


# ---------- Run All NER Extractors ----------

def run_all_ner_extractors(
    text: str,
    lines: Optional[list[str]] = None,
    manufacturer_section: Optional[str] = None,
) -> dict[str, list[FieldMatch]]:
    """Execute all NER-based extractors.

    Args:
        text: Full OCR text.
        lines: List of text lines (for commodity name heuristic).
        manufacturer_section: Pre-identified manufacturer section text
                              from regex keyword matching.

    Returns:
        Dictionary mapping field_id → list of FieldMatch objects.
    """
    results: dict[str, list[FieldMatch]] = {}

    # Consumer care
    cc = extract_consumer_care(text)
    if cc:
        results["consumer_care"] = [cc]

    # Manufacturer via NER (supplements regex keyword match)
    mfr = extract_manufacturer_via_ner(text, section_text=manufacturer_section)
    if mfr:
        if "manufacturer_info" not in results:
            results["manufacturer_info"] = []
        results["manufacturer_info"].append(mfr)

    # Commodity name
    cn = extract_commodity_name(text, lines=lines)
    if cn:
        results["commodity_name"] = [cn]

    return results
