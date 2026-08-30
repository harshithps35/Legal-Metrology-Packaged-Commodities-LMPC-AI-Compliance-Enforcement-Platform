"""
LMPC Compliance System — Multi-Tier Portal Integration Test

Validates:
1. Unique ID Authentication for Supervisor (SUP-HQ-001), Inspector (INSP-DEL-042), and Employer (EMP-PARLE-101)
2. Supervisor Live Inspector Directory & Quota Tracking
3. Supervisor Live Employer Directory & Packaging Lines Oversight
4. Inspector Assigned Employers & Active Products Under Audit Pipeline
5. Employer Pre-Market Clearance Application Submission
6. Supervisor Executive Decision Gate & Certificate Issuance
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.main import app
from app.core.database import get_db, Base
from app.db.models.models import User, UserRole, PreMarketApplication, PreMarketStatus, ProductAudit
from app.core.security import get_password_hash


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DB_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as db:
        # 1. Supervisor
        sup = User(
            username="dr_roy",
            unique_login_id="SUP-HQ-001",
            email="supervisor@legalmetrology.gov.in",
            hashed_password=get_password_hash("supervisor123"),
            full_name="Dr. Ananya Roy",
            role=UserRole.SUPERVISOR,
            jurisdiction_zone="Directorate Headquarters",
        )
        db.add(sup)

        # 2. Field Inspector
        insp = User(
            username="sharma_insp",
            unique_login_id="INSP-DEL-042",
            email="sharma@delhi.gov.in",
            hashed_password=get_password_hash("inspector123"),
            full_name="Rajesh Sharma",
            role=UserRole.INSPECTOR,
            jurisdiction_zone="North Zone",
            assigned_category="food",
        )
        db.add(insp)
        await db.flush()

        # 3. Employer
        emp = User(
            username="parle_compliance",
            unique_login_id="EMP-PARLE-101",
            email="regulatory@parle.biz",
            hashed_password=get_password_hash("employer123"),
            full_name="Vikram Seth",
            company_name="Parle Products Pvt Ltd",
            role=UserRole.EMPLOYER,
            gstin_fssai_id="07AAACP1234F1Z5",
            jurisdiction_zone="North Zone Packaging Unit",
            assigned_category="food",
            assigned_inspector_id=insp.id,
        )
        db.add(emp)
        await db.flush()

        # 4. Product Audit
        prod = ProductAudit(
            inspector_id=insp.id,
            employer_id=emp.id,
            product_name="Parle-G Glucose Biscuits (100g)",
            brand="Parle-G",
            category="food",
            batch_number="B2608-P01",
            mrp=10.0,
            net_quantity="100 g",
            gtin_barcode="8901719101015",
        )
        db.add(prod)
        await db.commit()

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_multi_tier_portals_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Login with Unique IDs
        # 1A. Supervisor Login via SUP-HQ-001
        sup_login = await client.post(
            "/api/v1/auth/token",
            data={"username": "SUP-HQ-001", "password": "supervisor123"},
        )
        assert sup_login.status_code == 200, sup_login.text
        sup_token = sup_login.json()["access_token"]
        sup_headers = {"Authorization": f"Bearer {sup_token}"}

        # 1B. Inspector Login via INSP-DEL-042
        insp_login = await client.post(
            "/api/v1/auth/token",
            data={"username": "INSP-DEL-042", "password": "inspector123"},
        )
        assert insp_login.status_code == 200, insp_login.text
        insp_token = insp_login.json()["access_token"]
        insp_headers = {"Authorization": f"Bearer {insp_token}"}

        # 1C. Employer Login via EMP-PARLE-101
        emp_login = await client.post(
            "/api/v1/auth/token",
            data={"username": "EMP-PARLE-101", "password": "employer123"},
        )
        assert emp_login.status_code == 200, emp_login.text
        emp_token = emp_login.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}

        # Step 2: Supervisor Directory Checks
        # 2A. Supervisor checks Inspector Directory
        insp_dir_res = await client.get("/api/v1/supervisor/inspectors?month=2026-08", headers=sup_headers)
        assert insp_dir_res.status_code == 200
        inspectors = insp_dir_res.json()
        assert len(inspectors) >= 1
        assert inspectors[0]["unique_login_id"] == "INSP-DEL-042"

        # 2B. Supervisor checks Employer Directory
        emp_dir_res = await client.get("/api/v1/supervisor/employers", headers=sup_headers)
        assert emp_dir_res.status_code == 200
        employers = emp_dir_res.json()
        assert len(employers) >= 1
        assert employers[0]["company_name"] == "Parle Products Pvt Ltd"
        assert len(employers[0]["products"]) >= 1

        # Step 3: Inspector checks Assigned Employers & Active Products Pipeline
        assigned_emp_res = await client.get("/api/v1/inspector/assigned-employers", headers=insp_headers)
        assert assigned_emp_res.status_code == 200
        assert len(assigned_emp_res.json()) >= 1

        pipeline_res = await client.get("/api/v1/inspector/products-pipeline", headers=insp_headers)
        assert pipeline_res.status_code == 200
        prods = pipeline_res.json()
        assert len(prods) >= 1
        assert prods[0]["product_name"] == "Parle-G Glucose Biscuits (100g)"

        # Step 4: Employer Submits Pre-Market Packaging Clearance Application
        submit_pm_res = await client.post(
            "/api/v1/employer/pre-market/submit",
            headers=emp_headers,
            json={
                "product_name": "Parle Festive Gold Cookies",
                "brand": "Parle",
                "category": "food",
                "packaging_type": "Tin Box",
                "declared_mrp": 150.0,
                "declared_net_quantity": "300 g",
                "artwork_file_path": "/uploads/festive_gold.png",
            },
        )
        assert submit_pm_res.status_code == 200, submit_pm_res.text
        pm_app_id = submit_pm_res.json()["id"]

        # Step 5: Supervisor Reviews Queue and Grants Clearance Certificate
        pm_queue_res = await client.get("/api/v1/supervisor/pre-market-queue", headers=sup_headers)
        assert pm_queue_res.status_code == 200
        queue = pm_queue_res.json()
        assert len(queue) >= 1

        decision_res = await client.post(
            f"/api/v1/supervisor/pre-market/{pm_app_id}/decide",
            headers=sup_headers,
            json={
                "action": "approve",
                "notes": "Artwork reviewed against Rule 6 and Schedule II. 100% compliant. Clearance granted.",
            },
        )
        assert decision_res.status_code == 200
        assert decision_res.json()["status"] == "approved_certified"
        assert "LMPC/PMC/" in decision_res.json()["certificate_number"]

        # Step 6: Employer retrieves approved Certificate
        emp_apps_res = await client.get("/api/v1/employer/my-applications", headers=emp_headers)
        assert emp_apps_res.status_code == 200
        apps = emp_apps_res.json()
        assert apps[0]["status"] == "approved_certified"
        assert apps[0]["certificate_number"] is not None
