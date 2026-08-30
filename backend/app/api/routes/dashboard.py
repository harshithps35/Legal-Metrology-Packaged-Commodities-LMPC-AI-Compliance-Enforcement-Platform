"""
LMPC Compliance System — Dashboard API Routes

Analytics and statistics endpoints for the dashboard UI.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import DashboardStatsResponse
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.models import Scan, ScanStatus, User, Violation, ViolationSeverity

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get aggregate compliance statistics for the dashboard.

    Admins see org-wide stats. Inspectors see their own stats.
    """
    base_query = select(Scan)
    if current_user.role.value != "admin":
        base_query = base_query.where(Scan.user_id == current_user.id)

    # Total scans
    total_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total_scans = total_result.scalar() or 0

    # Status counts
    status_query = (
        select(
            Scan.status,
            func.count().label("count"),
        )
        .group_by(Scan.status)
    )
    if current_user.role.value != "admin":
        status_query = status_query.where(Scan.user_id == current_user.id)

    status_result = await db.execute(status_query)
    status_counts = {row.status: row.count for row in status_result}

    compliant_count = status_counts.get(ScanStatus.COMPLIANT, 0)
    non_compliant_count = status_counts.get(ScanStatus.NON_COMPLIANT, 0)
    review_count = status_counts.get(ScanStatus.REQUIRES_REVIEW, 0)

    # Average compliance score
    avg_query = select(func.avg(Scan.compliance_score))
    if current_user.role.value != "admin":
        avg_query = avg_query.where(Scan.user_id == current_user.id)

    avg_result = await db.execute(avg_query)
    avg_score = avg_result.scalar() or 0.0

    # Most common violations (top 5)
    violation_query = (
        select(
            Violation.title,
            Violation.severity,
            func.count().label("count"),
        )
        .group_by(Violation.title, Violation.severity)
        .order_by(func.count().desc())
        .limit(5)
    )

    if current_user.role.value != "admin":
        violation_query = violation_query.join(Scan).where(Scan.user_id == current_user.id)

    violation_result = await db.execute(violation_query)
    most_common = [
        {
            "title": row.title,
            "severity": row.severity.value,
            "count": row.count,
        }
        for row in violation_result
    ]

    return DashboardStatsResponse(
        total_scans=total_scans,
        compliant_count=compliant_count,
        non_compliant_count=non_compliant_count,
        review_count=review_count,
        avg_compliance_score=round(float(avg_score), 1),
        most_common_violations=most_common,
    )
