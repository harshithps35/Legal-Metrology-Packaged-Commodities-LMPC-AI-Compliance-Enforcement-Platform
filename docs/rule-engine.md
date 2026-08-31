# Rule Engine — Legal Metrology (Packaged Commodities) Rules, 2011

## Overview

The LMPC Rule Engine is a machine-readable, codified implementation of the statutory rules prescribed under the **Legal Metrology (Packaged Commodities) Rules, 2011** and the **Legal Metrology Act, 2009**. Each rule is evaluated programmatically against OCR-extracted label data and font measurement outputs.

---

## Severity Classification

| Severity | Description | Field Visit | Example |
|----------|-------------|-------------|---------|
| **Advisory** | Non-critical formatting issue | ❌ Not required | Minor character proportion deviation |
| **Major** | Statutory declaration violation | ⚠️ May be required | Font height below Schedule II minimum |
| **Critical** | Fraud / tampering / missing mandatory fields | ✅ Mandatory | Rule 11 price sticker tampering, missing MRP |

---

## Rule 6 — Mandatory Declarations

Every pre-packaged commodity must display the following declarations on the principal display panel (PDP):

### Rule 6(1) Declaration Matrix

| Sub-Rule | Declaration | Required Field | Validation Logic |
|----------|-------------|----------------|------------------|
| 6(1)(a) | **Name & Address** of manufacturer/packer/importer | `manufacturer_name`, `manufacturer_address` | NER entity extraction + address pattern match |
| 6(1)(b) | **Common or generic name** of commodity | `commodity_name` | Must be present and non-empty |
| 6(1)(c) | **Net quantity** by weight, measure, or number | `net_quantity`, `unit` | Regex extraction + metric unit validation (g, kg, ml, L) |
| 6(1)(d) | **Maximum Retail Price** inclusive of all taxes | `mrp`, `inclusive_of_taxes` | Price extraction + "inclusive of all taxes" phrase detection |
| 6(1)(e) | **Month and year** of manufacture/packing | `mfg_date` | Date pattern extraction (MM/YYYY or MMM-YYYY) |
| 6(1)(f) | **Best before / Use by** date | `expiry_date` | Date extraction + validity check |
| 6(1)(g) | **Customer care** details | `consumer_care_info` | Phone/email/address pattern detection |
| 6(1)(h) | **Unit sale price** (price per standard unit) | `unit_price` | Mathematical verification: USP = MRP / net_quantity |

### USP Calculation (Rule 6(1)(h))

The Unit Sale Price must be mathematically correct:

```
For weight-based products:
  USP = MRP / Net_Quantity_in_grams × 1000    (price per kg)

For volume-based products:
  USP = MRP / Net_Quantity_in_ml × 1000       (price per litre)

For count-based products:
  USP = MRP / Count                            (price per unit)
```

**Tolerance:** ±2% rounding tolerance allowed.

---

## Rule 11 — Price Tampering Detection

Rule 11 prohibits any alteration, obliteration, or overwriting of the declared Maximum Retail Price.

### Detection Methods

| Check | Technique | Severity |
|-------|-----------|----------|
| **Dual MRP stickers** | OCR detects multiple distinct price values on the same panel | Critical |
| **Overwritten digits** | OpenCV edge detection identifies digit overwriting artifacts | Critical |
| **Removed/smudged text** | Histogram analysis detects deliberate ink removal zones | Critical |
| **Missing "inclusive of all taxes"** | NLP phrase matcher validates tax declaration presence | Major |

---

## Schedule II — Font Height Requirements

The minimum height of numerals and letters on a packaged commodity depends on the **principal display panel (PDP) area**.

### Minimum Font Height Thresholds

| PDP Surface Area (cm²) | Minimum Numeral Height (mm) |
|---|---|
| ≤ 25 cm² | 1.0 mm |
| > 25 cm² and ≤ 100 cm² | 2.0 mm |
| > 100 cm² and ≤ 500 cm² | 4.0 mm |
| > 500 cm² and ≤ 2500 cm² | 6.0 mm |
| > 2500 cm² | 8.0 mm |

### Font Height Calculation Pipeline

```
1. Input: Product image (from camera or pre-press artwork)
2. OpenCV CLAHE → enhance contrast, remove glare artifacts
3. Tesseract HOCR → extract bounding boxes for each character
4. Calculate character height in pixels from bounding box
5. Apply DPI calibration factor → convert pixels to mm
6. Compare against Schedule II threshold for declared PDP area
7. Output: PASS / FAIL with measured vs. required height
```

### Calibration Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Relative** | Ratio-based estimation from known reference objects | Default for smartphone captures |
| **Absolute** | Exact DPI from scanner/printer metadata | Pre-press artwork PDFs |
| **Manual** | Inspector inputs physical caliper reading | On-site field verification |

---

## Rule 27 — Manufacturer / Importer Registration

Every manufacturer, packer, or importer of pre-packaged commodities must be registered with the Legal Metrology authority.

### Validation

| Check | Method |
|-------|--------|
| Registration number present | Pattern match: `LM/[STATE]/[YEAR]/[NUMBER]` |
| Valid FSSAI license (food items) | 14-digit FSSAI number validation |
| Import license (imported goods) | IEC code cross-reference |

---

## Verdict Output Format

The Rule Engine produces a structured verdict for each product:

```json
{
  "product_id": 42,
  "overall_verdict": "NON_COMPLIANT",
  "confidence_score": 87.5,
  "violations": [
    {
      "rule": "Rule 6(1)(d)",
      "severity": "CRITICAL",
      "field": "mrp",
      "expected": "MRP with 'inclusive of all taxes'",
      "found": "MRP: Rs. 120 (no tax declaration)",
      "recommendation": "Add 'inclusive of all taxes' after MRP declaration"
    }
  ],
  "compliant_rules": ["Rule 6(1)(a)", "Rule 6(1)(b)", "Rule 6(1)(c)", "Schedule II"],
  "sha256_hash": "a3f8c9d2e1b7f6..."
}
```
