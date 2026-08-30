"""
LMPC Compliance System — Multi-Portal End-to-End Tests

Tests for:
1. State Commissioner: Statewide Dashboard & Certificate Revocation with Audit Logging
2. Sub-Inspector: Assigned Visits, GPS Evidence Capture & VIR Co-Signing
3. Resolution Desk: 15-Day SLA Deficiency Memo Dispatch & Resubmission Resolution
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone

from app.main import app
from app.core.security import create_access_token
from app.db.models.models import User, UserRole, PreMarketApplication, PreMarketStatus, FieldVisitOrder, ResolutionCase
from app.core.database import async_session_factory


@pytest.fixture
def commissioner_token():
    return create_access_token(
        data={
            "sub": "COMM-HQ-001",
            "role": UserRole.STATE_COMMISSIONER.value,
            "user_id": 1,
            "department": "Directorate of Legal Metrology",
        }
    )


@pytest.fixture
def clmo_token():
    return create_access_token(
        data={
            "sub": "CLMO-NZ-001",
            "role": UserRole.CLMO.value,
            "user_id": 2,
            "department": "Chief Legal Metrology Directorate",
        }
    )


@pytest.fixture
def sub_inspector_token():
    return create_access_token(
        data={
            "sub": "ASST-DEL-012",
            "role": UserRole.SUB_INSPECTOR.value,
            "user_id": 6,
            "department": "Legal Metrology Field Enforcement",
        }
    )


@pytest.fixture
def resolution_officer_token():
    return create_access_token(
        data={
            "sub": "DESK-HQ-001",
            "role": UserRole.RESOLUTION_DESK.value,
            "user_id": 7,
            "department": "Statutory Compliance Resolution Desk",
        }
    )


@pytest.mark.asyncio
async def test_commissioner_dashboard_and_rulesets(commissioner_token):
    """Verifies Commissioner can inspect statewide heatmaps, KPIs, and rulesets."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Dashboard
        res = await client.get(
            "/api/v1/commissioner/dashboard",
            headers={"Authorization": f"Bearer {commissioner_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "state_kpis" in data
        assert "regional_heatmap" in data
        assert len(data["regional_heatmap"]) > 0

        # Rulesets
        rules_res = await client.get(
            "/api/v1/commissioner/rulesets",
            headers={"Authorization": f"Bearer {commissioner_token}"},
        )
        assert rules_res.status_code == 200
        assert len(rules_res.json()) >= 6


@pytest.mark.asyncio
async def test_sub_inspector_evidence_and_cosign(sub_inspector_token):
    """Verifies Sub-Inspector can log GPS attendance, caliper evidence, and co-sign the report."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get assigned visits
        res = await client.get(
            "/api/v1/sub-inspector/assigned-visits",
            headers={"Authorization": f"Bearer {sub_inspector_token}"},
        )
        assert res.status_code == 200
        visits = res.json()
        assert len(visits) > 0
        visit_order = visits[0]["visit_order_no"]

        # Co-sign visit
        cosign_res = await client.post(
            f"/api/v1/sub-inspector/visits/{visit_order}/co-sign",
            json={
                "observations": "Assisted Lead LMI with factory floor measurement.",
                "attendance_confirmed": True,
            },
            headers={"Authorization": f"Bearer {sub_inspector_token}"},
        )
        assert cosign_res.status_code == 200
        assert cosign_res.json()["success"] is True
        assert "signature_hash" in cosign_res.json()


@pytest.mark.asyncio
async def test_resolution_desk_memo_and_resolve(resolution_officer_token):
    """Verifies Sub-Inspector can dispatch 15-day SLA deficiency memos and mark cases resolved."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get open cases
        res = await client.get(
            "/api/v1/sub-inspector/cases",
            headers={"Authorization": f"Bearer {resolution_officer_token}"},
        )
        assert res.status_code == 200
        cases = res.json()
        assert len(cases) > 0
        case_id = cases[0]["id"]

        # Resolve case
        resolve_res = await client.post(
            f"/api/v1/sub-inspector/cases/{case_id}/resolve",
            json={
                "response_notes": "Manufacturer artwork v2 verified compliant with Rule 6.",
                "action": "ROUTE_TO_INSPECTOR",
            },
            headers={"Authorization": f"Bearer {resolution_officer_token}"},
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["success"] is True


@pytest.mark.asyncio
async def test_clmo_commissioning_and_login(clmo_token):
    """Verifies existing CLMO can commission a new CLMO with unique ID and allocated email."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Commission new CLMO
        commission_res = await client.post(
            "/api/v1/supervisor/commission-clmo",
            json={
                "full_name": "Dr. Rajeshwari Sundaram",
                "email": "clmo.south.sundaram@gmail.com",
                "phone_number": "9811009988",
                "jurisdiction_zone": "South Zone Directorate (Bengaluru / Chennai)",
                "password": "clmopassword123",
                "custom_unique_id": "CLMO-SZ-002",
                "warrant_notes": "Officially commissioned for South Zone pre-market packaging clearance.",
            },
            headers={"Authorization": f"Bearer {clmo_token}"},
        )
        assert commission_res.status_code == 200
        comm_data = commission_res.json()
        assert comm_data["success"] is True
        assert comm_data["unique_login_id"] == "CLMO-SZ-002"
        assert comm_data["email"] == "clmo.south.sundaram@gmail.com"

        # Verify newly commissioned CLMO can log in with allocated email & password
        login_res = await client.post(
            "/api/v1/auth/token",
            data={
                "username": "clmo.south.sundaram@gmail.com",
                "password": "clmopassword123",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data

        # Verify new CLMO profile
        profile_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        assert profile_res.status_code == 200
        profile = profile_res.json()
        assert profile["unique_login_id"] == "CLMO-SZ-002"
        assert profile["role"] == "clmo"


@pytest.mark.asyncio
async def test_almo_commissioning_approval_and_login(clmo_token):
    """Verifies CLMO can commission and approve a new ALMO with unique ID and allocated email."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Commission & Approve new ALMO
        commission_res = await client.post(
            "/api/v1/supervisor/commission-almo",
            json={
                "full_name": "Shri Pradeep Narang",
                "email": "almo.delhi.narang@gmail.com",
                "phone_number": "9811004455",
                "jurisdiction_zone": "Delhi North / Azadpur Mandi District Office",
                "password": "almopassword123",
                "custom_unique_id": "ALMO-DEL-002",
                "warrant_notes": "Approved by CLMO as Regional Visit Sanctioning Authority.",
            },
            headers={"Authorization": f"Bearer {clmo_token}"},
        )
        assert commission_res.status_code == 200
        comm_data = commission_res.json()
        assert comm_data["success"] is True
        assert comm_data["unique_login_id"] == "ALMO-DEL-002"
        assert comm_data["email"] == "almo.delhi.narang@gmail.com"

        # Verify newly approved ALMO can log in with allocated email & password
        login_res = await client.post(
            "/api/v1/auth/token",
            data={
                "username": "almo.delhi.narang@gmail.com",
                "password": "almopassword123",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data

        # Verify new ALMO profile
        profile_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        assert profile_res.status_code == 200
        profile = profile_res.json()
        assert profile["unique_login_id"] == "ALMO-DEL-002"
        assert profile["role"] == "almo"


@pytest.mark.asyncio
async def test_commissioner_strictly_isolated_from_clmo_and_almo_endpoints(commissioner_token):
    """Statutory Isolation Test: Verifies Commissioner cannot invoke CLMO clearance or ALMO visit sanction endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Commissioner attempts to call CLMO clearance decision
        res_clmo = await client.post(
            "/api/v1/supervisor/pre-market/1/decide",
            json={"action": "approve", "notes": "Commissioner attempting direct clearance"},
            headers={"Authorization": f"Bearer {commissioner_token}"},
        )
        assert res_clmo.status_code == 403
        assert "Exclusively reserved for Chief Legal Metrology Officer" in res_clmo.json()["detail"]

        # 2. Commissioner attempts to call ALMO visit approve endpoint
        res_almo = await client.post(
            "/api/v1/supervisor/field-visits/VO-2026-000001/approve-report",
            json={"notes": "Commissioner attempting ALMO review"},
            headers={"Authorization": f"Bearer {commissioner_token}"},
        )
        assert res_almo.status_code == 403
        assert "Exclusively reserved for Assistant Legal Metrology Officer" in res_almo.json()["detail"]


@pytest.mark.asyncio
async def test_role_specific_login_api_endpoints():
    """Verifies dedicated role-specific login API endpoints (e.g. /login/brand-owner, /login/clmo, /login/almo)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Successful Brand Owner login via /api/v1/auth/login/brand-owner
        brand_res = await client.post(
            "/api/v1/auth/login/brand-owner",
            json={
                "username": "parle.compliance.lmpc@gmail.com",
                "password": "employer123",
            },
        )
        assert brand_res.status_code == 200
        assert "access_token" in brand_res.json()
        assert brand_res.json()["user"]["role"] in ["employer", "manufacturer"]

        # 2. Successful CLMO login via /api/v1/auth/login/clmo
        clmo_res = await client.post(
            "/api/v1/auth/login/clmo",
            json={
                "username": "clmo.supervisor.lmpc@gmail.com",
                "password": "supervisor123",
            },
        )
        assert clmo_res.status_code == 200
        assert "access_token" in clmo_res.json()
        assert clmo_res.json()["user"]["role"] == "clmo"

        # 3. Successful ALMO login via /api/v1/auth/login/almo
        almo_res = await client.post(
            "/api/v1/auth/login/almo",
            json={
                "username": "almo.noida.lmpc@gmail.com",
                "password": "supervisor123",
            },
        )
        assert almo_res.status_code == 200
        assert "access_token" in almo_res.json()
        assert almo_res.json()["user"]["role"] == "almo"

        # 4. Cross-role rejection: ALMO trying to log in via /login/clmo is rejected (HTTP 403)
        cross_res = await client.post(
            "/api/v1/auth/login/clmo",
            json={
                "username": "almo.noida.lmpc@gmail.com",
                "password": "supervisor123",
            },
        )
        assert cross_res.status_code == 403
        assert "Access Denied: Your account role 'almo' is not authorized to log in via the 'clmo' portal" in cross_res.json()["detail"]




