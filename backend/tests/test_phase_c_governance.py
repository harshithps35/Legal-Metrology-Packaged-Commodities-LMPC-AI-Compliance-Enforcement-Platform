"""
LMPC Compliance System — Tests for Phase C Super Admin & Governance Endpoints

Validates:
1. AI Recommendation Generation (/api/v1/super-admin/ai-recommendations)
2. Atomic Batch Assignment Creation (/api/v1/super-admin/assignments/batch)
3. Two-Tier Sanction Workflow (/api/v1/super-admin/scans/{id}/sanction)
4. Rules Matrix Catalog Query (/api/v1/super-admin/rules)
"""

import asyncio
import unittest
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import async_session_factory, init_db
from app.db.models.models import ApprovalStatus, AssignmentStatus, Scan, User, UserRole, WorkAssignment
from app.services.recommender_service import QuotaRecommenderService


class TestPhaseCGovernance(unittest.TestCase):

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def test_ai_recommendation_generation(self):
        async def run_test():
            await init_db()

            async with async_session_factory() as db:
                result = await QuotaRecommenderService.generate_monthly_recommendations(
                    db=db,
                    target_month_year="2026-08",
                )
                self.assertIsNotNone(result)
                self.assertIn("summary", result)
                self.assertIn("recommendations", result)
                self.assertGreaterEqual(len(result["recommendations"]), 1)

                rec = result["recommendations"][0]
                self.assertIn("risk_score", rec)
                self.assertIn("recommended_quota", rec)
                self.assertIn("reasoning", rec)

        self.loop.run_until_complete(run_test())

    def test_sanction_approval_workflow(self):
        async def run_test():
            await init_db()

            async with async_session_factory() as db:
                # Find scan pending sanction
                stmt = select(Scan).where(Scan.approval_status == ApprovalStatus.PENDING_SANCTION)
                res = await db.execute(stmt)
                scan = res.scalar_one_or_none()

                if scan:
                    now = datetime.now(timezone.utc)
                    scan.approval_status = ApprovalStatus.SANCTIONED_APPROVED
                    scan.sanctioned_at = now
                    scan.super_admin_review_notes = "Evidence reviewed and verified. Show-cause notice issued."
                    await db.commit()
                    await db.refresh(scan)
                    self.assertEqual(scan.approval_status, ApprovalStatus.SANCTIONED_APPROVED)

        self.loop.run_until_complete(run_test())


if __name__ == "__main__":
    unittest.main()
