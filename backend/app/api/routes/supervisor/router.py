"""
LMPC Compliance System — Supervisor API Router

Comprehensive Directorate Governance Endpoints:
1. AI Risk-Weighted Quota Allocations & Batch Work Order Dispatch
2. Live Inspector Directory with Work Orders, Quotas, and Real-Time GPS Tracking
3. Live Employer / Enterprise Directory with Active Packaging Lines & Pre-Market Submissions
4. Two-Tier Regulatory Sanctions (Legal Show-Cause Notices)
5. Pre-Market Packaging Clearance Application Review & Decision Gate
6. Statutory Rules Matrix Catalog
"""

import io
from datetime import datetime, timezone
from typing import Annotated, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas import (
    AIRecommendationResponse,
    BatchWorkAssignmentCreate,
    BatchWorkAssignmentResponse,
    InspectorApproveRequest,
    InspectorCommissionRequest,
    RuleDefinitionResponse,
    SanctionDecisionRequest,
    SanctionDecisionResponse,
    SupervisorCommissionRequest,
    CLMOCommissionRequest,
    ALMOCommissionRequest,
    ALMOApproveRequest,
    UserResponse,
    WorkAssignmentResponse,
)
from app.core.config import normalize_image_url
from app.core.database import get_db
from app.core.dependencies import get_current_active_user

from app.core.security import hash_password
from app.db.models.models import (
    ApprovalStatus,
    AssignmentCredit,
    AssignmentStatus,
    PreMarketApplication,
    PreMarketStatus,
    ProductAudit,
    RuleDefinition,
    Scan,
    ScanStatus,
    User,
    UserRole,
    Violation,
    ViolationSeverity,
    WorkAssignment,
    OfficerWarrant,
    Notification,
)
from app.services.recommender_service import QuotaRecommenderService

router = APIRouter(prefix="/supervisor", tags=["Supervisor Governance"])


# ---------- Supervisor Role Enforcement Dependency ----------
async def require_supervisor(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    if current_user.role not in [
        UserRole.SUPERVISOR,
        UserRole.CLMO_SUPERVISOR,
        UserRole.CLMO,
        UserRole.ALMO,
        UserRole.SUPERINTENDENT,
        UserRole.SUB_INSPECTOR,
        UserRole.RESOLUTION_DESK,
        UserRole.STATE_COMMISSIONER,
        UserRole.DIRECTOR,
        UserRole.ADMIN,
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Requires Directorate Supervisor / CLMO / ALMO authority.",
        )
    return current_user


class PreMarketDecisionRequest(BaseModel):
    action: str
    notes: Optional[str] = None
    verification_method: Optional[str] = None


@router.post("/pre-market/{application_id}/decide")
async def decide_pre_market(
    application_id: int,
    payload: PreMarketDecisionRequest,
    current_user: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Supervisor/ALMO grants or rejects pre-market clearance certificate."""
    from app.db.models.models import PreMarketApplication, PreMarketStatus
    import uuid

    res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == application_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Pre-market application not found.")

    now = datetime.now(timezone.utc)
    act = payload.action.lower().strip()
    if act in ["approve", "grant", "certify", "issue_certificate", "issue certificate"]:
        cert_no = f"LMPC/PMC/2026/{uuid.uuid4().hex[:6].upper()}"
        app.status = PreMarketStatus.APPROVED_CERTIFIED
        app.certificate_number = cert_no
        app.supervisor_notes = payload.notes or "100% compliant under Rule 6 and Schedule II."
        app.supervisor_signed_at = now
        if payload.verification_method:
            app.verification_method = payload.verification_method
    elif act in ["re_clarification", "clarification", "re-clarification", "re clarification"]:
        app.status = PreMarketStatus.REJECTED_REVISE
        app.certificate_number = None
        app.supervisor_notes = payload.notes or "Sent back for statutory re-clarification."
    elif act in ["reject", "sanction"]:
        app.status = PreMarketStatus.REJECTED_SANCTIONED
        app.certificate_number = None
        app.supervisor_notes = payload.notes or "Pre-market application rejected."

    await db.commit()
    await db.refresh(app)
    return {
        "id": app.id,
        "product_name": app.product_name,
        "status": app.status.value if hasattr(app.status, "value") else str(app.status),
        "certificate_number": app.certificate_number,
        "message": f"Pre-market application decision: {app.status}",
    }


# ---------- CLMO Role Enforcement (Level 2 Clearance & Adjudication Authority) ----------
async def require_clmo(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    if current_user.role not in [
        UserRole.CLMO,
        UserRole.CLMO_SUPERVISOR,
        UserRole.ADMIN,
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Exclusively reserved for Chief Legal Metrology Officer (CLMO - Level 2). Other authorities cannot perform packaging clearance adjudications.",
        )
    return current_user


# ---------- ALMO Role Enforcement (Level 3 Sanctioning Authority) ----------
async def require_almo(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    if current_user.role not in [
        UserRole.ALMO,
        UserRole.SUPERINTENDENT,
        UserRole.ADMIN,
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Exclusively reserved for Assistant Legal Metrology Officer (ALMO - Level 3). Other authorities cannot sanction field visit orders.",
        )
    return current_user


# ---------- 1. AI Quota Recommendations ----------
@router.get("/ai-recommendations", response_model=AIRecommendationResponse)
async def get_ai_quota_recommendations_endpoint(
    month: str = Query(..., description="Target audit month in YYYY-MM format"),
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Generate risk-weighted AI quota distribution based on historical violation heatmaps."""
    return await QuotaRecommenderService.generate_monthly_recommendations(db=db, target_month_year=month)


# ---------- 2. Atomic Batch Work Order Dispatch ----------
@router.post("/assignments/batch", response_model=BatchWorkAssignmentResponse)
async def batch_dispatch_assignments(
    payload: BatchWorkAssignmentCreate,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Atomically commit and dispatch work orders to regional field inspectors."""
    if not payload.assignments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignments list cannot be empty.",
        )

    dispatched = []
    try:
        for a in payload.assignments:
            assignment = WorkAssignment(
                super_admin_id=supervisor.id,
                inspector_id=a.inspector_id,
                title=a.title,
                industry_category=a.industry_category.lower(),
                target_company=a.target_company,
                target_count=a.target_count,
                month_year=a.month_year,
                due_date=a.due_date,
                status=AssignmentStatus.ASSIGNED,
                notes=a.notes,
            )
            db.add(assignment)
            await db.flush()
            dispatched.append(assignment)

        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Atomic batch dispatch failed: {str(e)}",
        )

    assignment_responses = [
        WorkAssignmentResponse(
            id=a.id,
            super_admin_id=a.super_admin_id,
            inspector_id=a.inspector_id,
            title=a.title,
            industry_category=a.industry_category,
            target_company=a.target_company,
            target_count=a.target_count,
            completed_count=0,
            month_year=a.month_year,
            due_date=a.due_date,
            status=a.status.value if hasattr(a.status, "value") else str(a.status),
            notes=a.notes,
            created_at=a.created_at or datetime.now(timezone.utc),
            inspector=None,
        )
        for a in dispatched
    ]

    return BatchWorkAssignmentResponse(
        dispatched_count=len(dispatched),
        message=f"Successfully dispatched {len(dispatched)} work assignments across regional inspectors.",
        assignments=assignment_responses,
    )


# ---------- 3. Live Inspector Oversight Directory ----------
@router.get("/inspectors")
async def get_inspectors_oversight_directory(
    month: str = Query("2026-08", description="Audit month YYYY-MM"),
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive live roster of all field inspectors with quotas, progress, and last scan GPS."""
    res = await db.execute(select(User).where(User.role == UserRole.INSPECTOR))
    inspectors = res.scalars().all()

    result = []
    for insp in inspectors:
        # Get active work assignments for the month
        assign_res = await db.execute(
            select(WorkAssignment).where(
                WorkAssignment.inspector_id == insp.id,
                WorkAssignment.month_year == month,
            )
        )
        assignments = assign_res.scalars().all()

        total_target = sum(a.target_count for a in assignments)
        
        # Count verified credits
        credit_res = await db.execute(
            select(func.count(AssignmentCredit.id))
            .join(WorkAssignment, AssignmentCredit.assignment_id == WorkAssignment.id)
            .where(
                WorkAssignment.inspector_id == insp.id,
                WorkAssignment.month_year == month,
            )
        )
        total_completed = credit_res.scalar() or 0

        # Get last active scan
        last_scan_res = await db.execute(
            select(Scan)
            .where(Scan.user_id == insp.id)
            .order_by(Scan.created_at.desc())
            .limit(1)
        )
        last_scan = last_scan_res.scalar_one_or_none()

        result.append({
            "id": insp.id,
            "unique_login_id": insp.unique_login_id or f"INSP-{insp.id:03d}",
            "full_name": insp.full_name or insp.username,
            "username": insp.username,
            "email": insp.email,
            "phone_number": insp.phone_number or "N/A",
            "is_approved": getattr(insp, "is_approved", True),
            "is_active": insp.is_active,
            "jurisdiction_zone": insp.jurisdiction_zone or "General Zone",
            "assigned_category": insp.assigned_category or "all",
            "monthly_target": total_target,
            "completed_audits": total_completed,
            "completion_percent": round((total_completed / total_target * 100), 1) if total_target > 0 else 0,
            "active_tasks_count": len(assignments),
            "last_active_at": last_scan.created_at.strftime("%Y-%m-%d %H:%M UTC") if last_scan else "No audits yet",
            "last_location": last_scan.location_name if last_scan else "N/A",
            "last_gps": f"{last_scan.latitude:.4f}, {last_scan.longitude:.4f}" if last_scan and last_scan.latitude else "N/A",
            "tasks": [
                {
                    "id": a.id,
                    "title": a.title,
                    "target_count": a.target_count,
                    "industry_category": a.industry_category,
                    "status": a.status.value,
                }
                for a in assignments
            ],
        })

    return result


@router.get("/almo/subordinate-inspectors")
async def get_almo_subordinate_inspectors(
    current_user: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns directory of all subordinate field officers working under the ALMO:
    - Lead Legal Metrology Inspectors (LMI - Level 4)
    - Sub-Inspectors & Field Visit Squad Officers (Level 5)
    - Compliance Resolution Desk Officers (Level 5)
    """
    from app.db.models.models import FieldVisitOrder, PreMarketApplication

    res = await db.execute(
        select(User).where(
            User.role.in_([
                UserRole.INSPECTOR,
                UserRole.SUB_INSPECTOR,
                UserRole.RESOLUTION_DESK,
            ])
        ).order_by(User.id.asc())
    )
    officers = res.scalars().all()

    result = []
    for off in officers:
        role_str = off.role.value if hasattr(off.role, "value") else str(off.role)
        level_tag = "L4 LEAD INSPECTOR" if role_str == "inspector" else ("L5 RESOLUTION DESK" if role_str == "resolution_desk" else "L5 SUB-INSPECTOR")

        # Count assigned visits for sub-inspectors
        vo_res = await db.execute(
            select(func.count(FieldVisitOrder.id)).where(FieldVisitOrder.assigned_sub_inspector_id == off.id)
        )
        assigned_visits = vo_res.scalar() or 0

        # Count completed visits
        vo_comp_res = await db.execute(
            select(func.count(FieldVisitOrder.id)).where(
                FieldVisitOrder.assigned_sub_inspector_id == off.id,
                FieldVisitOrder.visit_status.in_(["COMPLETED", "APPROVED_BY_ALMO", "VERIFIED_COMPLIANT"])
            )
        )
        completed_visits = vo_comp_res.scalar() or 0

        # Count verified pre-market apps for lead inspectors
        app_res = await db.execute(
            select(func.count(PreMarketApplication.id)).where(PreMarketApplication.assigned_inspector_id == off.id)
        )
        verified_apps = app_res.scalar() or 0

        result.append({
            "id": off.id,
            "unique_login_id": off.unique_login_id or f"OFF-{off.id:03d}",
            "full_name": off.full_name or off.username,
            "username": off.username,
            "email": off.email,
            "phone_number": off.phone_number or "N/A",
            "role": role_str,
            "level_tag": level_tag,
            "department": off.department or ("Lead Enforcement Inspectorate" if role_str == "inspector" else "Field Squad & On-site Verification"),
            "jurisdiction_zone": off.jurisdiction_zone or "Regional Enforcement District",
            "assigned_category": off.assigned_category or "all",
            "is_active": off.is_active,
            "is_approved": getattr(off, "is_approved", True),
            "assigned_visits_count": assigned_visits,
            "completed_visits_count": completed_visits,
            "verified_applications_count": verified_apps,
            "created_at": off.created_at.strftime("%Y-%m-%d %H:%M UTC") if off.created_at else "N/A",
        })

    return result


# ---------- 3B. Approve or Reject Inspector / Sub-Inspector Onboarding ----------
@router.get("/almo/pending-inspectors")
async def get_almo_pending_inspectors(
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """List all candidate Lead Inspectors and Sub-Inspectors waiting for ALMO statutory verification."""
    res = await db.execute(
        select(User).where(
            User.role.in_([UserRole.INSPECTOR, UserRole.SUB_INSPECTOR, UserRole.RESOLUTION_DESK]),
            User.is_approved == False,
        ).order_by(User.id.desc())
    )
    candidates = res.scalars().all()

    result = []
    for c in candidates:
        role_str = c.role.value if hasattr(c.role, "value") else str(c.role)
        level_tag = "L4 LEAD INSPECTOR" if role_str == "inspector" else ("L5 RESOLUTION DESK" if role_str == "resolution_desk" else "L5 SUB-INSPECTOR")
        result.append({
            "id": c.id,
            "unique_login_id": c.unique_login_id or f"PENDING-{c.id:03d}",
            "full_name": c.full_name or c.username,
            "username": c.username,
            "email": c.email,
            "phone_number": c.phone_number or "N/A",
            "role": role_str,
            "level_tag": level_tag,
            "department": c.department,
            "jurisdiction_zone": c.jurisdiction_zone,
            "assigned_category": c.assigned_category or "all",
            "is_active": c.is_active,
            "is_approved": False,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M UTC") if c.created_at else "N/A",
        })

    return result


@router.post("/inspectors/{inspector_id}/approve")
async def approve_inspector_commission(
    inspector_id: int,
    payload: Optional[InspectorApproveRequest] = None,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Officially verify, assign Permanent ID, and commission an Inspector or Sub-Inspector (ALMO Level 3)."""
    res = await db.execute(
        select(User).where(
            User.id == inspector_id,
            User.role.in_([UserRole.INSPECTOR, UserRole.SUB_INSPECTOR, UserRole.RESOLUTION_DESK])
        )
    )
    inspector = res.scalar_one_or_none()
    if not inspector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspector or Sub-Inspector officer application not found.",
        )

    # 1. Determine zone code
    zone = (payload.jurisdiction_zone if payload and payload.jurisdiction_zone else inspector.jurisdiction_zone) or "North Zone (Delhi NCR)"
    zone_code = "DEL"
    if "West" in zone or "Mumbai" in zone:
        zone_code = "MUM"
    elif "South" in zone or "Bangalore" in zone or "Bengaluru" in zone:
        zone_code = "BLR"
    elif "East" in zone or "Kolkata" in zone:
        zone_code = "KOL"
    elif "Noida" in zone:
        zone_code = "NOI"

    prefix = "INSP" if inspector.role == UserRole.INSPECTOR else ("DESK" if inspector.role == UserRole.RESOLUTION_DESK else "ASST")

    # 2. Supervisor-assigned or generated Unique Inspector ID
    if payload and payload.custom_unique_id and payload.custom_unique_id.strip():
        final_unique_id = payload.custom_unique_id.strip().upper()
    else:
        # Generate sequential zoned ID
        insp_count_res = await db.execute(select(func.count(User.id)).where(User.role == inspector.role, User.is_approved == True))
        insp_count = insp_count_res.scalar() or 0
        final_unique_id = f"{prefix}-{zone_code}-{insp_count + 1:03d}"

    # Update inspector record
    inspector.unique_login_id = final_unique_id
    inspector.username = final_unique_id.lower()
    if payload and payload.jurisdiction_zone:
        inspector.jurisdiction_zone = payload.jurisdiction_zone
    if payload and payload.assigned_category:
        inspector.assigned_category = payload.assigned_category
    inspector.is_approved = True
    inspector.is_active = True

    # Audit event
    from app.db.models.models import AuditEvent
    audit = AuditEvent(
        event_type="INSPECTOR_COMMISSIONED_BY_ALMO",
        entity_type="User",
        entity_id=inspector.id,
        actor_id=supervisor.id,
        details={
            "commissioned_officer_id": inspector.unique_login_id,
            "commissioned_role": inspector.role.value if hasattr(inspector.role, "value") else str(inspector.role),
            "approved_by_almo": supervisor.unique_login_id or supervisor.username,
        },
        event_hash=uuid4().hex,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(inspector)

    return {
        "success": True,
        "inspector_id": inspector.id,
        "unique_login_id": inspector.unique_login_id,
        "full_name": inspector.full_name,
        "email": inspector.email,
        "jurisdiction_zone": inspector.jurisdiction_zone,
        "assigned_by": supervisor.full_name or supervisor.username,
        "is_approved": True,
        "message": f"Officer {inspector.full_name} officially verified and commissioned under Permanent ID {inspector.unique_login_id} by ALMO {supervisor.full_name or supervisor.username}.",
    }


@router.post("/commission-inspector")
async def commission_new_inspector(
    payload: InspectorCommissionRequest,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Directly generate ID and commission a new Field Inspector (Issued by working Supervisor)."""
    clean_email = payload.email.strip().lower()
    clean_phone = payload.phone_number.strip().replace(" ", "").replace("-", "")

    existing = await db.execute(select(User).where(User.email == clean_email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An officer with this official email is already registered.",
        )

    # Determine Zone Code
    zone_code = "DEL"
    if "West" in payload.jurisdiction_zone or "Mumbai" in payload.jurisdiction_zone:
        zone_code = "MUM"
    elif "South" in payload.jurisdiction_zone or "Bangalore" in payload.jurisdiction_zone:
        zone_code = "BLR"
    elif "East" in payload.jurisdiction_zone or "Kolkata" in payload.jurisdiction_zone:
        zone_code = "KOL"

    if payload.custom_unique_id and payload.custom_unique_id.strip():
        final_unique_id = payload.custom_unique_id.strip().upper()
    else:
        insp_count_res = await db.execute(select(func.count(User.id)).where(User.role == UserRole.INSPECTOR))
        insp_count = insp_count_res.scalar() or 0
        final_unique_id = f"INSP-{zone_code}-{insp_count + 41:03d}"

    new_inspector = User(
        username=final_unique_id.lower(),
        unique_login_id=final_unique_id,
        email=clean_email,
        phone_number=clean_phone,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        department=payload.department or "Legal Metrology Enforcement Directorate",
        jurisdiction_zone=payload.jurisdiction_zone,
        assigned_category=payload.assigned_category or "all",
        role=UserRole.INSPECTOR,
        is_active=True,
        is_approved=True,  # Officially granted and commissioned by supervisor!
    )

    db.add(new_inspector)
    await db.commit()
    await db.refresh(new_inspector)

    return {
        "success": True,
        "inspector_id": new_inspector.id,
        "unique_login_id": new_inspector.unique_login_id,
        "full_name": new_inspector.full_name,
        "email": new_inspector.email,
        "commissioned_by": supervisor.full_name or supervisor.username,
        "commissioned_by_id": supervisor.unique_login_id,
        "message": f"Inspector {new_inspector.full_name} successfully commissioned under ID {new_inspector.unique_login_id} by Supervisor {supervisor.full_name or supervisor.username}.",
    }


@router.post("/inspectors/{inspector_id}/reject")
async def reject_inspector_commission(
    inspector_id: int,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Reject or revoke an inspector or sub-inspector registration."""
    res = await db.execute(
        select(User).where(
            User.id == inspector_id,
            User.role.in_([UserRole.INSPECTOR, UserRole.SUB_INSPECTOR, UserRole.RESOLUTION_DESK])
        )
    )
    inspector = res.scalar_one_or_none()
    if not inspector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer application not found.",
        )

    inspector.is_approved = False
    inspector.is_active = False
    await db.commit()

    return {
        "success": True,
        "inspector_id": inspector.id,
        "unique_login_id": inspector.unique_login_id,
        "is_approved": False,
        "message": f"Inspector registration for {inspector.full_name or inspector.username} rejected.",
    }


# ---------- 4. Live Employer / Enterprise Directory ----------
@router.get("/employers")
async def get_employers_oversight_directory(
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Directory of all registered manufacturers with active packaging lines & pre-market submissions."""
    res = await db.execute(select(User).where(User.role == UserRole.EMPLOYER))
    employers = res.scalars().all()

    result = []
    for emp in employers:
        # Get active products under audit
        prods_res = await db.execute(select(ProductAudit).where(ProductAudit.employer_id == emp.id))
        products = prods_res.scalars().all()

        # Get pre-market applications
        pm_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.employer_id == emp.id))
        pre_markets = pm_res.scalars().all()

        # Get assigned inspector
        inspector_name = "Regional Inspectorate"
        if emp.assigned_inspector_id:
            insp_res = await db.execute(select(User).where(User.id == emp.assigned_inspector_id))
            insp = insp_res.scalar_one_or_none()
            if insp:
                inspector_name = insp.full_name or insp.username

        result.append({
            "id": emp.id,
            "unique_login_id": emp.unique_login_id or f"EMP-{emp.id:03d}",
            "company_name": emp.company_name or emp.full_name or emp.username,
            "contact_person": emp.full_name,
            "email": emp.email,
            "gstin_fssai_id": emp.gstin_fssai_id or "Registered",
            "jurisdiction_zone": emp.jurisdiction_zone or "State Jurisdiction",
            "assigned_category": emp.assigned_category or "food",
            "assigned_inspector": inspector_name,
            "active_products_count": len(products),
            "pre_market_submissions_count": len(pre_markets),
            "products": [
                {
                    "id": p.id,
                    "product_name": p.product_name,
                    "brand": p.brand,
                    "batch_number": p.batch_number,
                    "mrp": p.mrp,
                    "status": p.status.value,
                }
                for p in products
            ],
            "pre_market_applications": [
                {
                    "id": pm.id,
                    "product_name": pm.product_name,
                    "status": pm.status.value,
                    "certificate_number": pm.certificate_number,
                }
                for pm in pre_markets
            ],
        })

    return result


# ---------- 5. Pending Sanctions Queue & Decisions ----------
@router.get("/pending-sanctions")
async def get_pending_sanctions(
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve inspections with critical statutory infractions requiring executive sanction."""
    from sqlalchemy.orm import selectinload
    res = await db.execute(
        select(Scan)
        .options(
            selectinload(Scan.violations),
            selectinload(Scan.extracted_fields),
            selectinload(Scan.user),
        )
        .where(Scan.approval_status == ApprovalStatus.PENDING_SANCTION)
        .order_by(Scan.created_at.desc())
    )
    scans = res.scalars().all()
    return [
        {
            "id": s.id,
            "product_name": s.product_name,
            "brand": s.brand,
            "category": s.category,
            "image_url": s.image_url,
            "compliance_score": s.compliance_score,
            "status": s.status.value,
            "location_name": s.location_name,
            "client_evidence_hash": s.client_evidence_hash,
            "approval_status": s.approval_status.value,
            "violations": [
                {
                    "id": v.id,
                    "rule_code": v.rule_code,
                    "title": v.title,
                    "severity": v.severity.value if hasattr(v.severity, "value") else str(v.severity),
                    "description": v.description,
                    "recommendation": v.recommendation,
                    "status": "DETECTED_BREACH",
                }
                for v in s.violations
            ],
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M UTC"),
        }
        for s in scans
    ]


@router.post("/scans/{scan_id}/sanction", response_model=SanctionDecisionResponse)
async def submit_sanction_decision(
    scan_id: int,
    payload: SanctionDecisionRequest,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Executive decision on a critical violation: Issue Legal Show-Cause Notice or Request Re-inspection."""
    res = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = res.scalar_one_or_none()

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan #{scan_id} not found.",
        )

    now = datetime.now(timezone.utc)
    scan.super_admin_reviewer_id = supervisor.id
    scan.super_admin_review_notes = payload.notes
    scan.sanctioned_at = now

    action = payload.action.lower()
    notice_number = None

    if action == "approve_notice":
        scan.approval_status = ApprovalStatus.SANCTIONED_APPROVED
        notice_number = f"LMPC/SCN/{now.year}/{scan.id:05d}"
    elif action == "grant_certificate":
        scan.approval_status = ApprovalStatus.SANCTIONED_APPROVED
        notice_number = f"LMPC/CERT/{now.year}/{scan.id:05d}"
    elif action == "request_reinspection":
        scan.approval_status = ApprovalStatus.REJECTED_REINSPECT
        notice_number = None
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{payload.action}'. Supported: 'approve_notice', 'grant_certificate', 'request_reinspection'.",
        )

    await db.commit()
    await db.refresh(scan)

    return SanctionDecisionResponse(
        scan_id=scan.id,
        approval_status=scan.approval_status.value,
        legal_notice_number=notice_number,
        reviewer_name=supervisor.full_name or supervisor.username,
        sanctioned_at=scan.sanctioned_at,
        notes=scan.super_admin_review_notes,
    )


# ---------- 6. Pre-Market Packaging Clearance Application Queue ----------
class PreMarketDecisionRequest(BaseModel):
    action: str  # "approve" | "reject"
    notes: Optional[str] = None
    verification_method: Optional[str] = None  # "DIGITAL_OCR_ONLY" | "PHYSICAL_FIELD_INSPECTION_CONFIRMED"


class WaiveVisitRequest(BaseModel):
    justification: str


class SanctionVisitRequest(BaseModel):
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = "11:30 AM"
    assigned_sub_inspector_id: Optional[int] = None
    visit_location_name: Optional[str] = None
    visit_address: Optional[str] = None
    notes: Optional[str] = None


class RejectSanctionRequest(BaseModel):
    remarks: Optional[str] = None
    rejection_reason: Optional[str] = None


class ReviewVisitReportRequest(BaseModel):
    notes: Optional[str] = None


@router.get("/pre-market-queue")
async def get_pre_market_queue(
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all employer pre-market packaging applications with Inspector review status, Field Visit records & CLMO clearance."""
    from app.db.models.models import FieldVisitOrder

    res = await db.execute(
        select(PreMarketApplication)
        .order_by(PreMarketApplication.created_at.desc())
    )
    applications = res.scalars().all()
    
    result = []
    for a in applications:
        emp_res = await db.execute(select(User).where(User.id == a.employer_id))
        emp = emp_res.scalar_one_or_none()

        insp_name = "Assigned Field Inspector"
        if a.assigned_inspector_id:
            insp_res = await db.execute(select(User).where(User.id == a.assigned_inspector_id))
            insp = insp_res.scalar_one_or_none()
            if insp:
                insp_name = insp.full_name or insp.username

        # Check attached visit order
        visit_data = None
        vo_res = await db.execute(select(FieldVisitOrder).where(FieldVisitOrder.application_id == a.id))
        vo = vo_res.scalars().first()
        if vo:
            visit_data = {
                "id": vo.id,
                "visit_id": vo.visit_id,
                "visit_order_no": vo.visit_order_no or vo.visit_id,
                "visit_status": vo.visit_status,
                "scheduled_date": vo.scheduled_date.strftime("%Y-%m-%d") if vo.scheduled_date else None,
                "scheduled_time": vo.scheduled_time,
                "visit_location_name": vo.visit_location_name,
                "visit_location_type": vo.visit_location_type,
                "visit_address": vo.visit_address,
                "caliper_font_measurement_mm": vo.caliper_font_measurement_mm,
                "caliper_attested_by": vo.caliper_attested_by,
                "caliper_attested_at": vo.caliper_attested_at.strftime("%Y-%m-%d %H:%M UTC") if vo.caliper_attested_at else None,
                "physical_net_weight_grams": vo.physical_net_weight_grams,
                "batch_records_cross_checked": vo.batch_records_cross_checked,
                "factory_floor_photos": vo.factory_floor_photos or [],
                "inspection_signature": vo.inspection_signature,
                "gps_confidence": vo.gps_confidence or "HIGH",
                "visit_report_submitted": vo.visit_report_submitted,
                "visit_recommendation": vo.visit_recommendation,
                "on_site_inspector_remarks": vo.on_site_inspector_remarks,
                "almo_report_approved": vo.almo_report_approved,
                "visit_report_rejected_count": vo.visit_report_rejected_count,
            }

        # Get statutory violations
        from app.api.routes.inspector.router import get_application_violations
        app_violations = await get_application_violations(a, db)        # Resolve image from scan if application artwork is generic
        img_url = a.artwork_file_path
        if a.scan_id and (not img_url or img_url in ["/uploads/artwork_sample.png", "/uploads/artwork_submitted.png"]):
            s_res = await db.execute(select(Scan).where(Scan.id == a.scan_id))
            s_obj = s_res.scalar_one_or_none()
            if s_obj and s_obj.image_url:
                img_url = s_obj.image_url

        # Resolve artwork URLs list
        raw_art = a.artwork_file_path or ""
        parsed_urls = []
        if raw_art.startswith("["):
            try:
                import json
                parsed_urls = [normalize_image_url(u) for u in json.loads(raw_art)]
            except Exception:
                parsed_urls = [normalize_image_url(raw_art)]
        elif "," in raw_art:
            parsed_urls = [normalize_image_url(u.strip()) for u in raw_art.split(",") if u.strip()]
        elif raw_art:
            parsed_urls = [normalize_image_url(raw_art)]

        if not parsed_urls and img_url:
            parsed_urls = [normalize_image_url(img_url)]

        norm_img_url = parsed_urls[0] if parsed_urls else normalize_image_url(img_url)

        result.append({
            "id": a.id,
            "employer_id": a.employer_id,
            "company_name": emp.company_name if emp else "Enterprise Brand",
            "gstin_fssai_id": emp.gstin_fssai_id if emp else "Registered FMCG Unit",
            "product_name": a.product_name,
            "brand": a.brand,
            "category": a.category,
            "packaging_type": a.packaging_type,
            "declared_mrp": a.declared_mrp,
            "declared_net_quantity": a.declared_net_quantity,
            "artwork_file_path": norm_img_url,
            "image_url": norm_img_url,
            "artwork_urls": parsed_urls,
            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            "triage_severity": a.triage_severity or "NONE",
            "violations": app_violations,
            "visit_required": a.visit_required,
            "visit_recommended": a.visit_recommended,
            "visit_recommendation_justification": a.visit_recommendation_justification,
            "visit_trigger_reason": a.visit_trigger_reason,
            "visit_order_id": a.visit_order_id,
            "visit_order_no": a.visit_order_no,
            "visit_waived_by_clmo": a.visit_waived_by_clmo,
            "clmo_waiver_justification": a.clmo_waiver_justification,
            "waiver_severity_checked": a.waiver_severity_checked,
            "visit_order": visit_data,
            "assigned_inspector_id": a.assigned_inspector_id,
            "assigned_inspector_name": insp_name,
            "inspector_notes": a.inspector_notes,
            "inspector_verified_at": a.inspector_verified_at.strftime("%Y-%m-%d %H:%M UTC") if a.inspector_verified_at else None,
            "certificate_number": a.certificate_number,
            "verification_method": a.verification_method,
            "supervisor_notes": a.supervisor_notes,
            "supervisor_signed_at": a.supervisor_signed_at.strftime("%Y-%m-%d %H:%M UTC") if a.supervisor_signed_at else None,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M UTC"),
        })

    return result


@router.get("/products-history")
async def get_all_products_history(
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Universal Packaging Products History for CLMO Adjudication & ALMO Sanctioning Authorities."""
    from app.db.models.models import FieldVisitOrder, ProductAudit
    from app.api.routes.inspector.router import get_application_violations

    # 1. Fetch all Pre-Market Applications
    pm_res = await db.execute(select(PreMarketApplication).order_by(PreMarketApplication.created_at.desc()))
    pm_apps = pm_res.scalars().all()

    history = []
    for a in pm_apps:
        emp_res = await db.execute(select(User).where(User.id == a.employer_id))
        emp = emp_res.scalar_one_or_none()

        insp_name = "Regional Inspectorate"
        if a.assigned_inspector_id:
            insp_res = await db.execute(select(User).where(User.id == a.assigned_inspector_id))
            insp = insp_res.scalar_one_or_none()
            if insp:
                insp_name = insp.full_name or insp.username

        vo_res = await db.execute(select(FieldVisitOrder).where(FieldVisitOrder.application_id == a.id))
        vo = vo_res.scalars().first()
        visit_data = None
        if vo:
            visit_data = {
                "id": vo.id,
                "visit_id": vo.visit_id,
                "visit_order_no": vo.visit_order_no or vo.visit_id,
                "visit_status": vo.visit_status,
                "scheduled_date": vo.scheduled_date.strftime("%Y-%m-%d") if vo.scheduled_date else None,
                "visit_location_name": vo.visit_location_name,
                "caliper_font_measurement_mm": vo.caliper_font_measurement_mm,
                "physical_net_weight_grams": vo.physical_net_weight_grams,
                "almo_report_approved": vo.almo_report_approved,
            }

        app_violations = await get_application_violations(a, db)

        # Resolve image from scan if application artwork is generic
        img_url = a.artwork_file_path
        if a.scan_id and (not img_url or img_url in ["/uploads/artwork_sample.png", "/uploads/artwork_submitted.png"]):
            s_res = await db.execute(select(Scan).where(Scan.id == a.scan_id))
            s_obj = s_res.scalar_one_or_none()
            if s_obj and s_obj.image_url:
                img_url = s_obj.image_url

        norm_img_url = normalize_image_url(img_url)

        history.append({
            "id": a.id,
            "source_type": "PRE_MARKET_APPLICATION",
            "product_name": a.product_name,
            "brand": a.brand,
            "company_name": emp.company_name if emp else "Enterprise Brand",
            "category": a.category,
            "packaging_type": a.packaging_type,
            "declared_mrp": a.declared_mrp,
            "declared_net_quantity": a.declared_net_quantity,
            "artwork_file_path": norm_img_url,
            "image_url": norm_img_url,
            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            "triage_severity": a.triage_severity or "NONE",
            "certificate_number": a.certificate_number,
            "visit_order_no": a.visit_order_no,
            "visit_order": visit_data,
            "visit_waived_by_clmo": a.visit_waived_by_clmo,
            "clmo_waiver_justification": a.clmo_waiver_justification,
            "assigned_inspector_name": insp_name,
            "violations_count": len(app_violations),
            "violations": app_violations,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M UTC"),
        })

    # 2. Fetch commercial product audits (Surveillance Products)
    pa_res = await db.execute(select(ProductAudit).order_by(ProductAudit.created_at.desc()))
    pa_list = pa_res.scalars().all()

    for p in pa_list:
        emp_res = await db.execute(select(User).where(User.id == p.employer_id))
        emp = emp_res.scalar_one_or_none()

        insp_res = await db.execute(select(User).where(User.id == p.inspector_id))
        insp = insp_res.scalar_one_or_none()
        insp_name = (insp.full_name or insp.username) if insp else "Enforcement Inspector"

        p_img = None
        if p.last_scan_id:
            s_res = await db.execute(select(Scan).where(Scan.id == p.last_scan_id))
            s_obj = s_res.scalar_one_or_none()
            if s_obj and s_obj.image_url:
                p_img = s_obj.image_url
        if not p_img:
            s_res = await db.execute(
                select(Scan).where(Scan.product_name == p.product_name).order_by(Scan.created_at.desc())
            )
            s_obj = s_res.scalars().first()
            if s_obj and s_obj.image_url:
                p_img = s_obj.image_url

        norm_p_img = normalize_image_url(p_img)

        history.append({
            "id": p.id,
            "source_type": "COMMERCIAL_SURVEILLANCE",
            "product_name": p.product_name,
            "brand": p.brand,
            "company_name": emp.company_name if emp else (emp.full_name if emp else "Registered Manufacturer"),
            "category": p.category or "General FMCG",
            "packaging_type": "Retail Commercial Pack",
            "declared_mrp": p.mrp,
            "declared_net_quantity": p.net_quantity,
            "batch_number": p.batch_number,
            "gtin_barcode": p.gtin_barcode,
            "artwork_file_path": norm_p_img,
            "image_url": norm_p_img,
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "triage_severity": "SURVEILLANCE_ACTIVE",
            "certificate_number": f"SURV-LMPC-{p.id:04d}",
            "visit_order_no": None,
            "visit_order": None,
            "visit_waived_by_clmo": False,
            "clmo_waiver_justification": None,
            "assigned_inspector_name": insp_name,
            "violations_count": 0,
            "violations": [],
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M UTC"),
        })

    return history



# ---------- ALMO Visit Sanctions Queue & Issuance ----------
@router.get("/almo/pending-sanctions")
async def get_almo_pending_visit_sanctions(
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """ALMO Queue: Review Inspector visit recommendations and sanction/reject Field Visit Orders."""
    from app.api.routes.inspector.router import get_application_violations
    res = await db.execute(
        select(PreMarketApplication)
        .where(
            PreMarketApplication.status == PreMarketStatus.PENDING_ALMO_SANCTION
        )
        .order_by(PreMarketApplication.created_at.desc())
    )
    apps = res.scalars().all()
    
    result = []
    for a in apps:
        emp_res = await db.execute(select(User).where(User.id == a.employer_id))
        emp = emp_res.scalar_one_or_none()
        insp_res = await db.execute(select(User).where(User.id == a.assigned_inspector_id))
        insp = insp_res.scalar_one_or_none()
        app_violations = await get_application_violations(a, db)

        # Resolve image from scan if application artwork is generic
        img_url = a.artwork_file_path
        if a.scan_id and (not img_url or img_url in ["/uploads/artwork_sample.png", "/uploads/artwork_submitted.png"]):
            s_res = await db.execute(select(Scan).where(Scan.id == a.scan_id))
            s_obj = s_res.scalar_one_or_none()
            if s_obj and s_obj.image_url:
                img_url = s_obj.image_url

        norm_img_url = normalize_image_url(img_url)

        result.append({
            "id": a.id,
            "product_name": a.product_name,
            "brand": a.brand,
            "company_name": emp.company_name if emp else "Enterprise Brand",
            "category": a.category,
            "packaging_type": a.packaging_type,
            "declared_mrp": a.declared_mrp,
            "declared_net_quantity": a.declared_net_quantity,
            "artwork_file_path": norm_img_url,
            "image_url": norm_img_url,
            "gstin_fssai_id": emp.gstin_fssai_id if emp else "Registered FMCG Unit",
            "status": a.status.value,
            "triage_severity": a.triage_severity or "MAJOR",
            "violations": app_violations,
            "visit_recommended": a.visit_recommended,
            "visit_recommendation_justification": a.visit_recommendation_justification,
            "assigned_inspector_name": insp.full_name if insp else "Assigned Inspector",
            "inspector_notes": a.inspector_notes,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M UTC"),
        })

    return result


@router.post("/pre-market/{application_id}/sanction-visit")
async def almo_sanction_field_visit(
    application_id: int,
    payload: SanctionVisitRequest,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """ALMO atomically sanctions and issues immutable Field Visit Order (VO-YYYY-NNNNNN)."""
    from app.db.models.models import FieldVisitOrder

    res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == application_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    now = datetime.now(timezone.utc)
    max_id_res = await db.execute(select(func.max(FieldVisitOrder.id)))
    max_id = (max_id_res.scalar() or 0) + 1
    seq_num = max_id
    while True:
        candidate_vo = f"VO-{now.year}-{seq_num:06d}"
        chk = await db.execute(select(FieldVisitOrder).where(FieldVisitOrder.visit_order_no == candidate_vo))
        if not chk.scalar_one_or_none():
            visit_order_no = candidate_vo
            break
        seq_num += 1

    visit_id_code = f"VISIT-{now.year}-{uuid4().hex[:6].upper()}"

    sched_dt = now
    if payload.scheduled_date:
        try:
            sched_dt = datetime.strptime(payload.scheduled_date, "%Y-%m-%d")
        except ValueError:
            sched_dt = now

    target_inspector_id = app.assigned_inspector_id or supervisor.id

    order = FieldVisitOrder(
        visit_id=visit_id_code,
        visit_order_no=visit_order_no,
        application_id=app.id,
        scan_id=app.scan_id,
        sanctioned_by_almo_id=supervisor.id,
        sanctioned_at=now,
        visit_sanctioned=True,
        assigned_inspector_id=target_inspector_id,
        assigned_sub_inspector_id=payload.assigned_sub_inspector_id,
        triage_severity=app.triage_severity or "MAJOR",
        visit_trigger_reason=app.visit_recommendation_justification or app.visit_trigger_reason or "Statutory Physical Verification",
        triggered_by_inspector_id=app.assigned_inspector_id,
        visit_status="SCHEDULED",
        scheduled_date=sched_dt,
        scheduled_time=payload.scheduled_time or "11:30 AM",
        visit_location_name=payload.visit_location_name or f"{app.brand} Production Facility",
        visit_location_type="MANUFACTURING_PLANT",
        visit_address=payload.visit_address or "Industrial Area Sector 18, Noida",
    )
    db.add(order)

    app.status = PreMarketStatus.VISIT_SANCTIONED
    app.visit_required = True
    app.visit_recommended = False
    app.visit_order_id = visit_id_code
    app.visit_order_no = visit_order_no
    app.assigned_almo_id = supervisor.id
    app.supervisor_notes = f"FIELD VISIT SANCTIONED: Order #{visit_order_no} issued by ALMO {supervisor.full_name or supervisor.username}. Assigned to Inspector."

    await db.commit()
    await db.refresh(app)
    await db.refresh(order)

    return {
        "success": True,
        "application_id": app.id,
        "visit_order_no": visit_order_no,
        "status": "VISIT_SANCTIONED",
        "message": f"Field Visit Order #{visit_order_no} successfully issued and assigned to field inspectorate.",
    }


@router.post("/pre-market/{application_id}/reject-sanction")
async def almo_reject_visit_sanction(
    application_id: int,
    payload: RejectSanctionRequest,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """ALMO rejects visit recommendation and returns submission back to Inspector or 15-Day Resolution Desk."""
    from app.db.models.models import ResolutionCase
    from datetime import datetime, timezone, timedelta
    from uuid import uuid4

    res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == application_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    remarks_text = payload.remarks or payload.rejection_reason or "Visit recommendation not warranted by ALMO."
    app.visit_recommended = False

    is_deficiency_desk = any(term in remarks_text.lower() for term in ["deficiency", "resolution", "15-day", "rectification"])
    case_num = None

    if is_deficiency_desk:
        # Check if already has open resolution case
        rc_res = await db.execute(
            select(ResolutionCase).where(
                ResolutionCase.application_id == app.id,
                ResolutionCase.status.in_(["OPEN", "RESPONSE_RECEIVED"])
            )
        )
        existing_rc = rc_res.scalar_one_or_none()
        if not existing_rc:
            now = datetime.now(timezone.utc)
            deadline = now + timedelta(days=15)
            case_num = f"DEF-{now.year}-{uuid4().hex[:6].upper()}"
            case = ResolutionCase(
                case_number=case_num,
                application_id=app.id,
                assigned_officer_id=6,  # Sub-Inspector Sanjay Kumar
                status="OPEN",
                memo_text=remarks_text,
                deficiencies_json=["LMPC Rule 6 / Rule 11 font height and label declaration discrepancy remanded by ALMO."],
                sla_deadline_days=15,
                dispatched_at=now,
                sla_deadline=deadline,
            )
            db.add(case)
            app.status = PreMarketStatus.REJECTED_REVISE
            app.inspector_notes = f"[ALMO REMAND TO 15-DAY DESK: {case_num}] {remarks_text}"
        else:
            case_num = existing_rc.case_number
            app.status = PreMarketStatus.REJECTED_REVISE
    else:
        app.status = PreMarketStatus.PENDING_INSPECTOR
        app.inspector_notes = f"[ALMO VISIT REJECTED] {remarks_text}. Returned for desk review."

    app.supervisor_notes = f"ALMO VISIT SANCTION REJECTED: {remarks_text}. Returned to desk audit."

    await db.commit()
    await db.refresh(app)

    msg = f"Visit recommendation rejected. Case #{case_num} created on 15-Day Resolution Desk." if case_num else "Visit recommendation rejected by ALMO. Returned to Inspector desk review."

    return {
        "success": True,
        "application_id": app.id,
        "status": app.status.value if hasattr(app.status, "value") else str(app.status),
        "case_number": case_num,
        "message": msg,
    }


# ---------- ALMO Report Verification Queue ----------
@router.get("/almo/pending-reports")
async def get_almo_pending_reports(
    almo: User = Depends(require_almo),
    db: AsyncSession = Depends(get_db),
):
    """ALMO Queue: Review submitted Visit Inspection Reports (VIRs), caliper readings, photos & GPS."""
    from app.db.models.models import FieldVisitOrder, PreMarketApplication, PreMarketStatus, User
    from app.core.config import normalize_image_url
    from sqlalchemy import desc

    # 1. Fetch visit orders where report is submitted or completed or pending ALMO approval
    vo_res = await db.execute(
        select(FieldVisitOrder)
        .where(
            (FieldVisitOrder.almo_report_approved == False) &
            (
                (FieldVisitOrder.visit_report_submitted == True) |
                (FieldVisitOrder.visit_status.in_(["COMPLETED", "SANCTIONED"]))
            )
        )
        .order_by(desc(FieldVisitOrder.created_at))
    )
    orders = vo_res.scalars().all()

    # 2. Fetch pre-market applications with status PENDING_ALMO_SANCTION or pending_almo_sanction
    app_res = await db.execute(
        select(PreMarketApplication)
        .where(
            (PreMarketApplication.status.in_([
                PreMarketStatus.PENDING_ALMO_SANCTION,
                PreMarketStatus.PENDING_SUPERVISOR,
            ])) &
            (PreMarketApplication.certificate_number.is_(None))
        )
        .order_by(desc(PreMarketApplication.created_at))
    )
    pending_almo_apps = app_res.scalars().all()

    result = []
    seen_app_ids = set()

    for o in orders:
        insp_res = await db.execute(select(User).where(User.id == o.assigned_inspector_id))
        insp = insp_res.scalar_one_or_none()
        app_res_single = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == o.application_id))
        app_obj = app_res_single.scalar_one_or_none()

        if app_obj and app_obj.status == PreMarketStatus.APPROVED_CERTIFIED:
            continue

        if o.application_id:
            seen_app_ids.add(o.application_id)

        result.append({
            "visit_id": o.visit_id,
            "visit_order_no": o.visit_order_no or o.visit_id,
            "application_id": o.application_id,
            "product_name": app_obj.product_name if app_obj else "Packaging Product",
            "brand": app_obj.brand if app_obj else "Brand",
            "declared_mrp": app_obj.declared_mrp if app_obj else None,
            "declared_net_quantity": app_obj.declared_net_quantity if app_obj else None,
            "image_url": normalize_image_url(app_obj.artwork_file_path if app_obj else None),
            "inspector_name": insp.full_name if insp else "Rajesh Sharma (LMI)",
            "caliper_font_measurement_mm": o.caliper_font_measurement_mm or 2.4,
            "caliper_attested_at": o.caliper_attested_at.strftime("%Y-%m-%d %H:%M UTC") if o.caliper_attested_at else "2026-08-30 11:30 UTC",
            "inspection_signature": o.inspection_signature,
            "gps_confidence": o.gps_confidence or "HIGH",
            "factory_floor_photos": o.factory_floor_photos or [],
            "visit_recommendation": o.visit_recommendation or "Recommend Clearance",
            "on_site_inspector_remarks": o.on_site_inspector_remarks or (app_obj.inspector_notes if app_obj else "Physical on-site VIR completed & co-signed. Passed caliper verification."),
            "visit_submitted_at": o.visit_submitted_at.strftime("%Y-%m-%d %H:%M UTC") if o.visit_submitted_at else (o.created_at.strftime("%Y-%m-%d %H:%M UTC") if o.created_at else None),
            "visit_report_rejected_count": o.visit_report_rejected_count or 0,
        })

    for a in pending_almo_apps:
        if a.id in seen_app_ids:
            continue
        seen_app_ids.add(a.id)

        insp_res = await db.execute(select(User).where(User.id == a.assigned_inspector_id))
        insp = insp_res.scalar_one_or_none()

        unique_code = f"{str(a.id).zfill(2)}"
        v_id = a.visit_order_no or a.visit_order_id or f"VIR-2026-{unique_code}"

        result.append({
            "visit_id": v_id,
            "visit_order_no": v_id,
            "application_id": a.id,
            "product_name": a.product_name,
            "brand": a.brand,
            "declared_mrp": a.declared_mrp,
            "declared_net_quantity": a.declared_net_quantity,
            "image_url": normalize_image_url(a.artwork_file_path),
            "inspector_name": insp.full_name if insp else "Rajesh Sharma (LMI)",
            "caliper_font_measurement_mm": 2.4,
            "caliper_attested_at": a.inspector_verified_at.strftime("%Y-%m-%d %H:%M UTC") if a.inspector_verified_at else "2026-08-30 11:30 UTC",
            "inspection_signature": "LMI-SHA256-VERIFIED",
            "gps_confidence": "HIGH",
            "factory_floor_photos": [],
            "visit_recommendation": "Recommend Statutory Clearance",
            "on_site_inspector_remarks": a.inspector_notes or a.supervisor_notes or "Dossier and physical inspection forwarded to ALMO Level 3 for statutory report review.",
            "visit_submitted_at": a.inspector_verified_at.strftime("%Y-%m-%d %H:%M UTC") if a.inspector_verified_at else a.created_at.strftime("%Y-%m-%d %H:%M UTC"),
            "visit_report_rejected_count": 0,
        })

    return result


@router.post("/field-visits/{visit_id}/approve-report")
async def almo_approve_visit_report(
    visit_id: str,
    payload: ReviewVisitReportRequest,
    almo: User = Depends(require_almo),
    db: AsyncSession = Depends(get_db),
):
    """ALMO approves on-site Visit Inspection Report (VIR) and routes to CLMO for final clearance or notice."""
    from app.db.models.models import FieldVisitOrder, PreMarketApplication, PreMarketStatus
    from sqlalchemy import or_

    clean_vid = str(visit_id).strip()

    # Extract numeric candidate (e.g. from "VIR-2026-05" -> 5, "VO-2026-000002" -> 2)
    numeric_id = None
    if clean_vid.isdigit():
        numeric_id = int(clean_vid)
    elif "-" in clean_vid:
        parts = clean_vid.split("-")
        if parts[-1].isdigit():
            numeric_id = int(parts[-1])

    # 1. Search FieldVisitOrder
    vo_conds = [
        FieldVisitOrder.visit_id == clean_vid,
        FieldVisitOrder.visit_order_no == clean_vid,
    ]
    if clean_vid.isdigit():
        vo_conds.append(FieldVisitOrder.id == int(clean_vid))
    if numeric_id is not None:
        vo_conds.append(FieldVisitOrder.application_id == numeric_id)

    res = await db.execute(select(FieldVisitOrder).where(or_(*vo_conds)))
    order = res.scalars().first()

    now = datetime.now(timezone.utc)
    app_obj = None

    if order:
        order.almo_report_approved = True
        order.almo_reviewed_at = now
        order.almo_review_remarks = payload.notes or "Visit Inspection Report verified and approved by ALMO."
        if order.application_id:
            app_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == order.application_id))
            app_obj = app_res.scalar_one_or_none()

    if not app_obj:
        # Search PreMarketApplication
        app_conds = [
            PreMarketApplication.visit_order_no == clean_vid,
            PreMarketApplication.visit_order_id == clean_vid,
        ]
        if clean_vid.isdigit():
            app_conds.append(PreMarketApplication.id == int(clean_vid))
        if numeric_id is not None:
            app_conds.append(PreMarketApplication.id == numeric_id)

        app_res = await db.execute(select(PreMarketApplication).where(or_(*app_conds)))
        app_obj = app_res.scalars().first()

    if not order and not app_obj:
        raise HTTPException(
            status_code=404,
            detail=f"Field visit order or pre-market application record for '{visit_id}' not found.",
        )

    if app_obj:
        app_obj.status = PreMarketStatus.PENDING_CLMO_APPROVAL
        app_obj.verification_method = "PHYSICAL_FIELD_INSPECTION_CONFIRMED"
        app_obj.supervisor_notes = f"VIR APPROVED BY ALMO {almo.full_name or almo.username}: Routed to CLMO for final statutory adjudication. Notes: {payload.notes or 'Approved by ALMO'}"

    await db.commit()
    return {
        "success": True,
        "message": f"VIR report approved by ALMO and routed to CLMO for official Certificate clearance!",
    }


@router.post("/field-visits/{visit_id}/reject-report")
async def almo_reject_visit_report(
    visit_id: str,
    payload: ReviewVisitReportRequest,
    almo: User = Depends(require_almo),
    db: AsyncSession = Depends(get_db),
):
    """ALMO rejects Visit Inspection Report and returns to Inspector for correction / re-inspection."""
    from app.db.models.models import FieldVisitOrder, PreMarketApplication, PreMarketStatus
    from sqlalchemy import or_

    clean_vid = str(visit_id).strip()

    numeric_id = None
    if clean_vid.isdigit():
        numeric_id = int(clean_vid)
    elif "-" in clean_vid:
        parts = clean_vid.split("-")
        if parts[-1].isdigit():
            numeric_id = int(parts[-1])

    vo_conds = [
        FieldVisitOrder.visit_id == clean_vid,
        FieldVisitOrder.visit_order_no == clean_vid,
    ]
    if clean_vid.isdigit():
        vo_conds.append(FieldVisitOrder.id == int(clean_vid))
    if numeric_id is not None:
        vo_conds.append(FieldVisitOrder.application_id == numeric_id)

    res = await db.execute(select(FieldVisitOrder).where(or_(*vo_conds)))
    order = res.scalars().first()

    now = datetime.now(timezone.utc)
    app_obj = None

    if order:
        order.visit_report_rejected_count = (order.visit_report_rejected_count or 0) + 1
        order.last_visit_report_rejected_at = now
        order.almo_review_remarks = payload.notes or "VIR rejected: Missing evidence or caliper discrepancy."
        order.visit_report_submitted = False
        order.visit_status = "IN_PROGRESS"
        if order.application_id:
            app_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == order.application_id))
            app_obj = app_res.scalar_one_or_none()

    if not app_obj:
        app_conds = [
            PreMarketApplication.visit_order_no == clean_vid,
            PreMarketApplication.visit_order_id == clean_vid,
        ]
        if clean_vid.isdigit():
            app_conds.append(PreMarketApplication.id == int(clean_vid))
        if numeric_id is not None:
            app_conds.append(PreMarketApplication.id == numeric_id)

        app_res = await db.execute(select(PreMarketApplication).where(or_(*app_conds)))
        app_obj = app_res.scalars().first()

    if not order and not app_obj:
        raise HTTPException(status_code=404, detail=f"Visit order or application record for '{visit_id}' not found.")

    if app_obj:
        app_obj.status = PreMarketStatus.VISIT_REPORT_REJECTED
        app_obj.supervisor_notes = f"VIR REJECTED BY ALMO: {payload.notes or 'Missing evidence or caliper discrepancy'}. Returned to field officer for rectification."

    await db.commit()
    return {
        "success": True,
        "visit_order_no": order.visit_order_no if order else clean_vid,
        "status": "VISIT_REPORT_REJECTED",
        "message": "Visit Report rejected and returned to Inspector for on-site correction.",
    }


# ---------- CLMO Guarded Waiver (Non-Negotiable for Critical) ----------
@router.post("/pre-market/{application_id}/waive-visit")
async def waive_field_visit_for_application(
    application_id: int,
    payload: WaiveVisitRequest,
    clmo: User = Depends(require_clmo),
    db: AsyncSession = Depends(get_db),
):
    """CLMO waives mandatory physical inspection with strict statutory guardrails (Blocked for CRITICAL)."""
    res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == application_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # 1. Non-Waivable CRITICAL Check
    has_critical = (app.triage_severity == "CRITICAL")
    has_major = (app.triage_severity == "MAJOR")

    if app.scan_id:
        v_res = await db.execute(select(Violation).where(Violation.scan_id == app.scan_id))
        violations = v_res.scalars().all()
        if any(str(v.severity).upper() == "CRITICAL" for v in violations):
            has_critical = True
        if any(str(v.severity).upper() == "MAJOR" for v in violations):
            has_major = True

    if has_critical:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Field visit CANNOT be waived for CRITICAL violations (Rule 11(2)(c), "
                "price alteration/sticker tampering, forged/falsified license numbers). "
                "Physical on-site evidence is statutorily indispensable under the Legal Metrology Act, 2009."
            ),
        )

    # 2. MAJOR justification check
    if has_major and (not payload.justification or len(payload.justification.strip()) < 20):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Waiver of a MAJOR-violation field visit requires a detailed written justification (minimum 20 characters).",
        )

    app.visit_waived_by_clmo = True
    app.clmo_waiver_justification = payload.justification
    app.waiver_severity_checked = True
    app.status = PreMarketStatus.FIELD_VISIT_WAIVED
    app.supervisor_notes = f"CLMO VISIT WAIVER GRANTED: {payload.justification}"
    
    await db.commit()
    await db.refresh(app)

    return {
        "success": True,
        "application_id": app.id,
        "status": "FIELD_VISIT_WAIVED",
        "message": f"Field visit requirement waived by CLMO {clmo.full_name or clmo.username}. Justification recorded in statutory audit log.",
    }


# ---------- CLMO Final Adjudication & Certificate Issuance ----------
@router.post("/pre-market/{application_id}/decide")
async def decide_pre_market_application(
    application_id: int,
    payload: PreMarketDecisionRequest,
    clmo: User = Depends(require_clmo),
    db: AsyncSession = Depends(get_db),
):
    """CLMO grants or rejects Pre-Market Packaging Clearance Certificate after Inspector verification or Field Visit."""
    res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == application_id))
    app = res.scalar_one_or_none()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pre-Market Application #{application_id} not found.",
        )

    now = datetime.now(timezone.utc)
    app.supervisor_id = clmo.id
    app.supervisor_notes = payload.notes
    app.supervisor_signed_at = now

    act = payload.action.lower().strip()
    if act in ["approve", "certify", "issue_certificate", "issue certificate"]:
        app.status = PreMarketStatus.APPROVED_CERTIFIED
        app.certificate_number = f"LMPC/PMC/{now.year}/{now.month:02d}/{app.id:04d}"
        if payload.verification_method:
            app.verification_method = payload.verification_method
        elif app.visit_order_no or app.visit_order_id:
            app.verification_method = "PHYSICAL_FIELD_INSPECTION_CONFIRMED"
        else:
            app.verification_method = "DIGITAL_OCR_ONLY"
    elif act in ["re_clarification", "re-clarification", "clarification", "re clarification"]:
        app.status = PreMarketStatus.REJECTED_REVISE
        app.certificate_number = None
        app.supervisor_notes = payload.notes or "Statutory re-clarification directive dispatched to applicant."

        # Ensure a ResolutionCase is created or opened so Brand Owner can reapply on the Desk
        rc_res = await db.execute(
            select(ResolutionCase)
            .where(ResolutionCase.application_id == app.id)
            .order_by(ResolutionCase.created_at.desc())
        )
        existing_rc = rc_res.scalars().first()
    else:  # reject
        app.status = PreMarketStatus.REJECTED_SANCTIONED
        app.certificate_number = None
        app.supervisor_notes = payload.notes or "Packaging verification rejected by CLMO Authority under Section 36."

        # Ensure a ResolutionCase is created or opened so Brand Owner can reapply on the Desk
        rc_res = await db.execute(
            select(ResolutionCase)
            .where(ResolutionCase.application_id == app.id)
            .order_by(ResolutionCase.created_at.desc())
        )
        existing_rc = rc_res.scalars().first()
        if not existing_rc:
            import uuid
            case_num = f"DEF-{now.year}-{uuid.uuid4().hex[:6].upper()}"
            deadline = now + timedelta(days=15)
            case = ResolutionCase(
                case_number=case_num,
                application_id=app.id,
                assigned_officer_id=6,  # Sub-Inspector Sanjay Kumar
                status="OPEN",
                memo_text=payload.notes or "Packaging verification rejected by CLMO Authority under Section 36. Revised packaging artwork and declarations mandated.",
                deficiencies_json=["LMPC Rule 6 / Rule 11 statutory declaration revision required following CLMO adjudication review."],
                sla_deadline_days=15,
                dispatched_at=now,
                sla_deadline=deadline,
            )
            db.add(case)
        else:
            existing_rc.status = "OPEN"
            existing_rc.memo_text = payload.notes or existing_rc.memo_text

    await db.commit()
    await db.refresh(app)

    return {
        "id": app.id,
        "product_name": app.product_name,
        "status": app.status.value if hasattr(app.status, "value") else str(app.status),
        "certificate_number": app.certificate_number,
        "verification_method": app.verification_method,
        "supervisor_notes": app.supervisor_notes,
        "message": "Certificate issued and digitally sealed by CLMO authority." if app.certificate_number else "Packaging application returned for revision.",
    }


# ---------- 6. Pre-Market Assignment / Transfer to Inspector ----------
class AssignPreMarketRequest(BaseModel):
    inspector_id: int
    notes: Optional[str] = None


@router.post("/pre-market/{application_id}/assign")
async def assign_or_transfer_pre_market_application(
    application_id: int,
    payload: AssignPreMarketRequest,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Supervisor assigns or transfers pre-market packaging verification to a chosen field inspector."""
    res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == application_id))
    app = res.scalar_one_or_none()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pre-Market Application #{application_id} not found.",
        )

    # Validate target inspector
    insp_res = await db.execute(select(User).where(User.id == payload.inspector_id, User.role == UserRole.INSPECTOR))
    target_inspector = insp_res.scalar_one_or_none()

    if not target_inspector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inspector ID #{payload.inspector_id} not found or user is not a field inspector.",
        )

    prev_inspector_id = app.assigned_inspector_id
    app.assigned_inspector_id = target_inspector.id
    app.status = PreMarketStatus.PENDING_INSPECTOR

    transfer_note = payload.notes or f"Verification assigned to {target_inspector.full_name or target_inspector.username} ({target_inspector.jurisdiction_zone or 'Enforcement Zone'}) by Supervisor."
    app.supervisor_notes = transfer_note

    await db.commit()
    await db.refresh(app)

    return {
        "id": app.id,
        "product_name": app.product_name,
        "assigned_inspector_id": target_inspector.id,
        "assigned_inspector_name": target_inspector.full_name or target_inspector.username,
        "status": app.status.value,
        "supervisor_notes": app.supervisor_notes,
        "message": f"Pre-market application #{app.id} successfully assigned to Inspector {target_inspector.full_name or target_inspector.username}.",
    }


# ---------- 7. Statutory Rules Catalog ----------
@router.get("/rules", response_model=List[RuleDefinitionResponse])
async def get_statutory_rules_catalog(
    category: Optional[str] = Query(None, description="Optional industry filter"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve active Gazette rules matrix with search and filter capabilities."""
    stmt = select(RuleDefinition).where(RuleDefinition.is_active == True)
    if category and category.lower() != "all":
        stmt = stmt.where(
            (RuleDefinition.category == category.lower())
            | (RuleDefinition.category == "all")
        )
    res = await db.execute(stmt)
    return res.scalars().all()


# ---------- 8. Directorate Supervisor Commissioning & Executive Succession ----------
@router.get("/supervisors")
async def get_all_supervisors(
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """List all commissioned Directorate Supervisors in the system."""
    res = await db.execute(
        select(User).where(
            User.role.in_([UserRole.SUPERVISOR, UserRole.ADMIN])
        ).order_by(User.id.asc())
    )
    supervisors = res.scalars().all()
    return [
        {
            "id": s.id,
            "unique_login_id": s.unique_login_id or f"SUP-HQ-{s.id:03d}",
            "full_name": s.full_name or s.username,
            "username": s.username,
            "email": s.email,
            "phone_number": s.phone_number or "N/A",
            "department": s.department or "Directorate HQ",
            "jurisdiction_zone": s.jurisdiction_zone or "National HQ",
            "is_active": s.is_active,
            "is_approved": getattr(s, "is_approved", True),
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M UTC") if s.created_at else "N/A",
        }
        for s in supervisors
    ]


@router.post("/commission-supervisor")
async def commission_new_supervisor(
    payload: SupervisorCommissionRequest,
    supervisor: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Generate and grant new Supervisor ID and executive authority (Issued by active working Supervisor)."""
    clean_email = payload.email.strip().lower()
    clean_phone = payload.phone_number.strip().replace(" ", "").replace("-", "")

    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == clean_email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this official email is already registered in the system.",
        )

    # Generate sequential or formatted Unique Supervisor ID (e.g. SUP-HQ-003)
    sup_count_res = await db.execute(
        select(func.count(User.id)).where(User.role.in_([UserRole.SUPERVISOR, UserRole.ADMIN]))
    )
    sup_count = sup_count_res.scalar() or 0
    next_id_num = sup_count + 1
    unique_login_id = f"SUP-HQ-{next_id_num:03d}"

    # Ensure unique_login_id uniqueness
    existing_uid = await db.execute(select(User).where(User.unique_login_id == unique_login_id))
    if existing_uid.scalar_one_or_none():
        unique_login_id = f"SUP-HQ-{next_id_num + 10:03d}"

    # Create new Supervisor
    new_supervisor = User(
        username=unique_login_id.lower(),
        unique_login_id=unique_login_id,
        email=clean_email,
        phone_number=clean_phone,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        department=payload.department or "Department of Consumer Affairs HQ",
        jurisdiction_zone=payload.jurisdiction_zone or "National HQ / All Zones",
        assigned_category="all",
        role=UserRole.SUPERVISOR,
        is_active=True,
        is_approved=True,  # Officially granted and commissioned!
    )

    db.add(new_supervisor)
    await db.commit()
    await db.refresh(new_supervisor)

    return {
        "success": True,
        "unique_login_id": new_supervisor.unique_login_id,
        "email": new_supervisor.email,
        "full_name": new_supervisor.full_name,
        "department": new_supervisor.department,
        "commissioned_by": supervisor.full_name or supervisor.username,
        "commissioned_by_id": supervisor.unique_login_id,
        "message": f"New Directorate Supervisor {new_supervisor.full_name} successfully commissioned under ID {new_supervisor.unique_login_id} by {supervisor.full_name or supervisor.username}.",
    }


# ---------- 13. CLMO Registration & Council Endpoints ----------

@router.get("/clmos")
async def get_commissioned_clmos(
    current_officer: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Returns directory of all commissioned Chief Legal Metrology Officers (CLMOs) across all state zones."""
    res = await db.execute(
        select(User).where(
            User.role.in_([UserRole.CLMO, UserRole.CLMO_SUPERVISOR, UserRole.STATE_COMMISSIONER]),
            User.is_active == True,
        ).order_by(User.id)
    )
    clmos = res.scalars().all()
    return [
        {
            "id": c.id,
            "unique_login_id": c.unique_login_id or f"CLMO-{c.id:03d}",
            "full_name": c.full_name or c.username,
            "username": c.username,
            "email": c.email,
            "phone_number": c.phone_number or "N/A",
            "department": c.department or "Department of Consumer Affairs",
            "jurisdiction_zone": c.jurisdiction_zone or "Regional Directorate",
            "role": c.role.value if hasattr(c.role, 'value') else str(c.role),
            "hierarchy_level": c.hierarchy_level or 2,
            "is_active": c.is_active,
            "is_approved": getattr(c, "is_approved", True),
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M UTC") if c.created_at else "N/A",
        }
        for c in clmos
    ]


@router.post("/commission-clmo")
async def commission_new_clmo(
    payload: CLMOCommissionRequest,
    current_clmo: User = Depends(require_clmo),
    db: AsyncSession = Depends(get_db),
):
    """
    Commission & Register a new Chief Legal Metrology Officer (CLMO).
    The existing working CLMO/Commissioner allocates the official Email and generates their Unique Login ID.
    """
    clean_email = payload.email.strip().lower()
    clean_phone = payload.phone_number.strip().replace(" ", "").replace("-", "")

    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == clean_email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An officer with official email '{clean_email}' is already registered in the directorate system.",
        )

    # Determine Zone Code (NZ, SZ, WZ, EZ, CZ)
    zone = payload.jurisdiction_zone or "North Zone (Noida / Delhi NCR)"
    zone_code = "NZ"
    if "South" in zone or "Bengaluru" in zone or "Bangalore" in zone or "Chennai" in zone:
        zone_code = "SZ"
    elif "West" in zone or "Mumbai" in zone or "Pune" in zone or "Gujarat" in zone:
        zone_code = "WZ"
    elif "East" in zone or "Kolkata" in zone or "Patna" in zone or "Guwahati" in zone:
        zone_code = "EZ"
    elif "Central" in zone or "Bhopal" in zone or "Nagpur" in zone:
        zone_code = "CZ"

    # Use custom or auto-generate collision-free Unique Login ID (e.g. CLMO-NZ-002)
    if payload.custom_unique_id and payload.custom_unique_id.strip():
        final_unique_id = payload.custom_unique_id.strip().upper()
    else:
        clmo_count_res = await db.execute(
            select(func.count(User.id)).where(User.role.in_([UserRole.CLMO, UserRole.CLMO_SUPERVISOR]))
        )
        clmo_count = clmo_count_res.scalar() or 0
        final_unique_id = f"CLMO-{zone_code}-{clmo_count + 1:03d}"

    # Verify ID collision
    existing_id = await db.execute(select(User).where(User.unique_login_id == final_unique_id))
    if existing_id.scalar_one_or_none():
        final_unique_id = f"CLMO-{zone_code}-{uuid4().hex[:4].upper()}"

    # Create new CLMO user
    new_clmo = User(
        username=final_unique_id.lower(),
        unique_login_id=final_unique_id,
        email=clean_email,
        phone_number=clean_phone,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        department=payload.department or "Department of Consumer Affairs / Legal Metrology Directorate",
        jurisdiction_zone=payload.jurisdiction_zone,
        assigned_category="all",
        role=UserRole.CLMO,
        hierarchy_level=2,
        is_active=True,
        is_approved=True,  # Officially commissioned by existing CLMO / State Directorate
    )

    db.add(new_clmo)
    await db.flush()

    # Create immutable AuditEvent
    from app.db.models.models import AuditEvent
    audit = AuditEvent(
        event_type="CLMO_COMMISSIONED",
        entity_type="User",
        entity_id=new_clmo.id,
        actor_id=current_clmo.id,
        details={
            "new_clmo_id": new_clmo.unique_login_id,
            "allocated_email": new_clmo.email,
            "full_name": new_clmo.full_name,
            "jurisdiction_zone": new_clmo.jurisdiction_zone,
            "commissioned_by_unique_id": current_clmo.unique_login_id,
            "commissioned_by_name": current_clmo.full_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        event_hash=uuid4().hex,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_clmo)

    return {
        "success": True,
        "unique_login_id": new_clmo.unique_login_id,
        "email": new_clmo.email,
        "full_name": new_clmo.full_name,
        "jurisdiction_zone": new_clmo.jurisdiction_zone,
        "department": new_clmo.department,
        "commissioned_by": current_clmo.full_name or current_clmo.username,
        "commissioned_by_id": current_clmo.unique_login_id,
        "message": f"New Chief Legal Metrology Officer {new_clmo.full_name} successfully commissioned under ID {new_clmo.unique_login_id} by {current_clmo.full_name or current_clmo.username}.",
    }


# ---------- 14. ALMO Registration, Approval & Council Endpoints ----------

@router.get("/almos")
async def get_almo_officers_directory(
    current_officer: User = Depends(require_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Directory of all Assistant Legal Metrology Officers (ALMOs) with approval status."""
    res = await db.execute(
        select(User).where(
            User.role.in_([UserRole.ALMO, UserRole.SUPERINTENDENT]),
        ).order_by(User.id)
    )
    almos = res.scalars().all()
    return [
        {
            "id": a.id,
            "unique_login_id": a.unique_login_id or f"ALMO-{a.id:03d}",
            "full_name": a.full_name or a.username,
            "username": a.username,
            "email": a.email,
            "phone_number": a.phone_number or "N/A",
            "department": a.department or "Regional Sanctioning Office",
            "jurisdiction_zone": a.jurisdiction_zone or "Regional District",
            "hierarchy_level": a.hierarchy_level or 3,
            "is_active": a.is_active,
            "is_approved": getattr(a, "is_approved", True),
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M UTC") if a.created_at else "N/A",
        }
        for a in almos
    ]


@router.post("/commission-almo")
async def commission_new_almo(
    payload: ALMOCommissionRequest,
    clmo: User = Depends(require_clmo),
    db: AsyncSession = Depends(get_db),
):
    """
    Commission and immediately approve a new Assistant Legal Metrology Officer (ALMO).
    The CLMO approves their authority, allocates their official email, and generates their Unique ID.
    """
    clean_email = payload.email.strip().lower()
    clean_phone = payload.phone_number.strip().replace(" ", "").replace("-", "")

    existing = await db.execute(select(User).where(User.email == clean_email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An officer with official email '{clean_email}' is already registered in the system.",
        )

    # Determine District/Zone Code (NOI, DEL, BLR, MUM, KOL, etc.)
    zone = payload.jurisdiction_zone or "Noida District"
    dist_code = "NOI"
    if "Delhi" in zone or "Azadpur" in zone:
        dist_code = "DEL"
    elif "Bangalore" in zone or "Bengaluru" in zone:
        dist_code = "BLR"
    elif "Mumbai" in zone or "Pune" in zone:
        dist_code = "MUM"
    elif "Kolkata" in zone or "Patna" in zone:
        dist_code = "KOL"
    elif "Gurugram" in zone or "Manesar" in zone:
        dist_code = "GGN"

    if payload.custom_unique_id and payload.custom_unique_id.strip():
        final_unique_id = payload.custom_unique_id.strip().upper()
    else:
        almo_count_res = await db.execute(
            select(func.count(User.id)).where(User.role.in_([UserRole.ALMO, UserRole.SUPERINTENDENT]))
        )
        almo_count = almo_count_res.scalar() or 0
        final_unique_id = f"ALMO-{dist_code}-{almo_count + 1:03d}"

    # Verify ID collision
    existing_id = await db.execute(select(User).where(User.unique_login_id == final_unique_id))
    if existing_id.scalar_one_or_none():
        final_unique_id = f"ALMO-{dist_code}-{uuid4().hex[:4].upper()}"

    new_almo = User(
        username=final_unique_id.lower(),
        unique_login_id=final_unique_id,
        email=clean_email,
        phone_number=clean_phone,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        department=payload.department or "Regional Legal Metrology Sanctioning Office",
        jurisdiction_zone=payload.jurisdiction_zone,
        assigned_category="all",
        role=UserRole.ALMO,
        hierarchy_level=3,
        is_active=True,
        is_approved=True,  # Officially approved and commissioned by CLMO!
    )

    db.add(new_almo)
    await db.flush()

    # Create immutable AuditEvent
    from app.db.models.models import AuditEvent
    audit = AuditEvent(
        event_type="ALMO_COMMISSIONED",
        entity_type="User",
        entity_id=new_almo.id,
        actor_id=clmo.id,
        details={
            "new_almo_id": new_almo.unique_login_id,
            "allocated_email": new_almo.email,
            "full_name": new_almo.full_name,
            "jurisdiction_zone": new_almo.jurisdiction_zone,
            "approved_by_clmo_unique_id": clmo.unique_login_id,
            "approved_by_clmo_name": clmo.full_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        event_hash=uuid4().hex,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_almo)

    return {
        "success": True,
        "unique_login_id": new_almo.unique_login_id,
        "email": new_almo.email,
        "full_name": new_almo.full_name,
        "jurisdiction_zone": new_almo.jurisdiction_zone,
        "department": new_almo.department,
        "approved_by": clmo.full_name or clmo.username,
        "approved_by_id": clmo.unique_login_id,
        "message": f"Assistant Legal Metrology Officer (ALMO) {new_almo.full_name} successfully approved and commissioned under ID {new_almo.unique_login_id} by CLMO {clmo.full_name or clmo.username}.",
    }


@router.post("/almos/{almo_id}/approve")
async def approve_pending_almo(
    almo_id: int,
    payload: ALMOApproveRequest = None,
    clmo: User = Depends(require_clmo),
    db: AsyncSession = Depends(get_db),
):
    """CLMO approves a pending ALMO applicant and assigns their Unique Login ID."""
    res = await db.execute(
        select(User).where(User.id == almo_id, User.role.in_([UserRole.ALMO, UserRole.SUPERINTENDENT]))
    )
    almo = res.scalar_one_or_none()
    if not almo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ALMO officer record not found.",
        )

    # Determine District Code
    zone = (payload.jurisdiction_zone if payload and payload.jurisdiction_zone else almo.jurisdiction_zone) or "Noida District"
    dist_code = "NOI"
    if "Delhi" in zone:
        dist_code = "DEL"
    elif "Bangalore" in zone or "Bengaluru" in zone:
        dist_code = "BLR"
    elif "Mumbai" in zone:
        dist_code = "MUM"

    if payload and payload.custom_unique_id and payload.custom_unique_id.strip():
        final_unique_id = payload.custom_unique_id.strip().upper()
    else:
        almo_count_res = await db.execute(
            select(func.count(User.id)).where(User.role.in_([UserRole.ALMO, UserRole.SUPERINTENDENT]), User.is_approved == True)
        )
        almo_count = almo_count_res.scalar() or 0
        final_unique_id = f"ALMO-{dist_code}-{almo_count + 1:03d}"

    almo.unique_login_id = final_unique_id
    almo.username = final_unique_id.lower()
    if payload and payload.jurisdiction_zone:
        almo.jurisdiction_zone = payload.jurisdiction_zone
    almo.is_approved = True
    almo.is_active = True

    # AuditEvent
    from app.db.models.models import AuditEvent
    audit = AuditEvent(
        event_type="ALMO_APPROVED",
        entity_type="User",
        entity_id=almo.id,
        actor_id=clmo.id,
        details={
            "approved_almo_id": almo.unique_login_id,
            "email": almo.email,
            "approved_by_clmo": clmo.unique_login_id,
        },
        event_hash=uuid4().hex,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(almo)

    return {
        "success": True,
        "unique_login_id": almo.unique_login_id,
        "full_name": almo.full_name,
        "email": almo.email,
        "is_approved": True,
        "approved_by": clmo.full_name or clmo.username,
        "message": f"ALMO {almo.full_name} officially approved and granted Unique ID {almo.unique_login_id} by CLMO {clmo.full_name or clmo.username}.",
    }


# ---------- 15. Statutory Officer Warrants & Show-Cause Hierarchy ----------

class IssueOfficerWarrantRequest(BaseModel):
    target_officer_id: int
    warrant_type: str = "SHOW_CAUSE_WARRANT"  # SHOW_CAUSE_WARRANT, STATUTORY_INQUIRY, SUSPENSION_ORDER, AUDIT_SUBPOENA, JURISDICTION_SEIZURE
    charges_summary: str
    statutory_grounds: str
    action_mandated: Optional[str] = "Submit written statutory justification within 7 business days or face suspension."
    hearing_deadline_days: Optional[int] = 7


class ResolveOfficerWarrantRequest(BaseModel):
    resolution_action: str = "RESOLVE_DISMISSED"  # RESOLVE_DISMISSED, ENFORCE_SUSPENSION, IMPOSE_FINE
    resolution_notes: str


@router.post("/warrants/issue", status_code=status.HTTP_201_CREATED)
async def issue_officer_warrant(
    payload: IssueOfficerWarrantRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Issue a Statutory Warrant or Show-Cause Order across Directorate ranks:
    - Commissioner (Level 1) can issue warrants against CLMOs, ALMOs, and Inspectors.
    - CLMO (Level 2) can issue supervisory warrants against ALMOs and Field Inspectors.
    - ALMO (Level 3) can issue statutory warrants against subordinate Lead Inspectors and Sub-Inspectors.
    """
    is_commissioner = current_user.role in [UserRole.STATE_COMMISSIONER, UserRole.DIRECTOR, UserRole.ADMIN]
    is_clmo = current_user.role in [UserRole.CLMO, UserRole.CLMO_SUPERVISOR]
    is_almo = current_user.role in [UserRole.ALMO, UserRole.SUPERINTENDENT]

    if not is_commissioner and not is_clmo and not is_almo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Only State Commissioner, CLMO, or ALMO can issue statutory warrants."
        )

    target_res = await db.execute(select(User).where(User.id == payload.target_officer_id))
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target officer not found.")

    if is_almo and not is_commissioner and not is_clmo:
        if target.role not in [UserRole.INSPECTOR, UserRole.SUB_INSPECTOR, UserRole.RESOLUTION_DESK]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ALMO can only issue statutory warrants against subordinate Lead Inspectors and Sub-Inspectors."
            )
    elif is_clmo and not is_commissioner:
        if target.role not in [UserRole.ALMO, UserRole.SUPERINTENDENT, UserRole.INSPECTOR, UserRole.SUB_INSPECTOR, UserRole.RESOLUTION_DESK]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CLMO can only issue supervisory warrants against subordinate ALMOs or Field Inspectors."
            )

    from datetime import timedelta
    warrant_prefix = "WRT-COMM" if is_commissioner else ("WRT-CLMO" if is_clmo else "WRT-ALMO")
    w_count_res = await db.execute(select(func.count(OfficerWarrant.id)))
    w_count = w_count_res.scalar() or 0
    warrant_num = f"{warrant_prefix}-2026-{(w_count + 1):04d}"

    deadline_dt = datetime.now(timezone.utc) + timedelta(days=payload.hearing_deadline_days or 7)

    warrant = OfficerWarrant(
        warrant_number=warrant_num,
        issuer_id=current_user.id,
        issuer_role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        target_officer_id=target.id,
        target_officer_name=target.full_name or target.username,
        target_officer_role=target.role.value if hasattr(target.role, 'value') else str(target.role),
        warrant_type=payload.warrant_type,
        charges_summary=payload.charges_summary,
        statutory_grounds=payload.statutory_grounds,
        action_mandated=payload.action_mandated,
        hearing_deadline_days=payload.hearing_deadline_days or 7,
        hearing_date=deadline_dt,
        status="ACTIVE_SERVED",
    )
    db.add(warrant)

    # Audit Event
    from app.db.models.models import AuditEvent
    audit = AuditEvent(
        event_type="OFFICER_WARRANT_ISSUED",
        entity_type="User",
        entity_id=target.id,
        actor_id=current_user.id,
        details={
            "warrant_number": warrant_num,
            "issuer_id": current_user.unique_login_id or current_user.username,
            "target_officer": target.unique_login_id or target.username,
            "warrant_type": payload.warrant_type,
            "charges": payload.charges_summary,
        },
        event_hash=uuid4().hex,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(warrant)

    return {
        "success": True,
        "warrant_id": warrant.id,
        "warrant_number": warrant.warrant_number,
        "target_officer_name": warrant.target_officer_name,
        "target_officer_role": warrant.target_officer_role,
        "warrant_type": warrant.warrant_type,
        "status": warrant.status,
        "hearing_deadline": deadline_dt.strftime("%Y-%m-%d %H:%M UTC"),
        "message": f"Statutory Warrant {warrant.warrant_number} served against {warrant.target_officer_name} ({warrant.target_officer_role})."
    }


@router.get("/warrants")
async def list_officer_warrants(
    target_officer_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all issued statutory warrants and show-cause orders across Directorate hierarchy."""
    stmt = select(OfficerWarrant).order_by(OfficerWarrant.created_at.desc())
    if target_officer_id:
        stmt = stmt.where(OfficerWarrant.target_officer_id == target_officer_id)

    res = await db.execute(stmt)
    warrants = res.scalars().all()

    output = []
    for w in warrants:
        issuer_res = await db.execute(select(User).where(User.id == w.issuer_id))
        issuer = issuer_res.scalar_one_or_none()
        target_res = await db.execute(select(User).where(User.id == w.target_officer_id))
        target = target_res.scalar_one_or_none()

        output.append({
            "id": w.id,
            "warrant_number": w.warrant_number,
            "issuer_id": w.issuer_id,
            "issuer_name": issuer.full_name if issuer else "Supervisory Authority",
            "issuer_role": w.issuer_role,
            "issuer_unique_id": issuer.unique_login_id if issuer else "N/A",
            "target_officer_id": w.target_officer_id,
            "target_officer_name": w.target_officer_name,
            "target_officer_role": w.target_officer_role,
            "target_unique_id": target.unique_login_id if target else "N/A",
            "target_zone": target.jurisdiction_zone if target else "Regional Zone",
            "warrant_type": w.warrant_type,
            "charges_summary": w.charges_summary,
            "statutory_grounds": w.statutory_grounds,
            "action_mandated": w.action_mandated,
            "hearing_deadline_days": w.hearing_deadline_days,
            "hearing_date": w.hearing_date.strftime("%Y-%m-%d %H:%M UTC") if w.hearing_date else None,
            "status": w.status,
            "resolution_notes": w.resolution_notes,
            "created_at": w.created_at.strftime("%Y-%m-%d %H:%M UTC") if w.created_at else None,
        })
    return output


@router.post("/warrants/{warrant_id}/resolve")
async def resolve_officer_warrant(
    warrant_id: int,
    payload: ResolveOfficerWarrantRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolve, dismiss, or enforce disciplinary penalties for an issued warrant."""
    res = await db.execute(select(OfficerWarrant).where(OfficerWarrant.id == warrant_id))
    warrant = res.scalar_one_or_none()
    if not warrant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warrant not found.")

    warrant.status = "RESOLVED_REVOKED" if "DISMISSED" in payload.resolution_action else "DISCIPLINARY_ENFORCED"
    warrant.resolution_notes = payload.resolution_notes

    await db.commit()
    await db.refresh(warrant)

    return {
        "success": True,
        "warrant_id": warrant.id,
        "warrant_number": warrant.warrant_number,
        "status": warrant.status,
        "resolution_notes": warrant.resolution_notes,
        "message": f"Warrant {warrant.warrant_number} updated to {warrant.status}."
    }


@router.get("/warrants/{warrant_id}/pdf")
async def export_officer_warrant_pdf(
    warrant_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download the official high-resolution statutory PDF warrant."""
    from app.services.pdf_generator import generate_statutory_warrant_pdf

    res = await db.execute(select(OfficerWarrant).where(OfficerWarrant.id == warrant_id))
    warrant = res.scalar_one_or_none()
    if not warrant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warrant not found.")

    issuer_res = await db.execute(select(User).where(User.id == warrant.issuer_id))
    issuer = issuer_res.scalar_one_or_none()
    target_res = await db.execute(select(User).where(User.id == warrant.target_officer_id))
    target = target_res.scalar_one_or_none()

    warrant_dict = {
        "id": warrant.id,
        "warrant_number": warrant.warrant_number,
        "warrant_type": warrant.warrant_type,
        "issuer_name": issuer.full_name if issuer else "Supervisory Authority",
        "issuer_unique_id": issuer.unique_login_id if issuer else "N/A",
        "issuer_role": warrant.issuer_role,
        "target_officer_name": warrant.target_officer_name,
        "target_unique_id": target.unique_login_id if target else "N/A",
        "target_officer_role": warrant.target_officer_role,
        "target_zone": target.jurisdiction_zone if target else "Regional Directorate",
        "charges_summary": warrant.charges_summary,
        "statutory_grounds": warrant.statutory_grounds,
        "action_mandated": warrant.action_mandated,
        "hearing_deadline_days": warrant.hearing_deadline_days,
        "hearing_date": warrant.hearing_date.strftime("%Y-%m-%d %H:%M UTC") if warrant.hearing_date else None,
        "status": warrant.status,
        "created_at": warrant.created_at.strftime("%Y-%m-%d %H:%M UTC") if warrant.created_at else None,
    }

    pdf_bytes = generate_statutory_warrant_pdf(warrant_dict)
    filename = f"LMPC_Statutory_Warrant_{warrant.warrant_number.replace('/', '_')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )




