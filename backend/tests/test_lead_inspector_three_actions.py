import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.models.models import User, UserRole, PreMarketApplication, PreMarketStatus
from app.core.security import create_access_token
from app.core.database import async_session_factory
from sqlalchemy import select

@pytest.mark.asyncio
async def test_lead_inspector_three_actions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        async with async_session_factory() as session:
            # 1. Fetch or create inspector user
            user_res = await session.execute(select(User).where(User.role == UserRole.INSPECTOR))
            inspector = user_res.scalars().first()
            if not inspector:
                inspector = User(
                    email="test_lead_inspector@gov.in",
                    username="lead_inspector_test",
                    full_name="Lead Inspector Test",
                    role=UserRole.INSPECTOR,
                    is_active=True,
                    is_verified=True,
                    is_approved_by_supervisor=True,
                )
                session.add(inspector)
                await session.commit()
                await session.refresh(inspector)

            token = create_access_token({"sub": inspector.email, "role": inspector.role.value})
            headers = {"Authorization": f"Bearer {token}"}

            # Fetch or create employer
            emp_res = await session.execute(select(User).where(User.role == UserRole.EMPLOYER))
            employer = emp_res.scalars().first()
            if not employer:
                employer = User(
                    email="test_brand@parle.com",
                    username="parle_test",
                    full_name="Parle Test",
                    role=UserRole.EMPLOYER,
                    is_active=True,
                    is_verified=True,
                )
                session.add(employer)
                await session.commit()
                await session.refresh(employer)

            # Create test application
            pm_app = PreMarketApplication(
                employer_id=employer.id,
                assigned_inspector_id=inspector.id,
                product_name="Lead Inspector Action Test Snack",
                brand="Parle",
                category="food",
                packaging_type="Pouch",
                declared_mrp=20.0,
                declared_net_quantity="50 g",
                artwork_file_path="/uploads/artwork_sample.png",
                status=PreMarketStatus.FIELD_VISIT_COMPLETED,
            )
            session.add(pm_app)
            await session.commit()
            await session.refresh(pm_app)
            app_id = pm_app.id

        # Action 1: Approved and Sent to ALMO
        res1 = await ac.post(
            f"/api/v1/inspector/pre-market/{app_id}/verify",
            headers=headers,
            json={
                "decision": "FORWARD_TO_ALMO",
                "inspector_notes": "Lead Inspector verified. Approved and sent to ALMO.",
            },
        )
        assert res1.status_code == 200, res1.text
        data1 = res1.json()
        assert data1["status"] == "pending_almo_sanction"
        assert "approved" in data1["message"].lower() or "forwarded" in data1["message"].lower()

        # Action 2: Re-Field Visit: Send Back to Sub-Inspector
        res2 = await ac.post(
            f"/api/v1/inspector/pre-market/{app_id}/verify",
            headers=headers,
            json={
                "decision": "RE_FIELD_VISIT",
                "visit_recommended": True,
                "visit_justification": "Inconclusive caliper font height measurement. Squad re-audit needed.",
                "inspector_notes": "Re-inspection mandated on production line.",
            },
        )
        assert res2.status_code == 200, res2.text
        data2 = res2.json()
        assert data2["status"] == "visit_sanctioned"
        assert "sub-inspector squad" in data2["message"].lower()

        # Action 3: Reject and Send it to Desk
        res3 = await ac.post(
            f"/api/v1/inspector/pre-market/{app_id}/verify",
            headers=headers,
            json={
                "decision": "SEND_TO_DESK",
                "inspector_notes": "Declarations non-compliant under Rule 6. Rejected and sent to Resolution Desk.",
                "deficiency_directive": "Declarations non-compliant under Rule 6.",
                "deficiencies": ["Font height breach", "Missing manufacturer details"],
            },
        )
        assert res3.status_code == 200, res3.text
        data3 = res3.json()
        assert data3["status"] == "pending_inspector"
        assert "deficiency memo" in data3["message"].lower() or "resolution desk" in data3["message"].lower()
