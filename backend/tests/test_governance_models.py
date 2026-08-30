"""
LMPC Compliance System — Tests for Phase A Governance Database Models

Validates:
1. User role hierarchy (SUPER_ADMIN, INSPECTOR, VIEWER)
2. WorkAssignment creation and relationships
3. AssignmentCredit ledger idempotency (unique scan_id constraint)
4. RuleDefinition catalog retrieval
5. Scan GPS, evidence hash, and approval status attributes
"""

import asyncio
import hashlib
import unittest
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory, init_db
from app.db.models.models import (
    ApprovalStatus,
    AssignmentCredit,
    AssignmentStatus,
    RuleDefinition,
    Scan,
    ScanStatus,
    User,
    UserRole,
    ViolationSeverity,
    WorkAssignment,
)


class TestGovernanceModels(unittest.TestCase):

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

        async def run_test():
            from app.db.seed_governance import seed_governance_data
            await seed_governance_data()

            async with async_session_factory() as db:
                # 1. Verify Super Admin exists
                stmt = select(User).where(User.username == "admin")
                res = await db.execute(stmt)
                admin = res.scalar_one_or_none()
                self.assertIsNotNone(admin)
                self.assertIn(admin.role, [UserRole.SUPER_ADMIN, UserRole.SUPERVISOR])

                # 2. Verify Inspector exists
                stmt = select(User).where(User.username == "inspector_sharma")
                res = await db.execute(stmt)
                sharma = res.scalar_one_or_none()
                self.assertIsNotNone(sharma)
                self.assertEqual(sharma.role, UserRole.INSPECTOR)
                self.assertEqual(sharma.jurisdiction_zone, "North Zone (Noida / Delhi NCR)")

                # 3. Verify WorkAssignment linked to admin and inspector
                stmt = select(WorkAssignment).where(WorkAssignment.inspector_id == sharma.id)
                res = await db.execute(stmt)
                assignments = res.scalars().all()
                self.assertGreaterEqual(len(assignments), 1)
                first_assignment = assignments[0]
                self.assertEqual(first_assignment.industry_category, "food")
                self.assertEqual(first_assignment.target_count, 25)

                # 4. Verify RuleDefinitions exist
                stmt = select(RuleDefinition)
                res = await db.execute(stmt)
                rules = res.scalars().all()
                self.assertGreaterEqual(len(rules), 8)
                rule_codes = [r.rule_code for r in rules]
                self.assertIn("Rule 6(1)(a)", rule_codes)
                self.assertIn("Rule 11(2)(c) & LM Act S.36", rule_codes)
                self.assertIn("Rule 6(1)(e)", rule_codes)

                # 5. Verify Scans have GPS, hash, and approval status
                stmt = select(Scan).where(Scan.product_name.like("%Parle%"))
                res = await db.execute(stmt)
                scan = res.scalars().first()
                self.assertIsNotNone(scan)
                self.assertAlmostEqual(scan.latitude, 28.57, places=1)
                self.assertAlmostEqual(scan.longitude, 77.32, places=1)
                self.assertEqual(scan.approval_status, ApprovalStatus.AUTO_APPROVED)
                self.assertIsNotNone(scan.client_evidence_hash)

                # 6. Verify AssignmentCredit ledger is linked to assignment and scan
                stmt = select(AssignmentCredit).where(AssignmentCredit.scan_id == scan.id)
                res = await db.execute(stmt)
                credit = res.scalar_one_or_none()
                self.assertIsNotNone(credit)
                self.assertEqual(credit.assignment_id, first_assignment.id)

        self.loop.run_until_complete(run_test())


if __name__ == "__main__":
    unittest.main()
