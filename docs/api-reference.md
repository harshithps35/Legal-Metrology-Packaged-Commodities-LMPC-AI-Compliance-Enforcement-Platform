# REST API Reference — LMPC Compliance Platform

Base URL: `http://localhost:8000`  
Interactive Docs: `http://localhost:8000/docs` (Swagger UI)

---

## Authentication

All endpoints (except login) require a JWT Bearer token in the `Authorization` header.

### POST `/api/auth/login`
Authenticate a user and receive a JWT access token.

**Request Body:**
```json
{
  "username": "inspector_delhi",
  "password": "inspector123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 4,
    "username": "INSP-DEL-042",
    "role": "inspector",
    "full_name": "Lead Inspector — Delhi Zone"
  }
}
```

---

## Product Submission & Scanning

### POST `/api/scan/upload`
Upload a product label image for automated OCR and compliance analysis.

**Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Product label image (JPEG/PNG, max 20MB) |
| `product_name` | string | Name of the packaged commodity |
| `brand_name` | string | Manufacturer / brand name |

**Response (200):**
```json
{
  "product_id": 42,
  "ocr_text": "Net Qty: 500g | MRP: Rs. 120 inclusive of all taxes...",
  "compliance_status": "NON_COMPLIANT",
  "violations": [
    {
      "rule": "Rule 6(1)(a)",
      "field": "manufacturer_address",
      "severity": "CRITICAL",
      "description": "Manufacturer address not found on label"
    },
    {
      "rule": "Schedule II",
      "field": "font_height",
      "severity": "MAJOR",
      "description": "Numeral height 1.5mm is below minimum 2.0mm for PDP area 50cm²"
    }
  ],
  "confidence_score": 87.5
}
```

### GET `/api/products`
List all submitted products with pagination.

**Query Parameters:** `page` (int), `per_page` (int), `status` (string)

### GET `/api/products/{product_id}`
Get detailed product information including OCR results and compliance history.

---

## Field Visits

### POST `/api/field-visits/assign`
Lead Inspector dispatches a field visit to Sub-Inspector squad.

**Request Body:**
```json
{
  "product_id": 42,
  "sub_inspector_id": 5,
  "justification": "Rule 11 price tampering suspected — physical verification required",
  "visit_type": "FACTORY_AUDIT"
}
```

### POST `/api/field-visits/{visit_id}/report`
Sub-Inspector submits Visit Inspection Report (VIR) with GPS evidence.

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `photos[]` | File[] | GPS-tagged inspection photos |
| `caliper_reading_mm` | float | Physical numeral height measurement |
| `gps_latitude` | float | Inspection site latitude |
| `gps_longitude` | float | Inspection site longitude |
| `observations` | string | Inspector's field notes |
| `verdict` | string | `COMPLIANT` or `NON_COMPLIANT` |

---

## Resolution Desk (15-Day SLA)

### POST `/api/resolution/issue-notice`
Issue a 15-day statutory deficiency notice to the Brand Owner.

### POST `/api/resolution/{notice_id}/rectify`
Brand Owner uploads corrective artwork and NABL lab reports.

### POST `/api/resolution/{notice_id}/verify`
Sub-Inspector verifies the corrected proofs.

---

## Reports & Certificates

### GET `/api/reports/{product_id}/pdf`
Download the compliance inspection report as a PDF with vector seal.

### GET `/api/reports/{product_id}/docx`
Download the statutory dossier in editable DOCX format.

### GET `/api/reports/{product_id}/xlsx`
Download the quality assurance audit matrix in Excel format.

### GET `/api/verify/{certificate_number}`
Public QR code verification endpoint — validates the SHA-256 sealed certificate.

**Response (200):**
```json
{
  "valid": true,
  "certificate_number": "LMPC-2026-DEL-00042",
  "product_name": "Parle-G Gold Biscuits 500g",
  "issued_by": "CLMO Delhi",
  "issued_date": "2026-08-15",
  "sha256_seal": "a3f8c9d2e1b7..."
}
```

---

## Dashboard & Analytics

### GET `/api/dashboard/stats`
Returns KPI metrics for the authenticated user's role.

**Response (200):**
```json
{
  "total_products": 156,
  "compliant": 98,
  "non_compliant": 42,
  "pending_review": 16,
  "active_field_visits": 7,
  "overdue_notices": 3
}
```

---

## Error Responses

All errors follow a standard format:
```json
{
  "detail": "Product not found",
  "status_code": 404
}
```

| Code | Description |
|------|-------------|
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — missing or invalid JWT |
| 403 | Forbidden — insufficient role permissions |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |
