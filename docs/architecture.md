# System Architecture — LMPC AI Compliance & Enforcement Platform

## Overview

The LMPC Compliance Platform is a multi-tier, role-segregated digital governance system built to automate statutory label verification under the **Legal Metrology (Packaged Commodities) Rules, 2011**. The architecture enforces strict separation of concerns across 6 governance tiers, ensuring no single authority can self-sanction clearances.

---

## High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19 + Vite)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Consumer  │ │ Employer │ │   Sub-   │ │   Lead   │ │ ALMO /   │  │
│  │ Portal    │ │ Portal   │ │Inspector │ │Inspector │ │ CLMO     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       └────────────┬┴───────────┬┴────────────┬┴───────────┘        │
│                    │  JWT Auth  │  REST API   │                      │
└────────────────────┼────────────┼─────────────┼──────────────────────┘
                     │            │             │
┌────────────────────┼────────────┼─────────────┼──────────────────────┐
│                   BACKEND (FastAPI + Pydantic v2)                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    API Gateway & JWT RBAC                     │   │
│  ├──────────┬──────────┬──────────┬──────────┬─────────────────┤   │
│  │ Auth     │ Products │  Scan &  │  Field   │  Reports &      │   │
│  │ Routes   │ Routes   │  OCR     │  Visits  │  Certificates   │   │
│  └──────────┴──────────┴────┬─────┴──────────┴─────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────┼──────────────────────────────────┐   │
│  │              AI & COMPLIANCE ENGINE                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │   │
│  │  │ OpenCV   │ │Tesseract │ │ spaCy    │ │  LMPC Rule     │  │   │
│  │  │ CLAHE +  │→│ HOCR +   │→│ NER +    │→│  Engine        │  │   │
│  │  │ Deskew   │ │ EasyOCR  │ │ Matchers │ │  (Rules 6,11,  │  │   │
│  │  │          │ │          │ │          │ │  27, Sched. II) │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   PERSISTENCE LAYER                           │   │
│  │  SQLite / PostgreSQL  │  File Storage (uploads/)              │   │
│  │  ReportLab PDF Gen    │  python-docx DOCX Gen                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 6-Tier Governance Hierarchy

| Tier | Role | Authority | Portal |
|------|------|-----------|--------|
| **L6** | State Commissioner | Apex oversight, statewide revocations | `/commissioner` |
| **L5** | CLMO (Chief Legal Metrology Officer) | Final adjudication, certificate issuance | `/clmo` |
| **L4** | ALMO (Asst. Legal Metrology Officer) | Visit sanctioning, endorsements | `/almo` |
| **L3** | Lead Inspector (LMI) | Triage desk, field visit dispatch | `/inspector` |
| **L2** | Sub-Inspector Squad | On-site inspections, VIR logging | `/sub-inspector` |
| **L1** | Brand Owner / Employer | Pre-market submissions, rectifications | `/employer` |

---

## SHA-256 Chain of Custody

Every state transition in the compliance lifecycle generates an immutable **SHA-256 hash** of the action payload (actor, timestamp, evidence, verdict). This creates a tamper-proof digital chain of custody from initial submission through to final certificate issuance.

```
Hash(n) = SHA-256( Hash(n-1) || action_payload || timestamp || actor_id )
```

This enables:
- **Forensic auditability** of every decision in the compliance pipeline.
- **Tamper detection** — any modification to intermediate records breaks the hash chain.
- **Legal admissibility** — digitally sealed evidence meets Indian Evidence Act requirements.

### 🛡️ End-to-End Cryptographic Security Pipeline

```mermaid
flowchart TD
    classDef secNode fill:#0F172A,stroke:#38BDF8,stroke-width:2px,color:#F8FAFC;
    classDef sealNode fill:#064E3B,stroke:#34D399,stroke-width:2.5px,color:#ECFDF5;

    A["🌐 1. Transport Security<br/><b>HTTPS / TLS 1.3</b> Encrypted Transit"]:::secNode
    B["🔑 2. Stateless Authentication<br/><b>JWT Bearer Tokens</b> (HS256)"]:::secNode
    C["👥 3. Directorate Authorization<br/><b>6-Tier Scoped RBAC</b> (L1 to L6)"]:::secNode
    D["🔒 4. Forensic Integrity<br/><b>SHA-256 Digest Chaining</b>"]:::secNode
    E["📋 5. Legal Admissibility<br/><b>Immutable Audit Log</b> (Indian Evidence Act)"]:::secNode
    F["📜 6. Public Seal &amp; Trust<br/><b>Dynamic QR Clearance Verification</b> (/verify/:cert_number)"]:::sealNode

    A --> B --> C --> D --> E --> F
```

---

## Security Architecture

| Layer | Implementation |
|-------|----------------|
| **Authentication** | JWT tokens (HS256), session-based refresh |
| **Authorization** | Role-based access control (RBAC) with 6 tiers |
| **Encryption at Rest** | AES-256 for sensitive database fields |
| **Encryption in Transit** | TLS 1.3 (HTTPS) |
| **File Upload Security** | MIME type validation, size limits, sandboxed storage |
| **Audit Logging** | SHA-256 chained event log for all state transitions |

---

## Database Schema & Entity-Relationship (ER) Model

The database enforces referential integrity across users, products, automated OCR scans, statutory violations, field visits, and digitally sealed certificates:

```mermaid
erDiagram
    USERS ||--o{ SCANS : "conducts / uploads"
    USERS ||--o{ WORK_ASSIGNMENTS : "assigned_to"
    USERS ||--o{ FIELD_VISIT_ORDERS : "dispatches / executes"
    USERS ||--o{ PRE_MARKET_APPLICATIONS : "submits"

    PRODUCTS ||--o{ SCANS : "subject_to"
    PRODUCTS ||--o{ PRE_MARKET_APPLICATIONS : "dossier_for"
    PRODUCTS ||--o{ FIELD_VISIT_ORDERS : "inspected_in"

    SCANS ||--o{ EXTRACTED_FIELDS : "identifies"
    SCANS ||--o{ VIOLATIONS : "flags"
    SCANS ||--o{ EVIDENCE_FILES : "contains"
    SCANS ||--o{ AUDIT_EVENTS : "generates_hashes"

    FIELD_VISIT_ORDERS ||--o{ EVIDENCE_FILES : "attaches_caliper_photos"
    FIELD_VISIT_ORDERS ||--o{ RESOLUTION_CASES : "resolves"

    PRE_MARKET_APPLICATIONS ||--o{ CERTIFICATES : "results_in"
    CERTIFICATES ||--o{ AUDIT_EVENTS : "seals_with_sha256"

    USERS {
        int id PK
        string username UK
        string unique_login_id UK
        string email UK
        string role "state_commissioner, clmo, almo, inspector, sub_inspector, employer"
        int hierarchy_level "1 to 6"
        string jurisdiction_zone
        datetime created_at
    }

    PRODUCTS {
        int id PK
        string name
        string brand
        string category "food, cosmetics, electronics, general"
        string gtin_barcode
        float declared_mrp
        float net_quantity
        string net_quantity_unit
    }

    SCANS {
        int id PK
        int product_id FK
        int user_id FK
        string status "COMPLIANT, NON_COMPLIANT, REQUIRES_REVIEW"
        float compliance_score "0 to 100"
        float pdp_area_sq_cm
        float min_required_font_mm
        string client_evidence_hash "SHA-256"
        float latitude
        float longitude
        datetime created_at
    }

    EXTRACTED_FIELDS {
        int id PK
        int scan_id FK
        string field_id "commodity_name, mrp, net_qty, mfg_date..."
        string value
        float confidence
        json bounding_box "x, y, w, h"
    }

    VIOLATIONS {
        int id PK
        int scan_id FK
        string rule_code "Rule 6, Rule 11, Schedule II, Rule 27"
        string severity "CRITICAL, MAJOR, MINOR"
        string title
        text description
        text recommendation
    }

    FIELD_VISIT_ORDERS {
        int id PK
        string visit_order_no UK
        int product_id FK
        int lead_inspector_id FK
        int sub_inspector_id FK
        string status "ASSIGNED, IN_PROGRESS, COMPLETED"
        float measured_font_caliper_mm
        string vir_signoff_hash
    }

    CERTIFICATES {
        int id PK
        string certificate_number UK
        int application_id FK
        int issued_by_user_id FK
        string sha256_seal_hash
        string qr_verification_url
        datetime issued_at
        datetime valid_until
    }

    EVIDENCE_FILES {
        int id PK
        int scan_id FK
        int visit_order_id FK
        string file_path
        string mime_type
        string sha256_hash
        float gps_lat
        float gps_lng
    }
```
