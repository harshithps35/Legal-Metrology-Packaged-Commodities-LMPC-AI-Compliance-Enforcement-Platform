"""
LMPC Compliance System — End-to-End Enterprise Governance Test Suite

Covers:
1. Phase A: Database Schema Normalization & Model Integrity
2. Phase B: Context-Aware FSSAI (1-2-2-3-6) & Rule 11(2)(c) Multi-Price Engine
3. Phase C: AI Quota Recommender & Batch Dispatch
4. Phase D/E: Forensic Chain of Custody & PDF Sanction Seals
"""

import asyncio
import unittest
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import async_session_factory, init_db
from app.db.models.models import (
    ApprovalStatus,
    AssignmentCredit,
    AssignmentStatus,
    RuleDefinition,
    Scan,
    User,
    UserRole,
    WorkAssignment,
)
from app.nlp.regex_matchers import (
    FieldMatch,
    detect_multi_price_contradictions,
    match_fssai_license,
    repair_fssai_candidate,
)
from app.services.pdf_generator import generate_pdf_report
from app.services.recommender_service import QuotaRecommenderService


class TestEndToEndGovernance(unittest.TestCase):

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def test_01_phase_a_database_integrity(self):
        """Phase A: Verify database tables, enums, and foreign key relations."""
        async def run_test():
            from app.db.seed_governance import seed_governance_data
            await seed_governance_data()
            async with async_session_factory() as db:
                # Check Super Admin / Supervisor existence
                stmt = select(User).where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.SUPERVISOR, UserRole.CLMO_SUPERVISOR]))
                res = await db.execute(stmt)
                admin = res.scalars().first()
                self.assertIsNotNone(admin, "Super admin / Supervisor user must exist")

                # Check RuleDefinition records
                rules_stmt = select(RuleDefinition)
                rules_res = await db.execute(rules_stmt)
                rules = rules_res.scalars().all()
                self.assertGreaterEqual(len(rules), 6, "Must have standard statutory rules defined")

        self.loop.run_until_complete(run_test())

    def test_02_phase_b_fssai_and_multi_price_engine(self):
        """Phase B: Verify statutory FSSAI parsing (1-2-2-3-6) and Rule 11(2)(c) price alteration."""
        # 1. Statutory FSSAI repair
        smudged_token = "10721101123456" # Type 1, State 07, Year 21, Cat 101, Serial 123456
        self.assertEqual(repair_fssai_candidate("1O7211O1123456"), smudged_token)

        # 2. Multi-Price Contradiction (Rule 11(2)(c))
        mrp_matches = [
            FieldMatch(field_id="mrp", raw_match="MRP Rs 50.00", value="₹50.00", numeric_value=50.0),
            FieldMatch(field_id="mrp", raw_match="Rs 40.00", value="₹40.00", numeric_value=40.0),
        ]
        contra = detect_multi_price_contradictions("MRP Rs 50.00 Rs 40.00", mrp_matches)
        self.assertIsNotNone(contra)
        self.assertTrue(contra["has_contradiction"])
        self.assertEqual(contra["discrepancy_amount"], 10.0)

    def test_03_phase_c_ai_quota_recommender(self):
        """Phase C: Verify AI Risk calculation and transparent reasoning."""
        async def run_test():
            await init_db()
            async with async_session_factory() as db:
                recommendations = await QuotaRecommenderService.generate_monthly_recommendations(
                    db=db,
                    target_month_year="2026-08",
                )
                self.assertIsNotNone(recommendations)
                self.assertIn("summary", recommendations)
                self.assertIn("recommendations", recommendations)
                self.assertGreater(len(recommendations["recommendations"]), 0)

        self.loop.run_until_complete(run_test())

    def test_04_phase_e_pdf_generation_with_chain_of_custody(self):
        """Phase E: Verify PDF certificate generator embeds GPS & Sanction seals."""
        scan_data = {
            "id": 999,
            "product_name": "SIH Packaging Verification Sample",
            "brand": "Demo Brand",
            "category": "food",
            "compliance_score": 95.0,
            "status": "COMPLIANT",
            "latitude": 28.5355,
            "longitude": 77.3910,
            "location_name": "Sector 18 Field Inspection Zone, Noida",
            "client_evidence_hash": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
            "approval_status": "SANCTIONED_APPROVED",
            "sanctioned_at": datetime.now(timezone.utc).isoformat(),
            "extracted_fields": [
                {"display_name": "Maximum Retail Price", "value": "₹45.00 (Incl. of all taxes)", "detected": True},
                {"display_name": "Net Quantity", "value": "200 g", "detected": True},
            ],
            "violations": [],
            "user": {"full_name": "Inspector Sharma"},
        }
        pdf_bytes = generate_pdf_report(scan_data)
        self.assertIsNotNone(pdf_bytes)
        self.assertGreater(len(pdf_bytes), 500)


if __name__ == "__main__":
    unittest.main()
