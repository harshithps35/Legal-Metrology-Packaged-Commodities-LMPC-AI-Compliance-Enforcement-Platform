"""
LMPC Compliance System — Super Admin Governance Routes

Endpoints for:
1. AI Risk-Based Quota Recommendations
2. Atomic Batch Work Assignment Dispatch ("Verify & Assign All / OK")
3. Two-Tier Regulatory Sanction Queue & Digital Sign-off
4. User Management Directory (Inspectors & Employers)
5. Statutory Rules Matrix Catalog
"""

from datetime import datetime, timezone
from typing import Annotated, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import (
    AIRecommendationResponse,
    RuleDefinitionResponse,
    SanctionRequest,
    SanctionResponse,
    ScanDetailResponse,
    ScanSummaryResponse,
    UserResponse,
    WorkAssignmentBatchCreate,
    WorkAssignmentResponse,
)
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_super_admin
from app.db.models.models import (
    ApprovalStatus,
    AssignmentStatus,
    AuditEvent,
    RuleDefinition,
    Scan,
    User,
    UserRole,
    WorkAssignment,
)
from app.services.recommender_service import QuotaRecommenderService

router = APIRouter(prefix="/super-admin", tags=["Super Admin Governance"])


# ============================================================
# 1. AI Quota Recommendations & Batch Assignment
# ============================================================

@router.get("/ai-recommendations", response_model=AIRecommendationResponse)
async def get_ai_recommendations(
    current_user: Annotated[User, Depends(require_super_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    month: str = Query("2026-08", description="Month string e.g. '2026-08'"),
):
    """Generate risk-weighted quota recommendations for all regional inspectors."""
    recommendations = await QuotaRecommenderService.generate_monthly_recommendations(
        db=db,
        target_month_year=month,
    )
    return recommendations


@router.post("/assignments/batch", response_model=list[WorkAssignmentResponse])
async def batch_dispatch_assignments(
    payload: WorkAssignmentBatchCreate,
    current_user: Annotated[User, Depends(require_super_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Atomic batch dispatch of monthly work orders ("Verify & Assign All / OK").

    Wrapped in a strict database transaction: all assignments are created or none are.
    """
    if not payload.assignments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment list cannot be empty",
        )

    created_records: list[WorkAssignment] = []

    try:
        for item in payload.assignments:
            # Check for existing assignment in same month
            stmt = select(WorkAssignment).where(
                WorkAssignment.inspector_id == item.inspector_id,
                WorkAssignment.month_year == item.month_year,
                WorkAssignment.industry_category == item.industry_category,
            )
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()

            if existing:
                # Update existing quota
                existing.target_count = item.target_count
                existing.notes = item.notes
                existing.due_date = item.due_date
                created_records.append(existing)
            else:
                new_assignment = WorkAssignment(
                    super_admin_id=current_user.id,
                    inspector_id=item.inspector_id,
                    title=item.title,
                    industry_category=item.industry_category,
                    target_company=item.target_company,
                    target_count=item.target_count,
                    month_year=item.month_year,
                    due_date=item.due_date,
                    status=AssignmentStatus.ASSIGNED,
                    notes=item.notes,
                )
                db.add(new_assignment)
                created_records.append(new_assignment)

        await db.flush()

        # Build response with calculated completed counts
        results = []
        for a in created_records:
            completed_count = len(a.credits) if hasattr(a, "credits") and a.credits else 0
            results.append(
                WorkAssignmentResponse(
                    id=a.id,
                    super_admin_id=a.super_admin_id,
                    inspector_id=a.inspector_id,
                    title=a.title,
                    industry_category=a.industry_category,
                    target_company=a.target_company,
                    target_count=a.target_count,
                    completed_count=completed_count,
                    month_year=a.month_year,
                    due_date=a.due_date,
                    status=a.status.value,
                    notes=a.notes,
                    created_at=a.created_at,
                    inspector=UserResponse.model_validate(a.inspector) if a.inspector else None,
                )
            )

        return results

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Atomic batch dispatch failed: {str(e)}",
        )


@router.get("/assignments", response_model=list[WorkAssignmentResponse])
async def list_all_assignments(
    current_user: Annotated[User, Depends(require_super_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    month: Optional[str] = Query(None, description="Filter by YYYY-MM"),
):
    """List all dispatched work assignments across all state zones."""
    query = select(WorkAssignment)
    if month:
        query = query.where(WorkAssignment.month_year == month)

    res = await db.execute(query)
    assignments = res.scalars().all()

    results = []
    for a in assignments:
        completed = len(a.credits) if a.credits else 0
        results.append(
            WorkAssignmentResponse(
                id=a.id,
                super_admin_id=a.super_admin_id,
                inspector_id=a.inspector_id,
                title=a.title,
                industry_category=a.industry_category,
                target_company=a.target_company,
                target_count=a.target_count,
                completed_count=completed,
                month_year=a.month_year,
                due_date=a.due_date,
                status=a.status.value,
                notes=a.notes,
                created_at=a.created_at,
                inspector=UserResponse.model_validate(a.inspector) if a.inspector else None,
            )
        )
    return results


# ============================================================
# 2. Two-Tier Regulatory Sanction Queue
# ============================================================

@router.get("/pending-sanctions", response_model=list[ScanSummaryResponse])
async def get_pending_sanction_queue(
    current_user: Annotated[User, Depends(require_super_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Queue of critical violations and pre-market approval requests awaiting Super Admin sign-off."""
    stmt = select(Scan).where(Scan.approval_status == ApprovalStatus.PENDING_SANCTION)
    res = await db.execute(stmt)
    scans = res.scalars().all()
    return scans


@router.post("/scans/{scan_id}/sanction", response_model=SanctionResponse)
async def sanction_scan_verdict(
    scan_id: int,
    payload: SanctionRequest,
    current_user: Annotated[User, Depends(require_super_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Executive sign-off on high-stakes violation notices or packaging clearance certificates."""
    stmt = select(Scan).where(Scan.id == scan_id)
    res = await db.execute(stmt)
    scan = res.scalar_one_or_none()

    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    now = datetime.now(timezone.utc)
    scan.super_admin_reviewer_id = current_user.id
    scan.super_admin_review_notes = payload.notes
    scan.sanctioned_at = now

    if payload.action == "approve_notice":
        scan.approval_status = ApprovalStatus.SANCTIONED_APPROVED
        notice_num = f"LMPC-NOTICE-{scan.id:05d}-{now.strftime('%Y%m')}"
    elif payload.action == "grant_certificate":
        scan.approval_status = ApprovalStatus.SANCTIONED_APPROVED
        notice_num = f"LMPC-CERT-{scan.id:05d}-{now.strftime('%Y%m')}"
    elif payload.action == "request_reinspection":
        scan.approval_status = ApprovalStatus.REJECTED_REINSPECT
        notice_num = None
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid action: {payload.action}")

    await db.flush()

    return SanctionResponse(
        scan_id=scan.id,
        approval_status=scan.approval_status.value,
        super_admin_reviewer_id=current_user.id,
        sanctioned_at=now,
        notes=payload.notes,
        legal_notice_number=notice_num,
    )


# ============================================================
# 3. User Directory (Inspectors & Employers)
# ============================================================

@router.get("/users-directory", response_model=list[UserResponse])
async def get_users_directory(
    current_user: Annotated[User, Depends(require_super_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Directory of all registered inspectors and regional regulatory staff."""
    stmt = select(User).where(User.is_active == True).order_by(User.role, User.full_name)
    res = await db.execute(stmt)
    users = res.scalars().all()
    return users


# ============================================================
# 4. Statutory Rules Matrix Catalog
# ============================================================

@router.get("/rules", response_model=list[RuleDefinitionResponse])
async def get_statutory_rules_catalog(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: Optional[str] = Query(None, description="Filter rules by category"),
):
    """Public / internal endpoint to view the active Statutory Rules Reference Matrix."""
    query = select(RuleDefinition).where(RuleDefinition.is_active == True)
    if category and category != "all":
        query = query.where((RuleDefinition.category == "all") | (RuleDefinition.category == category))

    res = await db.execute(query)
    rules = res.scalars().all()
    return rules
