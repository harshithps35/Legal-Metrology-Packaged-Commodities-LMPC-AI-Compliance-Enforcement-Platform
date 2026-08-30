import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.db.models.models import User, UserRole, PreMarketApplication, PreMarketStatus, FieldVisitOrder
from app.core.database import async_session_factory
from sqlalchemy import select


@pytest.mark.asyncio
async def test_statutory_critical_waiver_prohibited():
    """Verify that CLMO cannot waive a CRITICAL violation (Rule 11(2)(c)) under statutory guardrails."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create token for CLMO
        async with async_session_factory() as db:
            res = await db.execute(select(User).where(User.username == "clmo_supervisor"))
            clmo = res.scalar_one_or_none()
            assert clmo is not None
            token = create_access_token({"sub": clmo.username, "role": clmo.role.value})

            # Find the Critical application (Marie Gold)
            app_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.triage_severity == "CRITICAL"))
            crit_app = app_res.scalars().first()
            assert crit_app is not None
            app_id = crit_app.id

        # Attempt to waive CRITICAL field visit
        headers = {"Authorization": f"Bearer {token}"}
        resp = await ac.post(
            f"/api/v1/supervisor/pre-market/{app_id}/waive-visit",
            json={"justification": "Attempting waiver for price alteration tampering"},
            headers=headers,
        )
        assert resp.status_code == 400
        assert "CANNOT be waived for CRITICAL violations" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_almo_sanction_and_clmo_clearance_workflow():
    """Verify end-to-end statutory flow: Inspector recommend -> ALMO sanction VO -> Submit VIR -> ALMO approve -> CLMO certify."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with async_session_factory() as db:
            almo_res = await db.execute(select(User).where(User.username == "almo_noida"))
            almo = almo_res.scalar_one_or_none()
            almo_token = create_access_token({"sub": almo.username, "role": almo.role.value})

            clmo_res = await db.execute(select(User).where(User.username == "clmo_supervisor"))
            clmo = clmo_res.scalar_one_or_none()
            clmo_token = create_access_token({"sub": clmo.username, "role": clmo.role.value})

            insp_res = await db.execute(select(User).where(User.username == "inspector_sharma"))
            insp = insp_res.scalar_one_or_none()
            insp_token = create_access_token({"sub": insp.username, "role": insp.role.value})

            # Find an application pending ALMO sanction
            app_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.status == PreMarketStatus.PENDING_ALMO_SANCTION))
            app_obj = app_res.scalars().first()
            assert app_obj is not None
            app_id = app_obj.id

        # 1. ALMO Sanctions Visit Order
        almo_headers = {"Authorization": f"Bearer {almo_token}"}
        sanction_resp = await ac.post(
            f"/api/v1/supervisor/pre-market/{app_id}/sanction-visit",
            json={
                "scheduled_date": "2026-08-30",
                "scheduled_time": "11:30 AM",
                "visit_location_name": "Parle Noida Facility",
                "visit_address": "Plot 42 Sector 18 Noida",
            },
            headers=almo_headers,
        )
        assert sanction_resp.status_code == 200
        sanction_data = sanction_resp.json()
        assert sanction_data["success"] is True
        visit_order_no = sanction_data["visit_order_no"]
        assert visit_order_no.startswith("VO-2026-")

        # 2. Inspector Submits Field Visit Report with Caliper Attestation
        insp_headers = {"Authorization": f"Bearer {insp_token}"}
        report_resp = await ac.post(
            f"/api/v1/field-visits/orders/{visit_order_no}/submit-report",
            json={
                "caliper_font_measurement_mm": 2.2,
                "physical_net_weight_grams": 200.5,
                "batch_records_cross_checked": True,
                "physical_tampering_confirmed": False,
                "visit_recommendation": "APPROVE_WITH_CONDITIONS",
                "on_site_inspector_remarks": "Verified direct printing without tampering. Font size 2.2mm exceeds 2.0mm minimum standard.",
            },
            headers=insp_headers,
        )
        assert report_resp.status_code == 200
        report_data = report_resp.json()
        assert report_data["success"] is True
        assert report_data["inspection_signature"] is not None

        # 3. ALMO Approves VIR
        vir_approve_resp = await ac.post(
            f"/api/v1/supervisor/field-visits/{visit_order_no}/approve-report",
            json={"notes": "Caliper and factory floor audit attested by ALMO."},
            headers=almo_headers,
        )
        assert vir_approve_resp.status_code == 200
        assert vir_approve_resp.json()["status"] == "PENDING_CLMO_APPROVAL"

        # 4. CLMO Grants Certificate
        clmo_headers = {"Authorization": f"Bearer {clmo_token}"}
        decide_resp = await ac.post(
            f"/api/v1/supervisor/pre-market/{app_id}/decide",
            json={
                "action": "approve",
                "notes": "Post-visit evidence confirmed. Certificate granted.",
                "verification_method": "PHYSICAL_FIELD_INSPECTION_CONFIRMED",
            },
            headers=clmo_headers,
        )
        assert decide_resp.status_code == 200
        decide_data = decide_resp.json()
        assert decide_data["status"] == "approved_certified"
        assert decide_data["certificate_number"].startswith("LMPC/PMC/2026/")


@pytest.mark.asyncio
async def test_almo_cannot_access_clmo_clearance_endpoint():
    """Statutory Isolation Test: Verify that ALMO is blocked (HTTP 403) from calling CLMO clearance endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with async_session_factory() as db:
            almo_res = await db.execute(select(User).where(User.username == "almo_noida"))
            almo = almo_res.scalar_one_or_none()
            assert almo is not None
            almo_token = create_access_token({"sub": almo.username, "role": almo.role.value})

            app_res = await db.execute(select(PreMarketApplication))
            app_obj = app_res.scalars().first()
            assert app_obj is not None
            app_id = app_obj.id

        # ALMO attempts to call CLMO clearance decision endpoint
        almo_headers = {"Authorization": f"Bearer {almo_token}"}
        forbidden_resp = await ac.post(
            f"/api/v1/supervisor/pre-market/{app_id}/decide",
            json={
                "action": "approve",
                "notes": "ALMO attempting unauthorized clearance",
            },
            headers=almo_headers,
        )
        assert forbidden_resp.status_code == 403
        assert "Exclusively reserved for Chief Legal Metrology Officer" in forbidden_resp.json()["detail"]

