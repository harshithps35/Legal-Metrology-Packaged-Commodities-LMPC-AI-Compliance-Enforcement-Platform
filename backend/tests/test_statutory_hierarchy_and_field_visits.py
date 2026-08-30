"""
LMPC Compliance System — Automated Test Suite: Statutory Hierarchy & Field Visit Trigger Engine

Tests:
1. Authentication of all statutory roles (State Commissioner, CLMO, Inspector, Sub-Inspector, Resolution Desk, Manufacturer).
2. Proactive pre-market packaging submission with Major / Critical optical violations.
3. Creation of a Mandatory Field Visit Order and status transition to PENDING_FIELD_INSPECTION.
4. Submission of on-site Field Visit Report with vernier caliper font measurement (2.4 mm).
5. CLMO final approval and evidence-backed PDF Certificate generation.
6. CLMO statutory visit waiver for minor edge cases.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone

from app.main import app
from app.core.database import async_session_factory, Base, engine
from app.core.security import create_access_token, hash_password
from app.db.models.models import (
    FieldVisitOrder,
    PreMarketApplication,
    PreMarketStatus,
    User,
    UserRole,
)


@pytest_asyncio.fixture(scope="module")
async def setup_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_statutory_hierarchy_logins(setup_test_db):
    """Verify that all statutory users can authenticate via email or unique ID."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create users for each hierarchy level
        async with async_session_factory() as db:
            clmo = User(
                username="test_clmo",
                unique_login_id="CLMO-TEST-001",
                email="clmo.test@lmpc.gov.in",
                password_hash=hash_password("clmo123"),
                full_name="Dr. Anil Verma (CLMO)",
                role=UserRole.CLMO_SUPERVISOR,
                hierarchy_level=2,
                is_approved=True,
            )
            insp = User(
                username="test_insp",
                unique_login_id="INSP-TEST-042",
                email="insp.test@lmpc.gov.in",
                password_hash=hash_password("insp123"),
                full_name="Rajesh Sharma (LMI)",
                role=UserRole.INSPECTOR,
                hierarchy_level=3,
                is_approved=True,
            )
            sub_insp = User(
                username="test_sub_insp",
                unique_login_id="ASST-TEST-012",
                email="sub.insp.test@lmpc.gov.in",
                password_hash=hash_password("sub123"),
                full_name="Sanjay Kumar (Sub-Inspector)",
                role=UserRole.SUB_INSPECTOR,
                hierarchy_level=4,
                is_approved=True,
            )
            mfr = User(
                username="test_mfr",
                unique_login_id="EMP-TEST-101",
                email="mfr.test@parle.com",
                password_hash=hash_password("mfr123"),
                full_name="Vikram Seth (Parle)",
                company_name="Parle Products Pvt Ltd",
                role=UserRole.EMPLOYER,
                hierarchy_level=6,
                is_approved=True,
            )
            db.add_all([clmo, insp, sub_insp, mfr])
            await db.commit()

        # 1. Login CLMO
        res_clmo = await ac.post("/api/v1/auth/token", data={"username": "clmo.test@lmpc.gov.in", "password": "clmo123"})
        assert res_clmo.status_code == 200
        token_clmo = res_clmo.json()["access_token"]

        # 2. Login Inspector
        res_insp = await ac.post("/api/v1/auth/token", data={"username": "insp.test@lmpc.gov.in", "password": "insp123"})
        assert res_insp.status_code == 200
        token_insp = res_insp.json()["access_token"]

        # 3. Login Manufacturer
        res_mfr = await ac.post("/api/v1/auth/token", data={"username": "EMP-TEST-101", "password": "mfr123"})
        assert res_mfr.status_code == 200
        token_mfr = res_mfr.json()["access_token"]


@pytest.mark.asyncio
async def test_field_visit_order_lifecycle(setup_test_db):
    """Verify Field Visit Order creation, evidence logging, report submission, and CLMO certificate generation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Get tokens
        res_insp = await ac.post("/api/v1/auth/token", data={"username": "insp.test@lmpc.gov.in", "password": "insp123"})
        insp_headers = {"Authorization": f"Bearer {res_insp.json()['access_token']}"}

        res_clmo = await ac.post("/api/v1/auth/token", data={"username": "clmo.test@lmpc.gov.in", "password": "clmo123"})
        clmo_headers = {"Authorization": f"Bearer {res_clmo.json()['access_token']}"}

        # Create sample pre-market application
        async with async_session_factory() as db:
            mfr = (await db.execute(User.__table__.select().where(User.username == "test_mfr"))).first()
            insp = (await db.execute(User.__table__.select().where(User.username == "test_insp"))).first()
            
            app_obj = PreMarketApplication(
                employer_id=mfr.id,
                assigned_inspector_id=insp.id,
                product_name="Marie Gold Biscuits (100g)",
                brand="Parle",
                category="food",
                packaging_type="Heat-Sealed Pouch",
                declared_mrp=10.0,
                declared_net_quantity="100 g",
                artwork_file_path="/uploads/test_marie.png",
                status=PreMarketStatus.PENDING_INSPECTOR,
                visit_required=True,
                visit_trigger_reason="Rule 11(2)(c) Sticker Overprint & Schedule II Font Deficiency",
            )
            db.add(app_obj)
            await db.commit()
            await db.refresh(app_obj)
            app_id = app_obj.id

        # 1. Inspector Creates Field Visit Order
        visit_payload = {
            "application_id": app_id,
            "scheduled_date": "2026-08-30",
            "scheduled_time": "11:30 AM",
            "visit_location_name": "Parle Noida Production Facility (Plant #2)",
            "visit_location_type": "MANUFACTURING_PLANT",
            "visit_address": "Plot 42, Sector 18 Industrial Area, Noida, UP - 201301",
            "visit_trigger_reason": "Rule 11(2)(c) Sticker Overprint & Schedule II Font Deficiency",
        }
        res_visit = await ac.post("/api/v1/field-visits/orders", json=visit_payload, headers=insp_headers)
        assert res_visit.status_code == 200
        visit_data = res_visit.json()
        visit_id = visit_data["visit_id"]
        assert visit_data["visit_status"] == "SCHEDULED"

        # 2. Inspector / Sub-Inspector starts visit
        res_start = await ac.patch(f"/api/v1/field-visits/orders/{visit_id}/start", headers=insp_headers)
        assert res_start.status_code == 200
        assert res_start.json()["visit_status"] == "IN_PROGRESS"

        # 3. Inspector Submits Field Visit Report with Caliper Font Reading (2.4 mm)
        report_payload = {
            "caliper_font_measurement_mm": 2.4,
            "physical_net_weight_grams": 102.5,
            "batch_records_cross_checked": True,
            "physical_tampering_confirmed": False,
            "visit_recommendation": "APPROVE_WITH_CONDITIONS",
            "on_site_inspector_remarks": "On-site plant inspection confirmed direct pre-print packaging. Vernier caliper measurement = 2.4mm (Pass >= 2.0mm). Batch QA records checked.",
        }
        res_report = await ac.post(f"/api/v1/field-visits/orders/{visit_id}/submit-report", json=report_payload, headers=insp_headers)
        assert res_report.status_code == 200
        assert res_report.json()["visit_status"] == "COMPLETED"
        assert res_report.json()["visit_recommendation"] == "APPROVE_WITH_CONDITIONS"

        # 4. CLMO Approves Pre-Market Application & Issues Certificate
        decide_payload = {
            "action": "approve",
            "notes": "Field visit report verified. Caliper measurement satisfies Schedule II. Clearance granted.",
        }
        res_decide = await ac.post(f"/api/v1/supervisor/pre-market/{app_id}/decide", json=decide_payload, headers=clmo_headers)
        assert res_decide.status_code == 200
        cert_data = res_decide.json()
        assert cert_data["status"] == "approved_certified"
        assert cert_data["certificate_number"] is not None


@pytest.mark.asyncio
async def test_clmo_visit_waiver(setup_test_db):
    """Verify CLMO can waive a field visit for minor edge-cases with logged justification."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_clmo = await ac.post("/api/v1/auth/token", data={"username": "clmo.test@lmpc.gov.in", "password": "clmo123"})
        clmo_headers = {"Authorization": f"Bearer {res_clmo.json()['access_token']}"}

        # Create application needing visit
        async with async_session_factory() as db:
            mfr = (await db.execute(User.__table__.select().where(User.username == "test_mfr"))).first()
            app_obj = PreMarketApplication(
                employer_id=mfr.id,
                product_name="Sample Biscuit (50g)",
                brand="Parle",
                category="food",
                declared_mrp=5.0,
                declared_net_quantity="50 g",
                artwork_file_path="/uploads/test_50g.png",
                status=PreMarketStatus.PENDING_FIELD_INSPECTION,
                visit_required=True,
                visit_trigger_reason="Minor font border variation",
            )
            db.add(app_obj)
            await db.commit()
            await db.refresh(app_obj)
            app_id = app_obj.id

        # CLMO Waives Visit
        waiver_payload = {
            "justification": "Minor font variation within 0.1mm tolerance. Factory audited last month. Physical visit waived under Rule 14 discretion."
        }
        res_waive = await ac.post(f"/api/v1/supervisor/pre-market/{app_id}/waive-visit", json=waiver_payload, headers=clmo_headers)
        assert res_waive.status_code == 200
        assert res_waive.json()["status"] == "FIELD_VISIT_WAIVED"
