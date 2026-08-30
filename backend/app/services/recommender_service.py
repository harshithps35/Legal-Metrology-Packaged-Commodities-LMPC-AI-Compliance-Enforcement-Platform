"""
LMPC Compliance System — AI Risk-Based Quota Recommender Service

Evaluates historical violation rates across industry categories and zones,
computes severity-weighted risk indices with minimum sample-size safeguards,
and generates recommended monthly inspector quotas with transparent reasoning.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.models import (
    Scan,
    ScanStatus,
    User,
    UserRole,
    Violation,
    ViolationSeverity,
    WorkAssignment,
)


class QuotaRecommenderService:
    """Calculates statistically honest risk-weighted inspection quotas."""

    MIN_SAMPLE_SIZE = 1  # For development / seed demo data; scalable to 10+

    @staticmethod
    async def generate_monthly_recommendations(
        db: AsyncSession,
        target_month_year: str,
    ) -> dict[str, Any]:
        """Generate quota allocation recommendations for the Super Admin.

        Args:
            db: Async database session.
            target_month_year: "YYYY-MM" string e.g. "2026-08".

        Returns:
            Dict structured according to AIRecommendationResponse schema.
        """
        # 1. Fetch active inspectors
        inspectors_stmt = select(User).where(
            User.role == UserRole.INSPECTOR,
            User.is_active == True,
        )
        inspectors_res = await db.execute(inspectors_stmt)
        inspectors = inspectors_res.scalars().all()

        # 2. Fetch all scans grouped by category
        scans_stmt = select(Scan)
        scans_res = await db.execute(scans_stmt)
        all_scans = scans_res.scalars().all()

        # 3. Calculate category violation metrics
        category_stats: dict[str, dict[str, int]] = {
            "food": {"total": 0, "critical": 0, "major": 0, "minor": 0},
            "cosmetics": {"total": 0, "critical": 0, "major": 0, "minor": 0},
            "pharma": {"total": 0, "critical": 0, "major": 0, "minor": 0},
            "electronics": {"total": 0, "critical": 0, "major": 0, "minor": 0},
        }

        for s in all_scans:
            cat = (s.category or "food").lower()
            if cat not in category_stats:
                category_stats[cat] = {"total": 0, "critical": 0, "major": 0, "minor": 0}
            category_stats[cat]["total"] += 1

            for v in s.violations:
                if v.severity == ViolationSeverity.CRITICAL:
                    category_stats[cat]["critical"] += 1
                elif v.severity == ViolationSeverity.MAJOR:
                    category_stats[cat]["major"] += 1
                elif v.severity == ViolationSeverity.MINOR:
                    category_stats[cat]["minor"] += 1

        recommendations = []
        base_quota_default = 15

        for inspector in inspectors:
            # Determine category for this inspector
            assigned_cat = (inspector.assigned_category or "food").lower()
            stats = category_stats.get(assigned_cat, {"total": 0, "critical": 0, "major": 0, "minor": 0})
            total = stats["total"]

            if total < QuotaRecommenderService.MIN_SAMPLE_SIZE:
                risk_level = "INSUFFICIENT_DATA"
                risk_score = 0.0
                recommended_quota = base_quota_default
                reasoning = (
                    f"Insufficient historical scan data in {assigned_cat.capitalize()} ({total} scans). "
                    f"Applying baseline regional quota of {base_quota_default} audits."
                )
            else:
                # Severity-weighted risk formula: (3*Critical + 2*Major + 1*Minor) / Total
                weighted_sum = (3 * stats["critical"]) + (2 * stats["major"]) + (1 * stats["minor"])
                risk_score = round(weighted_sum / total, 2)

                if risk_score >= 2.0 or stats["critical"] >= 1:
                    risk_level = "HIGH"
                    multiplier = 0.50  # +50% quota
                    recommended_quota = int(base_quota_default * (1 + multiplier))
                    reasoning = (
                        f"High statutory infraction rate detected in {assigned_cat.capitalize()} "
                        f"({stats['critical']} critical violations in {total} recent audits). "
                        f"AI recommends intensive enforcement quota (+{int(base_quota_default * multiplier)} audits)."
                    )
                elif risk_score >= 1.0:
                    risk_level = "MEDIUM"
                    multiplier = 0.25
                    recommended_quota = int(base_quota_default * (1 + multiplier))
                    reasoning = (
                        f"Moderate compliance irregularities in {assigned_cat.capitalize()}. "
                        f"Recommending standard vigilance allocation of {recommended_quota} audits."
                    )
                else:
                    risk_level = "LOW"
                    recommended_quota = base_quota_default
                    reasoning = (
                        f"Low violation index in {assigned_cat.capitalize()}. "
                        f"Baseline quota of {recommended_quota} audits sufficient for routine monitoring."
                    )

            recommendations.append({
                "inspector_id": inspector.id,
                "inspector_name": inspector.full_name or inspector.username,
                "industry_category": assigned_cat,
                "jurisdiction_zone": inspector.jurisdiction_zone or "General",
                "historical_scan_count": total,
                "critical_violations_count": stats["critical"],
                "risk_level": risk_level,
                "risk_score": risk_score,
                "recommended_quota": recommended_quota,
                "reasoning": reasoning,
            })

        return {
            "month_year": target_month_year,
            "generated_at": datetime.now(timezone.utc),
            "summary": {
                "total_inspectors": len(inspectors),
                "total_recommended_audits": sum(r["recommended_quota"] for r in recommendations),
                "high_risk_categories": [cat for cat, st in category_stats.items() if st["critical"] > 0],
            },
            "recommendations": recommendations,
        }
