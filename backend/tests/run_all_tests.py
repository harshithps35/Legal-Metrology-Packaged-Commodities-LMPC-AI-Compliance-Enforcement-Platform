"""
LMPC Compliance System — Master Test Suite Runner

Runs:
1. Curated Packaging Demonstration Samples (4 Scenarios)
2. Governance Schema & DB Models Verification
3. AI Risk-Weighted Quota Recommender Service
4. Regulatory Sanction Service (Show-Cause Notice)
5. Immutable Assignment Credit Ledger & Auto-Approval Gate
6. Multi-Tier Portals End-to-End Workflow (Supervisor, Inspector, Employer)
"""

import os
import sys
import unittest
import asyncio

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tests.test_curated_packaging_samples import TestCuratedPackagingSamples
from tests.test_governance_models import TestGovernanceModels
from tests.test_end_to_end_governance import TestEndToEndGovernance

from app.db.models.models import User, UserRole, PreMarketApplication, PreMarketStatus, ProductAudit
from app.core.database import get_db, Base
from app.core.security import hash_password
from app.main import app
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker


class TestMultiTierPortalsAsync(unittest.TestCase):
    def test_multi_tier_workflow(self):
        asyncio.run(self._async_test())

    async def _async_test(self):
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        TestingSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

        async def override_get_db():
            async with TestingSessionLocal() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with TestingSessionLocal() as db:
            # 1. Supervisor
            sup = User(
                username="dr_roy",
                unique_login_id="SUP-HQ-001",
                email="supervisor@legalmetrology.gov.in",
                password_hash=hash_password("supervisor123"),
                full_name="Dr. Ananya Roy",
                role=UserRole.SUPERVISOR,
                jurisdiction_zone="Directorate Headquarters",
            )
            db.add(sup)

            # 2. Inspector
            insp = User(
                username="sharma_insp",
                unique_login_id="INSP-DEL-042",
                email="sharma@delhi.gov.in",
                password_hash=hash_password("inspector123"),
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
                password_hash=hash_password("employer123"),
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

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Login with Unique IDs
            # 1A. Supervisor
            sup_res = await client.post("/api/v1/auth/token", data={"username": "SUP-HQ-001", "password": "supervisor123"})
            self.assertEqual(sup_res.status_code, 200)
            sup_token = sup_res.json()["access_token"]
            sup_headers = {"Authorization": f"Bearer {sup_token}"}

            # 1B. Inspector
            insp_res = await client.post("/api/v1/auth/token", data={"username": "INSP-DEL-042", "password": "inspector123"})
            self.assertEqual(insp_res.status_code, 200)
            insp_token = insp_res.json()["access_token"]
            insp_headers = {"Authorization": f"Bearer {insp_token}"}

            # 1C. Employer
            emp_res = await client.post("/api/v1/auth/token", data={"username": "EMP-PARLE-101", "password": "employer123"})
            self.assertEqual(emp_res.status_code, 200)
            emp_token = emp_res.json()["access_token"]
            emp_headers = {"Authorization": f"Bearer {emp_token}"}

            # 2. Supervisor checks live directories
            insp_dir = await client.get("/api/v1/supervisor/inspectors?month=2026-08", headers=sup_headers)
            self.assertEqual(insp_dir.status_code, 200)
            self.assertEqual(insp_dir.json()[0]["unique_login_id"], "INSP-DEL-042")

            emp_dir = await client.get("/api/v1/supervisor/employers", headers=sup_headers)
            self.assertEqual(emp_dir.status_code, 200)
            self.assertEqual(emp_dir.json()[0]["company_name"], "Parle Products Pvt Ltd")

            # 3. Inspector checks assigned employers & products pipeline
            assigned_emp = await client.get("/api/v1/inspector/assigned-employers", headers=insp_headers)
            self.assertEqual(assigned_emp.status_code, 200)
            self.assertGreaterEqual(len(assigned_emp.json()), 1)

            prods = await client.get("/api/v1/inspector/products-pipeline", headers=insp_headers)
            self.assertEqual(prods.status_code, 200)
            self.assertEqual(prods.json()[0]["product_name"], "Parle-G Glucose Biscuits (100g)")

            # 4. Employer submits pre-market packaging clearance application
            pm_res = await client.post(
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
            self.assertEqual(pm_res.status_code, 200)
            app_id = pm_res.json()["id"]

            # 5. Supervisor grants Pre-Market Clearance Certificate
            decision = await client.post(
                f"/api/v1/supervisor/pre-market/{app_id}/decide",
                headers=sup_headers,
                json={"action": "approve", "notes": "100% compliant under Rule 6 and Schedule II."},
            )
            self.assertEqual(decision.status_code, 200)
            self.assertEqual(decision.json()["status"], "approved_certified")
            self.assertIn("LMPC/PMC/", decision.json()["certificate_number"])

            # 6. Employer retrieves granted Certificate
            my_apps = await client.get("/api/v1/employer/my-applications", headers=emp_headers)
            self.assertEqual(my_apps.status_code, 200)
            self.assertEqual(my_apps.json()[0]["status"], "approved_certified")
class TestStatutoryHierarchyAndFieldVisits(unittest.TestCase):
    def test_field_visits_and_hierarchy(self):
        asyncio.run(self._async_test())

    async def _async_test(self):
        from app.db.models.models import FieldVisitOrder

        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        TestingSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

        async def override_get_db():
            async with TestingSessionLocal() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with TestingSessionLocal() as db:
            clmo = User(
                username="clmo_anil",
                unique_login_id="CLMO-NZ-001",
                email="clmo.anil@lmpc.gov.in",
                password_hash=hash_password("supervisor123"),
                full_name="Dr. Anil Verma (CLMO)",
                role=UserRole.CLMO_SUPERVISOR,
                hierarchy_level=2,
                is_approved=True,
            )
            insp = User(
                username="lmi_rajesh",
                unique_login_id="INSP-DEL-042",
                email="inspector.rajesh@lmpc.gov.in",
                password_hash=hash_password("inspector123"),
                full_name="Rajesh Sharma (LMI)",
                role=UserRole.INSPECTOR,
                hierarchy_level=3,
                is_approved=True,
            )
            sub_insp = User(
                username="asst_sanjay",
                unique_login_id="ASST-DEL-012",
                email="sub.sanjay@lmpc.gov.in",
                password_hash=hash_password("inspector123"),
                full_name="Sanjay Kumar (Sub-Inspector)",
                role=UserRole.SUB_INSPECTOR,
                hierarchy_level=4,
                is_approved=True,
            )
            mfr = User(
                username="parle_vikram",
                unique_login_id="EMP-PARLE-101",
                email="parle.vikram@parle.com",
                password_hash=hash_password("employer123"),
                full_name="Vikram Seth",
                company_name="Parle Products Pvt Ltd",
                role=UserRole.EMPLOYER,
                hierarchy_level=6,
                is_approved=True,
            )
            db.add_all([clmo, insp, sub_insp, mfr])
            await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Login CLMO, Inspector, and Manufacturer
            r_clmo = await client.post("/api/v1/auth/token", data={"username": "CLMO-NZ-001", "password": "supervisor123"})
            self.assertEqual(r_clmo.status_code, 200)
            clmo_h = {"Authorization": f"Bearer {r_clmo.json()['access_token']}"}

            r_insp = await client.post("/api/v1/auth/token", data={"username": "INSP-DEL-042", "password": "inspector123"})
            self.assertEqual(r_insp.status_code, 200)
            insp_h = {"Authorization": f"Bearer {r_insp.json()['access_token']}"}

            r_mfr = await client.post("/api/v1/auth/token", data={"username": "EMP-PARLE-101", "password": "employer123"})
            self.assertEqual(r_mfr.status_code, 200)
            mfr_h = {"Authorization": f"Bearer {r_mfr.json()['access_token']}"}

            # 2. Manufacturer submits pre-market application
            pm_res = await client.post(
                "/api/v1/employer/pre-market/submit",
                headers=mfr_h,
                json={
                    "product_name": "Marie Gold Biscuits (100g Pouch)",
                    "brand": "Parle",
                    "category": "food",
                    "packaging_type": "Heat-Sealed Pouch",
                    "declared_mrp": 10.0,
                    "declared_net_quantity": "100 g",
                    "artwork_file_path": "/uploads/marie_gold.png",
                },
            )
            self.assertEqual(pm_res.status_code, 200)
            app_id = pm_res.json()["id"]

            # 3. Inspector creates Field Visit Order (mandated on Major/Critical breaches)
            vo_res = await client.post(
                "/api/v1/field-visits/orders",
                headers=insp_h,
                json={
                    "application_id": app_id,
                    "scheduled_date": "2026-08-30",
                    "scheduled_time": "11:30 AM",
                    "visit_location_name": "Parle Noida Production Facility (Plant #2)",
                    "visit_location_type": "MANUFACTURING_PLANT",
                    "visit_address": "Plot 42, Sector 18 Industrial Area, Noida, UP",
                    "visit_trigger_reason": "Rule 11(2)(c) Sticker Overprint & Schedule II Font Deficiency (<2.0mm)",
                },
            )
            self.assertEqual(vo_res.status_code, 200)
            visit_id = vo_res.json()["visit_id"]
            self.assertEqual(vo_res.json()["visit_status"], "SCHEDULED")

            # 4. Start Visit & Submit On-Site Caliper Report
            start_res = await client.patch(f"/api/v1/field-visits/orders/{visit_id}/start", headers=insp_h)
            self.assertEqual(start_res.status_code, 200)

            rep_res = await client.post(
                f"/api/v1/field-visits/orders/{visit_id}/submit-report",
                headers=insp_h,
                json={
                    "caliper_font_measurement_mm": 2.4,
                    "physical_net_weight_grams": 102.5,
                    "batch_records_cross_checked": True,
                    "physical_tampering_confirmed": False,
                    "visit_recommendation": "APPROVE_WITH_CONDITIONS",
                    "on_site_inspector_remarks": "On-site plant inspection confirmed direct pre-print packaging. Vernier caliper measurement = 2.4mm (Pass >= 2.0mm). Batch QA records checked.",
                },
            )
            self.assertEqual(rep_res.status_code, 200)
            self.assertEqual(rep_res.json()["visit_status"], "COMPLETED")

            # 5. CLMO approves and issues official clearance certificate
            decide_res = await client.post(
                f"/api/v1/supervisor/pre-market/{app_id}/decide",
                headers=clmo_h,
                json={
                    "action": "approve",
                    "notes": "Field visit completed & verified with vernier caliper. Pre-market clearance certificate granted.",
                },
            )
            self.assertEqual(decide_res.status_code, 200)
            self.assertEqual(decide_res.json()["status"], "approved_certified")
            self.assertIn("LMPC/PMC/", decide_res.json()["certificate_number"])
            print("\n  [PASS] Statutory Hierarchy & Field Visit Trigger Engine End-to-End Test")


if __name__ == "__main__":
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    suite.addTest(loader.loadTestsFromTestCase(TestCuratedPackagingSamples))
    suite.addTest(loader.loadTestsFromTestCase(TestGovernanceModels))
    suite.addTest(loader.loadTestsFromTestCase(TestEndToEndGovernance))
    suite.addTest(loader.loadTestsFromTestCase(TestMultiTierPortalsAsync))
    suite.addTest(loader.loadTestsFromTestCase(TestStatutoryHierarchyAndFieldVisits))
    
    print("\n" + "=" * 70)
    print("  LMPC COMPLIANCE SYSTEM — EXHAUSTIVE TEST SUITE")
    print("=" * 70)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
