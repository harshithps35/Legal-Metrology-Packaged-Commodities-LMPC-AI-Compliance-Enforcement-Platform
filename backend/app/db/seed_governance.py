"""
LMPC Compliance System — Multi-Tier Governance Database Seeder

Seeds:
1. Supervisor (SUP-HQ-001)
2. Regional Field Inspectors (INSP-DEL-042, INSP-BLR-019, INSP-MUM-031)
3. Registered Employers / Brands (EMP-PARLE-101, EMP-HUL-204)
4. Active Products under Inspection Pipeline for Inspectors
5. Pre-Market Packaging Clearance Applications for Employers
6. Statutory Rule Definitions (LMPC 2011 & Gazette Amendments)
7. Historical Scans, Work Assignments & Quota Credits
"""

import asyncio
import hashlib
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory, init_db
from app.core.security import hash_password
from app.db.models.models import (
    ApprovalStatus,
    AssignmentCredit,
    AssignmentStatus,
    ExtractedField,
    PreMarketApplication,
    PreMarketStatus,
    ProductAudit,
    ProductAuditStatus,
    RuleDefinition,
    Scan,
    ScanStatus,
    User,
    UserRole,
    Violation,
    ViolationSeverity,
    WorkAssignment,
    FieldVisitOrder,
    FieldVisitMember,
    ResolutionCase,
    SubmissionVersion,
    CertificateEvent,
    Notification,
)


async def seed_governance_data():
    """Seed initial governance users, rules, assignments, products, and historical scans."""
    from app.core.database import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        print("[*] Seeding Multi-Tier Governance Data...")

        # -------------------------------------------------------------
        # 1. Seed Users (State Commissioner, CLMO, Inspectors, Sub-Inspectors, Resolution Desk, Manufacturers)
        # -------------------------------------------------------------
        users_to_seed = [
            {
                "username": "commissioner",
                "unique_login_id": "COMM-HQ-001",
                "email": "commissioner.lmpc@gmail.com",
                "phone_number": "9811001120",
                "password_hash": hash_password("commissioner123"),
                "full_name": "Shri V. K. Malhotra (State Commissioner / Director)",
                "role": UserRole.STATE_COMMISSIONER,
                "hierarchy_level": 1,
                "department": "Directorate of Legal Metrology",
                "jurisdiction_zone": "National HQ / All State Jurisdictions",
                "assigned_category": "all",
                "is_approved": True,
            },
            {
                "username": "clmo_supervisor",
                "unique_login_id": "CLMO-NZ-001",
                "email": "clmo.supervisor.lmpc@gmail.com",
                "phone_number": "9811001122",
                "password_hash": hash_password("supervisor123"),
                "full_name": "Dr. Anil Verma (Chief Legal Metrology Officer - CLMO)",
                "role": UserRole.CLMO,
                "hierarchy_level": 2,
                "department": "Department of Consumer Affairs",
                "jurisdiction_zone": "North Zone Directorate (Noida / Delhi NCR)",
                "assigned_category": "all",
                "is_approved": True,
            },
            {
                "username": "almo_noida",
                "unique_login_id": "ALMO-NOI-001",
                "email": "almo.noida.lmpc@gmail.com",
                "phone_number": "9811001124",
                "password_hash": hash_password("supervisor123"),
                "full_name": "Shri Suresh Raina (Assistant Legal Metrology Officer - ALMO)",
                "role": UserRole.ALMO,
                "hierarchy_level": 2,
                "department": "Regional Legal Metrology Sanctioning Office",
                "jurisdiction_zone": "Noida / Greater Noida District",
                "assigned_category": "all",
                "is_approved": True,
            },
            {
                "username": "supervisor",
                "unique_login_id": "SUP-HQ-002",
                "email": "director.supervisor.lmpc@gmail.com",
                "phone_number": "9811001123",
                "password_hash": hash_password("supervisor123"),
                "full_name": "Dr. Ananya Roy (Superintendent of Legal Metrology)",
                "role": UserRole.SUPERVISOR,
                "hierarchy_level": 2,
                "department": "Directorate of Legal Metrology",
                "jurisdiction_zone": "National HQ",
                "assigned_category": "all",
                "is_approved": True,
            },
            {
                "username": "inspector_sharma",
                "unique_login_id": "INSP-DEL-042",
                "email": "inspector.rajesh.lmpc@gmail.com",
                "phone_number": "9871234501",
                "password_hash": hash_password("inspector123"),
                "full_name": "Rajesh Sharma (Legal Metrology Inspector - LMI)",
                "role": UserRole.INSPECTOR,
                "hierarchy_level": 3,
                "department": "Legal Metrology Enforcement",
                "jurisdiction_zone": "North Zone (Noida / Delhi NCR)",
                "assigned_category": "food",
                "is_approved": True,
            },
            {
                "username": "sub_inspector_sanjay",
                "unique_login_id": "ASST-DEL-012",
                "email": "sub.inspector.sanjay.lmpc@gmail.com",
                "phone_number": "9871234509",
                "password_hash": hash_password("inspector123"),
                "full_name": "Sanjay Kumar (Assistant Inspector / Sub-Inspector)",
                "role": UserRole.SUB_INSPECTOR,
                "hierarchy_level": 4,
                "department": "Legal Metrology Field Enforcement",
                "jurisdiction_zone": "North Zone (Noida / Delhi NCR)",
                "assigned_category": "food",
                "is_approved": True,
            },
            {
                "username": "resolution_officer",
                "unique_login_id": "DESK-HQ-001",
                "email": "resolution.desk.lmpc@gmail.com",
                "phone_number": "9871234510",
                "password_hash": hash_password("resolution123"),
                "full_name": "Pooja Singhal (Compliance Resolution Desk Officer)",
                "role": UserRole.RESOLUTION_DESK,
                "hierarchy_level": 5,
                "department": "Statutory Compliance Resolution Desk",
                "jurisdiction_zone": "Central Directorate",
                "assigned_category": "all",
                "is_approved": True,
            },
            {
                "username": "inspector_verma",
                "unique_login_id": "INSP-BLR-019",
                "email": "inspector.amit.lmpc@gmail.com",
                "phone_number": "9871234502",
                "password_hash": hash_password("inspector123"),
                "full_name": "Amit Verma (Legal Metrology Inspector)",
                "role": UserRole.INSPECTOR,
                "hierarchy_level": 3,
                "department": "Legal Metrology Enforcement",
                "jurisdiction_zone": "South Zone (Bengaluru / Chennai)",
                "assigned_category": "cosmetics",
                "is_approved": True,
            },
            {
                "username": "inspector_deshmukh",
                "unique_login_id": "INSP-MUM-031",
                "email": "inspector.priya.lmpc@gmail.com",
                "phone_number": "9871234503",
                "password_hash": hash_password("inspector123"),
                "full_name": "Priya Deshmukh (Legal Metrology Inspector)",
                "role": UserRole.INSPECTOR,
                "hierarchy_level": 3,
                "department": "Legal Metrology Enforcement",
                "jurisdiction_zone": "West Zone (Mumbai / Pune)",
                "assigned_category": "pharma",
                "is_approved": True,
            },
            # Employers / Brands
            {
                "username": "employer_parle",
                "unique_login_id": "EMP-PARLE-101",
                "email": "parle.compliance.lmpc@gmail.com",
                "phone_number": "9822334455",
                "password_hash": hash_password("employer123"),
                "full_name": "Vikram Seth (Compliance Head)",
                "company_name": "Parle Products Pvt Ltd",
                "gstin_fssai_id": "27AAACP1234F1Z5 / 10015022003891",
                "role": UserRole.EMPLOYER,
                "hierarchy_level": 6,
                "department": "Packaging Compliance",
                "jurisdiction_zone": "North Zone (Noida Facility)",
                "assigned_category": "food",
                "is_approved": True,
            },
            {
                "username": "employer_hul",
                "unique_login_id": "EMP-HUL-204",
                "email": "hul.compliance.lmpc@gmail.com",
                "phone_number": "9822334456",
                "password_hash": hash_password("employer123"),
                "full_name": "Neha Kapoor (Legal Director)",
                "company_name": "Hindustan Unilever Ltd",
                "gstin_fssai_id": "29AAACH1234L1Z2",
                "role": UserRole.EMPLOYER,
                "hierarchy_level": 6,
                "department": "Quality & Standards",
                "jurisdiction_zone": "South Zone (Bengaluru Plant)",
                "assigned_category": "cosmetics",
                "is_approved": True,
            },
        ]

        user_instances = {}
        for u in users_to_seed:
            user = User(**u)
            db.add(user)
            await db.flush()
            user_instances[u["username"]] = user

        # Link Parle to Inspector Sharma
        user_instances["employer_parle"].assigned_inspector_id = user_instances["inspector_sharma"].id
        user_instances["employer_hul"].assigned_inspector_id = user_instances["inspector_verma"].id

        # -------------------------------------------------------------
        # 2. Seed Active Products Under Audit Pipeline
        # -------------------------------------------------------------
        products_to_seed = [
            {
                "inspector_id": user_instances["inspector_sharma"].id,
                "employer_id": user_instances["employer_parle"].id,
                "product_name": "Parle-G Glucose Biscuits (100g)",
                "brand": "Parle",
                "category": "food",
                "batch_number": "B2608-A1",
                "mrp": 10.0,
                "net_quantity": "100 g",
                "gtin_barcode": "8901719101015",
                "status": ProductAuditStatus.CLEARED_COMPLIANT,
                "notes": "Annual baseline audit — fully compliant with Rule 6 and Schedule II.",
            },
            {
                "inspector_id": user_instances["inspector_sharma"].id,
                "employer_id": user_instances["employer_parle"].id,
                "product_name": "Hide & Seek Choco Fills (120g)",
                "brand": "Parle",
                "category": "food",
                "batch_number": "HS-2026-09",
                "mrp": 35.0,
                "net_quantity": "120 g",
                "gtin_barcode": "8901719202029",
                "status": ProductAuditStatus.IN_VERIFICATION,
                "notes": "Checking front-panel font height and net quantity unit standard.",
            },
            {
                "inspector_id": user_instances["inspector_sharma"].id,
                "employer_id": user_instances["employer_parle"].id,
                "product_name": "Krackjack Sweet & Salty Crackers (200g)",
                "brand": "Parle",
                "category": "food",
                "batch_number": "KJ-7712",
                "mrp": 25.0,
                "net_quantity": "200 g",
                "gtin_barcode": "8901719303036",
                "status": ProductAuditStatus.SCHEDULED_FIELD_AUDIT,
                "notes": "Scheduled retail sample verification in Noida Sector 18 market.",
            },
            {
                "inspector_id": user_instances["inspector_verma"].id,
                "employer_id": user_instances["employer_hul"].id,
                "product_name": "Dove Deep Moisture Body Wash (250ml)",
                "brand": "Dove / HUL",
                "category": "cosmetics",
                "batch_number": "DV-9901-B",
                "mrp": 199.0,
                "net_quantity": "250 ml",
                "gtin_barcode": "8901030808081",
                "status": ProductAuditStatus.SCHEDULED_FIELD_AUDIT,
                "notes": "Verify standard metric volume declaration (ml vs fl oz).",
            },
        ]

        for p in products_to_seed:
            prod = ProductAudit(**p)
            db.add(prod)

        # -------------------------------------------------------------
        # 3. Seed Employer Pre-Market Applications & Field Visit Orders
        # -------------------------------------------------------------
        from app.db.models.models import FieldVisitOrder

        pre_market_to_seed = [
            {
                "employer_id": user_instances["employer_parle"].id,
                "assigned_inspector_id": user_instances["inspector_sharma"].id,
                "assigned_clmo_id": user_instances["clmo_supervisor"].id,
                "assigned_almo_id": user_instances["almo_noida"].id,
                "product_name": "Parle Festive Gold Cookies (250g Gift Tin)",
                "brand": "Parle Gold",
                "category": "food",
                "packaging_type": "Metallic Tin & Outer Box",
                "declared_mrp": 150.0,
                "declared_net_quantity": "250 g",
                "artwork_file_path": "/uploads/artwork_parle_gold_2026.png",
                "status": PreMarketStatus.APPROVED_CERTIFIED,
                "triage_severity": "NONE",
                "supervisor_id": user_instances["clmo_supervisor"].id,
                "certificate_number": "LMPC/PMC/2026/08/0091",
                "verification_method": "DIGITAL_OCR_ONLY",
                "supervisor_notes": "All mandatory declarations present. Font height 4.0mm verified. Digital clearance granted.",
            },
            {
                "employer_id": user_instances["employer_parle"].id,
                "assigned_inspector_id": user_instances["inspector_sharma"].id,
                "assigned_almo_id": user_instances["almo_noida"].id,
                "assigned_clmo_id": user_instances["clmo_supervisor"].id,
                "product_name": "Marie Gold Price Tampered Batch (200g)",
                "brand": "Parle",
                "category": "food",
                "packaging_type": "Heat-Sealed Multi-Layer Pouch",
                "declared_mrp": 25.0,
                "declared_net_quantity": "200 g",
                "artwork_file_path": "/uploads/artwork_marie_gold_2026.png",
                "status": PreMarketStatus.PENDING_ALMO_SANCTION,
                "triage_severity": "CRITICAL",
                "visit_required": True,
                "visit_recommended": True,
                "visit_recommendation_justification": "LMPC Rule 11(2)(c) & Sec 36: Suspected secondary price alteration sticker over original printed MRP. Requires physical manufacturing line audit.",
                "inspector_notes": "LMI Rajesh Sharma recommended physical on-site visit. Secondary sticker detected under optical scan.",
            },
            {
                "employer_id": user_instances["employer_parle"].id,
                "assigned_inspector_id": user_instances["inspector_sharma"].id,
                "assigned_almo_id": user_instances["almo_noida"].id,
                "assigned_clmo_id": user_instances["clmo_supervisor"].id,
                "product_name": "Parle Wave Crispy Masala Chips (90g)",
                "brand": "Parle Wave",
                "category": "food",
                "packaging_type": "Nitrogen Flushed Pouch",
                "declared_mrp": 20.0,
                "declared_net_quantity": "90 g",
                "artwork_file_path": "/uploads/artwork_wave_chips_2026.png",
                "status": PreMarketStatus.FIELD_VISIT_COMPLETED,
                "triage_severity": "MAJOR",
                "visit_required": True,
                "visit_order_no": "VO-2026-000002",
                "visit_order_id": "VISIT-2026-9912",
                "inspector_notes": "FIELD VISIT COMPLETED (Order #VO-2026-000002): Caliper measured 1.4mm numeral height on 90g pack. Defect confirmed on-site.",
            },
            {
                "employer_id": user_instances["employer_parle"].id,
                "assigned_inspector_id": user_instances["inspector_sharma"].id,
                "assigned_almo_id": user_instances["almo_noida"].id,
                "assigned_clmo_id": user_instances["clmo_supervisor"].id,
                "product_name": "Nutricrunch 7-Grain Digestive Biscuit (100g Eco-Pouch)",
                "brand": "Nutricrunch",
                "category": "food",
                "packaging_type": "Biodegradable Pouch",
                "declared_mrp": 30.0,
                "declared_net_quantity": "100 g",
                "artwork_file_path": "/uploads/artwork_nutricrunch_2026.png",
                "status": PreMarketStatus.PENDING_INSPECTOR,
                "triage_severity": "MINOR",
                "visit_required": False,
                "supervisor_id": None,
                "certificate_number": None,
                "supervisor_notes": None,
            },
            {
                "employer_id": user_instances["employer_hul"].id,
                "assigned_inspector_id": user_instances["inspector_verma"].id,
                "assigned_clmo_id": user_instances["clmo_supervisor"].id,
                "product_name": "Dove Sensitive Skin Care Bar (125g)",
                "brand": "Dove",
                "category": "cosmetics",
                "packaging_type": "Carton Box",
                "declared_mrp": 65.0,
                "declared_net_quantity": "125 g",
                "artwork_file_path": "/uploads/artwork_dove_bar_2026.png",
                "status": PreMarketStatus.PENDING_SUPERVISOR,
                "triage_severity": "NONE",
                "visit_required": False,
                "inspector_notes": "LMI Amit Verma verified complete compliance with Schedule II and Rule 6. Recommended for Fast-Track Digital Certificate.",
            },
        ]

        app_instances = []
        for pm in pre_market_to_seed:
            app = PreMarketApplication(**pm)
            db.add(app)
            await db.flush()
            app_instances.append(app)

        # Seed Field Visit Order for Wave Crispy Chips
        now_dt = datetime.now(timezone.utc)
        sample_visit = FieldVisitOrder(
            visit_id="VISIT-2026-9912",
            visit_order_no="VO-2026-000002",
            application_id=app_instances[2].id,
            sanctioned_by_almo_id=user_instances["almo_noida"].id,
            sanctioned_at=now_dt - timedelta(days=2),
            visit_sanctioned=True,
            assigned_inspector_id=user_instances["inspector_sharma"].id,
            assigned_sub_inspector_id=user_instances["sub_inspector_sanjay"].id,
            triage_severity="MAJOR",
            visit_trigger_reason="Schedule II Font Height Discrepancy (<2.0mm on Principal Display Panel)",
            triggered_by_inspector_id=user_instances["inspector_sharma"].id,
            visit_status="COMPLETED",
            scheduled_date=now_dt - timedelta(days=1),
            scheduled_time="11:30 AM",
            visit_location_name="Parle Noida Production Facility (Plant #2)",
            visit_location_type="MANUFACTURING_PLANT",
            visit_address="Plot 42, Sector 18 Industrial Area, Noida, UP - 201301",
            visit_started_at=now_dt - timedelta(days=1, hours=2),
            visit_submitted_at=now_dt - timedelta(days=1, hours=1),
            caliper_font_measurement_mm=1.4,
            caliper_attested_by=user_instances["inspector_sharma"].id,
            caliper_attested_at=now_dt - timedelta(days=1, hours=1),
            physical_net_weight_grams=91.2,
            batch_records_cross_checked=True,
            physical_tampering_confirmed=False,
            inspection_signature=hashlib.sha256(b"VO-2026-000002:Parle-Wave:Rajesh-Sharma").hexdigest(),
            gps_confidence="HIGH",
            visit_report_submitted=True,
            visit_recommendation="SEEK_CLARIFICATION",
            on_site_inspector_remarks="Physical inspection confirmed 1.4mm font height. Vernier caliper measurement attested under seal. Routed to ALMO for evidence review.",
            almo_report_approved=False,
        )
        db.add(sample_visit)
        await db.flush()

        # Seed Field Visit Members (Lead + Sub-Inspector Co-Signer)
        lead_member = FieldVisitMember(
            visit_id=sample_visit.id,
            user_id=user_instances["inspector_sharma"].id,
            role_in_visit="LEAD_INSPECTOR",
            attendance_status="PRESENT",
            signed_at=now_dt - timedelta(days=1, hours=1),
            signature_hash=hashlib.sha256(b"LEAD:Rajesh-Sharma").hexdigest(),
            observations="Vernier caliper applied to Principal Display Panel. Font reading 1.4mm recorded.",
        )
        sub_member = FieldVisitMember(
            visit_id=sample_visit.id,
            user_id=user_instances["sub_inspector_sanjay"].id,
            role_in_visit="SUB_INSPECTOR",
            attendance_status="PRESENT",
            signed_at=now_dt - timedelta(days=1, hours=1),
            signature_hash=hashlib.sha256(b"SUB_INSP:Sanjay-Kumar").hexdigest(),
            observations="Batch production records and packing line cross-checked. Direct printing verified.",
        )
        db.add(lead_member)
        db.add(sub_member)

        # Seed Submission Versions for Parle Wave (v1 non-compliant -> v2 corrected)
        v1 = SubmissionVersion(
            application_id=app_instances[2].id,
            version_number=1,
            submitted_by_id=user_instances["employer_parle"].id,
            artwork_url="/uploads/artwork_parle_wave_v1.png",
            declared_mrp=20.0,
            declared_net_quantity="90 g",
            change_summary="Initial pre-market submission (1.4mm font deficit)",
            created_at=now_dt - timedelta(days=5),
        )
        db.add(v1)

        # Seed Resolution Case (15-Day SLA Rectification for Nutricrunch)
        sample_resolution = ResolutionCase(
            case_number="DEF-2026-NTC01",
            application_id=app_instances[3].id,
            assigned_officer_id=user_instances["resolution_officer"].id,
            status="OPEN",
            memo_text="LMPC Rule 6(1)(c) Notice: Unit Sale Price (USP) font height missing on biodegradable pouch.",
            deficiencies_json=["Unit Sale Price (USP) declaration absent", "Customer care email not hyperlinked/printed clearly"],
            sla_deadline_days=15,
            dispatched_at=now_dt - timedelta(days=3),
            sla_deadline=now_dt + timedelta(days=12),
        )
        db.add(sample_resolution)
        rules_to_seed = [
            {
                "rule_code": "Rule 6(1)(a)",
                "statutory_title": "Generic Name of Commodity",
                "category": "all",
                "legal_text": "Every package shall bear the generic or common name of the commodity contained therein.",
                "standard_specification": "Must specify generic commodity name (e.g. 'Biscuits', 'Shampoo'), not just the registered trademark.",
                "severity": ViolationSeverity.CRITICAL,
            },
            {
                "rule_code": "Rule 6(1)(b)",
                "statutory_title": "Net Quantity in Standard Metric Units",
                "category": "all",
                "legal_text": "The net quantity, in terms of standard unit of weight or measure, of the commodity contained in the package.",
                "standard_specification": "Units must be standard metric: g, kg, ml, l, m, cm, or number (N / U). Non-standard units (gm, gms, kgs, ltr) are strictly non-compliant.",
                "severity": ViolationSeverity.CRITICAL,
            },
            {
                "rule_code": "Rule 6(1)(c)",
                "statutory_title": "Maximum Retail Price (MRP) with Mandatory Tax Inclusivity Declaration",
                "category": "all",
                "legal_text": "The retail sale price of the package shall clearly indicate the Maximum Retail Price (MRP) inclusive of all taxes in Indian Rupees.",
                "standard_specification": "Must include currency symbol (₹ or Rs.) and the explicit phrase '(incl. of all taxes)' or 'inclusive of all taxes'.",
                "severity": ViolationSeverity.MAJOR,
            },
            {
                "rule_code": "Rule 6(1)(d)",
                "statutory_title": "Name and Complete Address of Manufacturer / Packer / Importer",
                "category": "all",
                "legal_text": "The name and complete postal address of the manufacturer or packer or importer shall be declared on every package.",
                "standard_specification": "Must include legal entity name and complete geographical address with PIN code / postal index.",
                "severity": ViolationSeverity.CRITICAL,
            },
            {
                "rule_code": "Rule 6(1)(e)",
                "statutory_title": "Month and Year of Manufacture / Pre-packing / Import",
                "category": "all",
                "legal_text": "The month and the year in which the commodity is manufactured or pre-packed or imported shall be clearly marked.",
                "standard_specification": "Valid format: MM/YYYY, Month YYYY, or explicit date (DD/MM/YYYY). Date must not be in the future.",
                "severity": ViolationSeverity.CRITICAL,
            },
            {
                "rule_code": "Rule 6(1)(f)",
                "statutory_title": "Consumer Grievance Redressal Officer Contact Details",
                "category": "all",
                "legal_text": "Name, address, telephone number, and email address of the person or office that can be contacted in case of consumer complaints.",
                "standard_specification": "Must declare at least: (1) Contact designation/name, (2) Postal address, (3) Phone number, (4) Email address.",
                "severity": ViolationSeverity.CRITICAL,
            },
            {
                "rule_code": "Rule 9 / Schedule II",
                "statutory_title": "Minimum Font Height of Numerals & Units in Declarations",
                "category": "all",
                "legal_text": "The height of any numeral in the declaration on the principal display panel shall not be less than the minimum prescribed in Schedule II.",
                "standard_specification": "Net Qty <= 50g: 1.5mm | 50g-200g: 2.0mm | 200g-1kg: 4.0mm | > 1kg: 6.0mm. Area of display panel determines minimum boundary.",
                "severity": ViolationSeverity.MAJOR,
            },
            {
                "rule_code": "Rule 11(2)(c) & LM Act S.36",
                "statutory_title": "Prohibition of Sticker Overprinting & Retail Price Alteration",
                "category": "all",
                "legal_text": "No person shall alter, deface, or overwrite the maximum retail price declared by the manufacturer on the packaging.",
                "standard_specification": "Pasting white price stickers or altering original printed text is a strict statutory violation incurring prosecution under Section 36.",
                "severity": ViolationSeverity.CRITICAL,
            },
        ]

        for r in rules_to_seed:
            rule_def = RuleDefinition(**r)
            db.add(rule_def)

        # -------------------------------------------------------------
        # 5. Seed Work Assignments (August 2026)
        # -------------------------------------------------------------
        supervisor_id = user_instances["supervisor"].id
        sharma_id = user_instances["inspector_sharma"].id
        verma_id = user_instances["inspector_verma"].id
        deshmukh_id = user_instances["inspector_deshmukh"].id

        assignments_to_seed = [
            {
                "super_admin_id": supervisor_id,
                "inspector_id": sharma_id,
                "title": "FMCG Food & Bakery Packaging Audit (Noida Sector 18)",
                "industry_category": "food",
                "target_company": "Parle, Britannia & Local Retailers",
                "target_count": 25,
                "month_year": "2026-08",
                "due_date": datetime(2026, 8, 31, 23, 59, 59, tzinfo=timezone.utc),
                "status": AssignmentStatus.IN_PROGRESS,
                "notes": "Target bakery & confectionary brands for multi-price alteration stickers under Rule 11(2)(c).",
            },
            {
                "super_admin_id": supervisor_id,
                "inspector_id": verma_id,
                "title": "Cosmetics & Skincare Metric Labeling Drive (Bengaluru Central)",
                "industry_category": "cosmetics",
                "target_company": "Hindustan Unilever, L'Oreal, Nykaa",
                "target_count": 20,
                "month_year": "2026-08",
                "due_date": datetime(2026, 8, 31, 23, 59, 59, tzinfo=timezone.utc),
                "status": AssignmentStatus.IN_PROGRESS,
                "notes": "Verify non-standard imperial units (fl. oz) vs mandatory metric ml declarations.",
            },
            {
                "super_admin_id": supervisor_id,
                "inspector_id": deshmukh_id,
                "title": "OTC Pharmaceuticals & Nutraceuticals Inspection (Mumbai Metro)",
                "industry_category": "pharma",
                "target_company": "Sun Pharma, Cipla, Abbott",
                "target_count": 15,
                "month_year": "2026-08",
                "due_date": datetime(2026, 8, 31, 23, 59, 59, tzinfo=timezone.utc),
                "status": AssignmentStatus.ASSIGNED,
                "notes": "Check font sizes on small blister packs against Schedule II minimum limits.",
            },
        ]

        assignment_instances = []
        for a in assignments_to_seed:
            assign = WorkAssignment(**a)
            db.add(assign)
            await db.flush()
            assignment_instances.append(assign)

        # -------------------------------------------------------------
        # 6. Seed Historical Scans with GPS, Evidence Hashes & Quota Credits
        # -------------------------------------------------------------
        now = datetime.now(timezone.utc)
        historical_scans_to_seed = [
            {
                "user_id": sharma_id,
                "assignment_id": assignment_instances[0].id,
                "product_name": "Parle-G Glucose Biscuits",
                "brand": "Parle",
                "category": "food",
                "image_url": "/uploads/seed_parleg.jpg",
                "status": ScanStatus.COMPLIANT,
                "compliance_score": 96.5,
                "latitude": 28.5708,
                "longitude": 77.3271,
                "gps_accuracy_meters": 4.5,
                "location_name": "Noida Sector 18 Market, UP",
                "client_evidence_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "inspection_signature": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
                "barcode_data": {"gtin": "8901719101015", "format": "EAN_13", "raw": "8901719101015"},
                "barcode_cross_check_status": "MATCHED",
                "approval_status": ApprovalStatus.AUTO_APPROVED,
                "created_at": now - timedelta(days=2),
            },
            {
                "user_id": sharma_id,
                "assignment_id": assignment_instances[0].id,
                "product_name": "Haldiram's Bhujia Sev (200g)",
                "brand": "Haldiram",
                "category": "food",
                "image_url": "/uploads/seed_haldiram.jpg",
                "status": ScanStatus.COMPLIANT,
                "compliance_score": 92.0,
                "latitude": 28.5685,
                "longitude": 77.3245,
                "gps_accuracy_meters": 5.0,
                "location_name": "Atta Market, Sector 27, Noida",
                "client_evidence_hash": "d41d8cd98f00b204e9800998ecf8427e996fb92427ae41e4649b934ca495991b",
                "inspection_signature": "b10a8db164e0754105b7a99be72e3fe5a04a1f3fff1fa07e998e86f7f7a27ae3",
                "barcode_data": {"gtin": "8904063200155", "format": "EAN_13", "raw": "8904063200155"},
                "barcode_cross_check_status": "MATCHED",
                "approval_status": ApprovalStatus.AUTO_APPROVED,
                "created_at": now - timedelta(days=1),
            },
        ]

        for s in historical_scans_to_seed:
            scan = Scan(**s)
            db.add(scan)
            await db.flush()

            # Record immutable assignment credit
            if s["status"] == ScanStatus.COMPLIANT and s["assignment_id"]:
                credit = AssignmentCredit(
                    assignment_id=s["assignment_id"],
                    scan_id=scan.id,
                    credited_at=scan.created_at,
                )
                db.add(credit)

        await db.commit()
        print("[+] Governance Database Seeded Successfully with Multi-Tier Roles & Unique IDs!")


if __name__ == "__main__":
    asyncio.run(seed_governance_data())
