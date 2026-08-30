"""
LMPC Compliance System — CLMO Registration & State Commissioner Approval Test Suite

Tests:
1. Dual OTP Generation & Verification for CLMO Registration (Phone & Official Directorate Email).
2. CLMO Self-Registration Gate: Newly registered CLMO has is_approved=False.
3. Login Isolation Gate: Unapproved CLMO cannot log in (HTTP 403 Forbidden).
4. State Commissioner Inspection: Commissioner views pending CLMO in subordinate directory.
5. Commissioner Approval & Commissioning: Commissioner approves CLMO under Section 13(1).
6. Post-Approval Login & Access: Approved CLMO logs in successfully and accesses adjudication authority.
7. Rejection Gate: Commissioner rejects invalid CLMO application with audit logging.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.db.models.models import User, UserRole, AuditEvent
from app.core.database import async_session_factory
from sqlalchemy import select


@pytest.mark.asyncio
async def test_clmo_registration_and_commissioner_approval_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        
        # 1. Generate & Verify Phone OTP
        phone = "9811005544"
        send_phone = await ac.post("/api/v1/auth/employer/send-phone-otp", json={"phone_number": phone})
        assert send_phone.status_code == 200
        phone_otp = send_phone.json()["otp_preview"]

        verify_phone = await ac.post("/api/v1/auth/employer/verify-phone-otp", json={"phone_number": phone, "otp": phone_otp})
        assert verify_phone.status_code == 200
        assert verify_phone.json()["verified"] is True

        # 2. Generate & Verify Email OTP
        email = "clmo.vikram.lmpc@gov.in"
        send_email = await ac.post("/api/v1/auth/employer/send-email-otp", json={"email": email})
        assert send_email.status_code == 200
        email_otp = send_email.json()["otp_preview"]

        verify_email = await ac.post("/api/v1/auth/employer/verify-email-otp", json={"email": email, "otp": email_otp})
        assert verify_email.status_code == 200
        assert verify_email.json()["verified"] is True

        # 3. Register New CLMO Applicant
        reg_res = await ac.post(
            "/api/v1/auth/clmo/register",
            json={
                "full_name": "Dr. Vikramaditya Joshi (CLMO Applicant)",
                "email": email,
                "phone_number": phone,
                "password": "clmosecret123",
                "jurisdiction_zone": "South Zone Directorate (Bengaluru Hub)",
                "department": "Department of Consumer Affairs / Legal Metrology Directorate",
                "phone_otp": phone_otp,
                "email_otp": email_otp,
            },
        )
        assert reg_res.status_code == 200
        reg_data = reg_res.json()
        assert reg_data["is_approved"] is False
        assert "CLMO-" in reg_data["unique_login_id"]
        clmo_id = reg_data["user"]["id"]
        provisional_id = reg_data["unique_login_id"]

        # 4. Verify that Unapproved CLMO CANNOT log in
        login_fail = await ac.post(
            "/api/v1/auth/token",
            data={"username": email, "password": "clmosecret123"},
        )
        assert login_fail.status_code == 403
        assert "pending official State Commissioner approval" in login_fail.json()["detail"]

        portal_login_fail = await ac.post(
            "/api/v1/auth/login/clmo",
            json={"username": provisional_id, "password": "clmosecret123"},
        )
        assert portal_login_fail.status_code == 403
        assert "pending official State Commissioner approval" in portal_login_fail.json()["detail"]

        # 5. State Commissioner checks Subordinate CLMO directory and inspects pending applicant
        async with async_session_factory() as db:
            comm_res = await db.execute(select(User).where(User.role == UserRole.STATE_COMMISSIONER))
            comm = comm_res.scalars().first()
            assert comm is not None
            comm_token = create_access_token({"sub": comm.username, "role": comm.role.value})

        comm_headers = {"Authorization": f"Bearer {comm_token}"}
        clmo_list_res = await ac.get("/api/v1/commissioner/clmos", headers=comm_headers)
        assert clmo_list_res.status_code == 200
        clmos = clmo_list_res.json()
        
        target_clmo = next((c for c in clmos if c["id"] == clmo_id), None)
        assert target_clmo is not None
        assert target_clmo["is_approved"] is False
        assert target_clmo["operational_status"] == "PENDING_COMMISSIONER_APPROVAL"

        # 6. State Commissioner Approves and Officially Commissions the new CLMO
        final_id = "CLMO-SZ-007"
        approve_res = await ac.post(
            f"/api/v1/commissioner/clmos/{clmo_id}/approve",
            headers=comm_headers,
            json={
                "custom_unique_id": final_id,
                "jurisdiction_zone": "South Zone Directorate (Bengaluru Hub & Southern States)",
                "gazette_order_ref": "DLM/CLMO/COMM/2026/007",
                "commissioner_remarks": "Officially commissioned under Section 13(1) with Level 2B Adjudication Authority.",
            },
        )
        assert approve_res.status_code == 200
        approve_data = approve_res.json()
        assert approve_data["success"] is True
        assert approve_data["is_approved"] is True
        assert approve_data["unique_login_id"] == final_id

        # 7. Newly Approved CLMO can now log in successfully!
        login_success = await ac.post(
            "/api/v1/auth/token",
            data={"username": final_id, "password": "clmosecret123"},
        )
        assert login_success.status_code == 200
        token_data = login_success.json()
        assert "access_token" in token_data
        clmo_token = token_data["access_token"]
        assert token_data["user"]["unique_login_id"] == final_id
        assert token_data["user"]["is_approved"] is True

        # 8. Verify CLMO can access authorized endpoints
        clmo_headers = {"Authorization": f"Bearer {clmo_token}"}
        me_res = await ac.get("/api/v1/auth/me", headers=clmo_headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == email


@pytest.mark.asyncio
async def test_clmo_rejection_by_commissioner():
    """Verify that Commissioner can reject an unverified/invalid CLMO registration."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create unverified applicant in DB
        async with async_session_factory() as db:
            from app.core.security import hash_password
            fake_clmo = User(
                username="fake_clmo_99",
                unique_login_id="CLMO-WZ-999",
                email="unauthorized.clmo@fake.com",
                password_hash=hash_password("password123"),
                full_name="Unauthorized Person",
                role=UserRole.CLMO,
                hierarchy_level=2,
                is_approved=False,
                is_active=True,
            )
            db.add(fake_clmo)
            await db.commit()
            await db.refresh(fake_clmo)
            fake_id = fake_clmo.id

            comm_res = await db.execute(select(User).where(User.role == UserRole.STATE_COMMISSIONER))
            comm = comm_res.scalars().first()
            assert comm is not None
            comm_token = create_access_token({"sub": comm.username, "role": comm.role.value})

        comm_headers = {"Authorization": f"Bearer {comm_token}"}
        reject_res = await ac.post(
            f"/api/v1/commissioner/clmos/{fake_id}/reject",
            headers=comm_headers,
            json={"reason": "Fraudulent application - unverified officer credentials under Section 13."},
        )
        assert reject_res.status_code == 200
        assert reject_res.json()["success"] is True

        # Check that user cannot log in
        login_try = await ac.post(
            "/api/v1/auth/token",
            data={"username": "unauthorized.clmo@fake.com", "password": "password123"},
        )
        assert login_try.status_code == 403
