"""
LMPC Compliance System — Database Seeder

Seeds the database with realistic demonstration inspection records
for the SIH Demo Scenarios:
1. Demo 1: Clean Compliant Product (Parle-G Gold) -> COMPLIANT (95%)
2. Demo 2: Non-Compliant Product (Crispy Chips) -> NON_COMPLIANT (38%)
3. Demo 3: Review Required / Glared Input (Himalaya Face Wash) -> REQUIRES_REVIEW (62%)
4. Demo 4: Expired Beverage Bottle (AquaPure Juice) -> NON_COMPLIANT (42%)
"""

import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory, init_db
from app.core.security import hash_password
from app.db.models.models import (
    User, UserRole, Scan, ScanStatus, ExtractedField, Violation, ViolationSeverity
)


async def seed_demo_data():
    """Seed sample demonstration records into the database."""
    await init_db()

    async with async_session_factory() as session:
        # 1. Create or get Demo Inspector User
        res = await session.execute(select(User).where(User.username == "inspector1"))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                username="inspector1",
                email="inspector1@gov.in",
                password_hash=hash_password("password123"),
                full_name="Inspector Harshith R.",
                role=UserRole.INSPECTOR,
                department="Legal Metrology Enforcement Wing",
                is_active=True,
            )
            session.add(user)
            await session.flush()

        # Check if scans already seeded
        res_scans = await session.execute(select(Scan).where(Scan.user_id == user.id))
        if len(res_scans.scalars().all()) >= 4:
            print("Demo data already seeded!")
            return

        now = datetime.now(timezone.utc)

        # -------------------------------------------------------------
        # DEMO 1: Clean Compliant Biscuit Label
        # -------------------------------------------------------------
        scan1 = Scan(
            user_id=user.id,
            product_name="Parle-G Gold Glucose Biscuits",
            brand="Parle",
            category="food",
            status=ScanStatus.COMPLIANT,
            compliance_score=96.0,
            image_url="",
            raw_ocr_text=(
                "Parle-G Gold Glucose Biscuits\n"
                "Net Quantity: 200 g\n"
                "MRP Rs. 30.00 (Inclusive of all taxes)\n"
                "Mfg Date: 06/2026\n"
                "Best Before 9 Months from packaging\n"
                "Mfd By: Parle Products Pvt Ltd, Mumbai 400057\n"
                "Consumer Care Cell: 1800-222-777 | care@parle.biz\n"
                "Batch No: PK2606A1\n"
                "FSSAI Lic. No: 10012022000145"
            ),
            calibration_method="calibrated",
            created_at=now - timedelta(hours=2),
        )
        session.add(scan1)
        await session.flush()

        demo1_fields = [
            ("commodity_name", "Parle-G Gold Glucose Biscuits", 0.98, {"x": 45, "y": 25, "w": 420, "h": 40}, 3.8, "compliant"),
            ("net_quantity", "200 g", 0.95, {"x": 45, "y": 75, "w": 180, "h": 28}, 2.6, "compliant"),
            ("mrp", "₹30.00", 0.96, {"x": 45, "y": 115, "w": 140, "h": 26}, 2.4, "compliant"),
            ("tax_declaration", "Inclusive of all taxes", 0.94, {"x": 195, "y": 115, "w": 220, "h": 22}, 2.0, "compliant"),
            ("manufacturer_info", "Parle Products Pvt Ltd, Mumbai 400057", 0.92, {"x": 45, "y": 150, "w": 380, "h": 24}, 2.1, "compliant"),
            ("date_manufacture", "06/2026", 0.93, {"x": 45, "y": 185, "w": 160, "h": 24}, 2.2, "compliant"),
            ("consumer_care", "1800-222-777 | care@parle.biz", 0.91, {"x": 45, "y": 220, "w": 360, "h": 22}, 2.0, "compliant"),
            ("batch_lot_number", "PK2606A1", 0.89, {"x": 45, "y": 250, "w": 140, "h": 20}, None, None),
        ]
        for fid, val, conf, bb, f_mm, f_stat in demo1_fields:
            session.add(ExtractedField(
                scan_id=scan1.id,
                field_name=fid,
                field_value=val,
                confidence=conf,
                bounding_box=bb,
                font_size_mm=f_mm,
                font_status=f_stat,
                measurement_method="calibrated"
            ))

        # -------------------------------------------------------------
        # DEMO 2: Non-Compliant Snack with Dual Pricing & Small Font
        # -------------------------------------------------------------
        scan2 = Scan(
            user_id=user.id,
            product_name="Crispy Masala Potato Chips",
            brand="CrunchCo",
            category="food",
            status=ScanStatus.NON_COMPLIANT,
            compliance_score=38.0,
            image_url="",
            raw_ocr_text=(
                "CrunchCo Crispy Masala Potato Chips\n"
                "Net Wt. 85g\n"
                "MRP ₹20.00\n"
                "Special Price ₹25.00\n"
                "Mfg: Jan 2026\n"
                "Packed by CrunchCo Snacks, Okhla Phase III\n"
            ),
            calibration_method="relative",
            created_at=now - timedelta(days=1, hours=4),
        )
        session.add(scan2)
        await session.flush()

        demo2_fields = [
            ("commodity_name", "Crispy Masala Potato Chips", 0.92, {"x": 40, "y": 30, "w": 380, "h": 32}, 2.8, "compliant"),
            ("net_quantity", "85g", 0.88, {"x": 40, "y": 80, "w": 120, "h": 18}, 1.2, "non_compliant"),
            ("mrp", "₹20.00", 0.85, {"x": 40, "y": 110, "w": 110, "h": 16}, 1.1, "non_compliant"),
            ("tax_declaration", None, 0.0, None, None, None),
            ("consumer_care", None, 0.0, None, None, None),
            ("date_manufacture", "01/2026", 0.81, {"x": 40, "y": 140, "w": 130, "h": 18}, 1.3, "borderline"),
            ("manufacturer_info", "CrunchCo Snacks, Okhla Phase III", 0.76, {"x": 40, "y": 170, "w": 340, "h": 20}, None, None),
        ]
        for fid, val, conf, bb, f_mm, f_stat in demo2_fields:
            session.add(ExtractedField(
                scan_id=scan2.id,
                field_name=fid,
                field_value=val,
                confidence=conf,
                bounding_box=bb,
                font_size_mm=f_mm,
                font_status=f_stat,
                measurement_method="relative"
            ))

        demo2_violations = [
            ("Rule 6(3)", "mrp", ViolationSeverity.CRITICAL, "Dual Pricing Detected", "Multiple conflicting prices printed on package (₹20.00 vs ₹25.00).", "Ensure only a single unambiguous MRP is declared."),
            ("Rule 6(1)(c) proviso", "tax_declaration", ViolationSeverity.MAJOR, "Missing Tax Inclusion Clause", "MRP printed without mandatory '(Inclusive of all taxes)' declaration.", "Affix statutory inclusive of all taxes clause."),
            ("Rule 6(1)(d)", "consumer_care", ViolationSeverity.CRITICAL, "Missing Consumer Care Helpline", "No consumer grievance phone number or email address found.", "Print consumer care toll-free number and email address."),
            ("Rule 9 / Schedule II", "net_quantity", ViolationSeverity.MAJOR, "Font Height Below Legal Threshold", "Net quantity font measures 1.2mm, below the 2.0mm minimum mandated by Schedule II.", "Increase typography font height to >= 2.0mm."),
        ]
        for code, fid, sev, tit, desc, rec in demo2_violations:
            session.add(Violation(
                scan_id=scan2.id,
                rule_code=code,
                field_id=fid,
                severity=sev,
                title=tit,
                description=desc,
                recommendation=rec,
            ))

        # -------------------------------------------------------------
        # DEMO 3: Glared / Occluded Label requiring Inspector Review
        # -------------------------------------------------------------
        scan3 = Scan(
            user_id=user.id,
            product_name="Himalaya Purifying Neem Face Wash",
            brand="Himalaya",
            category="cosmetics",
            status=ScanStatus.REQUIRES_REVIEW,
            compliance_score=68.0,
            image_url="",
            raw_ocr_text=(
                "Himalaya Purifying Neem Face Wash\n"
                "Vol: 100 ml\n"
                "MRP ₹140.00 (Incl. of all taxes)\n"
                "Batch: H...32\n"
                "Customer Care: contactus@himalayawellness.com\n"
            ),
            calibration_method="relative",
            created_at=now - timedelta(days=2),
        )
        session.add(scan3)
        await session.flush()

        demo3_fields = [
            ("commodity_name", "Himalaya Purifying Neem Face Wash", 0.94, {"x": 50, "y": 30, "w": 400, "h": 35}, 3.0, "compliant"),
            ("net_quantity", "100 ml", 0.89, {"x": 50, "y": 80, "w": 140, "h": 22}, 1.9, "borderline"),
            ("mrp", "₹140.00", 0.91, {"x": 50, "y": 115, "w": 130, "h": 22}, 2.0, "compliant"),
            ("tax_declaration", "Incl. of all taxes", 0.87, {"x": 190, "y": 115, "w": 180, "h": 20}, 1.8, "compliant"),
            ("consumer_care", "contactus@himalayawellness.com", 0.58, {"x": 50, "y": 150, "w": 320, "h": 18}, None, None),
            ("date_manufacture", None, 0.0, None, None, None),
        ]
        for fid, val, conf, bb, f_mm, f_stat in demo3_fields:
            session.add(ExtractedField(
                scan_id=scan3.id,
                field_name=fid,
                field_value=val,
                confidence=conf,
                bounding_box=bb,
                font_size_mm=f_mm,
                font_status=f_stat,
                measurement_method="relative"
            ))

        session.add(Violation(
            scan_id=scan3.id,
            rule_code="Rule 6(1)(e)",
            field_id="date_manufacture",
            severity=ViolationSeverity.MAJOR,
            title="Manufacture Date Unreadable",
            description="Manufacture date region is obscured by glare or reflection.",
            recommendation="Inspector verification required via manual input.",
        ))

        # -------------------------------------------------------------
        # DEMO 4: Expired Fruit Juice Beverage
        # -------------------------------------------------------------
        scan4 = Scan(
            user_id=user.id,
            product_name="AquaPure Mango Nectar Drink",
            brand="AquaPure",
            category="food",
            status=ScanStatus.NON_COMPLIANT,
            compliance_score=42.0,
            image_url="",
            raw_ocr_text=(
                "AquaPure Mango Nectar Drink\n"
                "Net Qty: 500 ml\n"
                "MRP ₹40.00 (Inclusive of all taxes)\n"
                "Mfg: 01/2023\n"
                "Expiry Date: 01/2024\n"
                "Mfd by AquaPure Beverages, Pune\n"
                "Helpline: 020-2445899"
            ),
            calibration_method="relative",
            created_at=now - timedelta(days=3),
        )
        session.add(scan4)
        await session.flush()

        demo4_fields = [
            ("commodity_name", "AquaPure Mango Nectar Drink", 0.95, {"x": 40, "y": 30, "w": 360, "h": 32}, 3.0, "compliant"),
            ("net_quantity", "500 ml", 0.92, {"x": 40, "y": 80, "w": 160, "h": 24}, 2.2, "non_compliant"), # 500ml requires 4mm
            ("mrp", "₹40.00", 0.94, {"x": 40, "y": 120, "w": 140, "h": 22}, 2.1, "compliant"),
            ("tax_declaration", "Inclusive of all taxes", 0.90, {"x": 190, "y": 120, "w": 200, "h": 20}, 2.0, "compliant"),
            ("date_manufacture", "01/2023", 0.88, {"x": 40, "y": 160, "w": 140, "h": 20}, 2.0, "compliant"),
            ("date_expiry", "01/2024", 0.90, {"x": 40, "y": 195, "w": 150, "h": 20}, 2.0, "compliant"),
            ("consumer_care", "020-2445899", 0.86, {"x": 40, "y": 230, "w": 180, "h": 20}, 2.0, "compliant"),
            ("manufacturer_info", "AquaPure Beverages, Pune", 0.89, {"x": 40, "y": 265, "w": 320, "h": 20}, 2.0, "compliant"),
        ]
        for fid, val, conf, bb, f_mm, f_stat in demo4_fields:
            session.add(ExtractedField(
                scan_id=scan4.id,
                field_name=fid,
                field_value=val,
                confidence=conf,
                bounding_box=bb,
                font_size_mm=f_mm,
                font_status=f_stat,
                measurement_method="relative"
            ))

        demo4_violations = [
            ("Rule 6(1)(f)", "date_expiry", ViolationSeverity.CRITICAL, "Product Expired", "Product expiry date (01/2024) has lapsed. Commercial sale is prohibited.", "Immediate seizure & withdrawal from distribution."),
            ("Rule 9 / Schedule II", "net_quantity", ViolationSeverity.MAJOR, "Font Size Below Schedule II Minimum", "500ml package requires >= 4.0mm typography height; measured 2.2mm.", "Revise label printing blocks to conform to Schedule II table."),
        ]
        for code, fid, sev, tit, desc, rec in demo4_violations:
            session.add(Violation(
                scan_id=scan4.id,
                rule_code=code,
                field_id=fid,
                severity=sev,
                title=tit,
                description=desc,
                recommendation=rec,
            ))

        await session.commit()
        print("Successfully seeded all 4 SIH Demo Scenarios into database!")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
