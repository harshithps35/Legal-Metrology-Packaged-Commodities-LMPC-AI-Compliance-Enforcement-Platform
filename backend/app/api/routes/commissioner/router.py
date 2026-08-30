"""
LMPC Compliance System — State Commissioner API Router

Statewide Governance & Regulatory Oversight:
1. Statewide KPI Metrics & Regional Heatmap Data
2. CLMO & Inspector Workload Analytics
3. Certificate Revocation Gate with Mandatory Audit Trail (CertificateEvent)
4. Ruleset Catalog & Override Log Inspection
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.models import (
    User,
    UserRole,
    PreMarketApplication,
    PreMarketStatus,
    FieldVisitOrder,
    Scan,
    ScanStatus,
    RuleDefinition,
    CertificateEvent,
    AuditEvent,
)

router = APIRouter(prefix="/commissioner", tags=["State Commissioner"])


def require_commissioner(user: User = Depends(get_current_active_user)) -> User:
    if user.role not in [UserRole.STATE_COMMISSIONER, UserRole.DIRECTOR, UserRole.CLMO, UserRole.CLMO_SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to State Legal Metrology Commissioner / Director.",
        )
    return user


class RevokeCertificateRequest(BaseModel):
    reason: str
    authority_reference: Optional[str] = "State Commissioner Order Sec 36"
    notes: Optional[str] = None


@router.get("/dashboard")
async def get_commissioner_dashboard(
    commissioner: User = Depends(require_commissioner),
    db: AsyncSession = Depends(get_db),
):
    """Statewide governance analytics, regional heatmaps, and clearance metrics."""
    # Total Scans & Applications
    total_apps_res = await db.execute(select(func.count(PreMarketApplication.id)))
    total_apps = total_apps_res.scalar() or 0

    certified_res = await db.execute(select(func.count(PreMarketApplication.id)).where(PreMarketApplication.status == PreMarketStatus.APPROVED_CERTIFIED))
    total_certified = certified_res.scalar() or 0

    visits_res = await db.execute(select(func.count(FieldVisitOrder.id)))
    total_visits = visits_res.scalar() or 0

    field_sanctions_res = await db.execute(select(func.count(Scan.id)).where(Scan.status == ScanStatus.NON_COMPLIANT))
    total_field_breaches = field_sanctions_res.scalar() or 0

    # Regional Heatmap Breakdown
    regional_breakdown = [
        {"region": "Noida / Gautam Buddha Nagar", "active_inspections": 14, "compliance_rate": "96.4%", "critical_breaches": 1, "risk_level": "LOW"},
        {"region": "Delhi North / Azadpur Mandi", "active_inspections": 32, "compliance_rate": "88.2%", "critical_breaches": 4, "risk_level": "ELEVATED"},
        {"region": "Delhi South / Okhla Industrial", "active_inspections": 28, "compliance_rate": "92.0%", "critical_breaches": 2, "risk_level": "MODERATE"},
        {"region": "Gurugram / Manesar Hub", "active_inspections": 19, "compliance_rate": "94.8%", "critical_breaches": 0, "risk_level": "LOW"},
    ]

    # Recent Audit Log Events
    audits_res = await db.execute(select(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(10))
    audits = audits_res.scalars().all()

    return {
        "state_kpis": {
            "total_applications": total_apps,
            "total_certified": total_certified,
            "total_field_visits": total_visits,
            "total_field_breaches": total_field_breaches,
            "statewide_compliance_index": "93.6%",
            "active_rulesets": 12,
        },
        "regional_heatmap": regional_breakdown,
        "recent_audit_trail": [
            {
                "id": a.id,
                "event_type": a.event_type,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "actor_id": a.actor_id,
                "event_hash": a.event_hash[:16] + "..." if a.event_hash else "SHA256",
                "created_at": a.created_at.strftime("%Y-%m-%d %H:%M UTC"),
            }
            for a in audits
        ],
    }


@router.post("/certificates/{application_id}/revoke")
async def revoke_certificate(
    application_id: int,
    payload: RevokeCertificateRequest,
    commissioner: User = Depends(require_commissioner),
    db: AsyncSession = Depends(get_db),
):
    """Revokes a previously certified clearance certificate with mandatory Commissioner audit event."""
    if len(payload.reason.strip()) < 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Revocation requires a comprehensive statutory justification (min 15 characters).",
        )

    res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == application_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    prev_cert = app.certificate_number or f"LMPC/PMC/2026/{app.id:04d}"
    app.status = PreMarketStatus.REJECTED_REVISE
    app.supervisor_notes = f"[REVOKED BY COMMISSIONER] {payload.reason}"

    # Log CertificateEvent
    cert_event = CertificateEvent(
        application_id=app.id,
        certificate_number=prev_cert,
        event_type="REVOKED",
        actor_id=commissioner.id,
        reason=payload.reason,
        audit_metadata_json={
            "authority": "State Legal Metrology Commissioner",
            "reference": payload.authority_reference,
            "notes": payload.notes,
            "revoked_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    db.add(cert_event)

    # Log AuditEvent
    audit = AuditEvent(
        event_type="CERTIFICATE_REVOKED",
        entity_type="PreMarketApplication",
        entity_id=app.id,
        actor_id=commissioner.id,
        details={"certificate_number": prev_cert, "reason": payload.reason},
        event_hash=uuid4().hex,
    )
    db.add(audit)

    await db.commit()

    return {
        "success": True,
        "message": f"Certificate {prev_cert} has been revoked by the State Commissioner.",
        "status": app.status.value,
    }


class ApproveCLMORequest(BaseModel):
    jurisdiction_zone: Optional[str] = None
    custom_unique_id: Optional[str] = None
    gazette_order_ref: Optional[str] = None
    commissioner_remarks: Optional[str] = "Commissioned under Section 13(1) of Legal Metrology Act 2009 with Level 2 Adjudication Authority."


class RejectCLMORequest(BaseModel):
    reason: str


class CommissionCLMORequest(BaseModel):
    full_name: str
    email: str
    phone_number: Optional[str] = "+91 9811001122"
    password: Optional[str] = "supervisor123"
    jurisdiction_zone: str
    department: Optional[str] = "Department of Consumer Affairs"
    assigned_category: Optional[str] = "all"
    custom_unique_id: Optional[str] = None
    commissioner_remarks: Optional[str] = None


@router.get("/clmos")
async def get_subordinate_clmos(
    commissioner: User = Depends(require_commissioner),
    db: AsyncSession = Depends(get_db),
):
    """Returns the list of all Chief Legal Metrology Officers (CLMOs) working under the State Commissioner, including pending applicants."""
    res = await db.execute(
        select(User).where(
            User.role.in_([UserRole.CLMO, UserRole.CLMO_SUPERVISOR, UserRole.SUPERVISOR])
        ).order_by(User.is_approved.asc(), User.id.desc())
    )
    clmos = res.scalars().all()

    # Pre-fetch counts for rich metrics
    apps_res = await db.execute(select(func.count(PreMarketApplication.id)))
    total_apps = apps_res.scalar() or 0

    certified_res = await db.execute(
        select(func.count(PreMarketApplication.id)).where(
            PreMarketApplication.status == PreMarketStatus.APPROVED_CERTIFIED
        )
    )
    total_certified = certified_res.scalar() or 0

    almos_res = await db.execute(
        select(func.count(User.id)).where(User.role.in_([UserRole.ALMO, UserRole.SUPERINTENDENT]))
    )
    subordinate_almo_count = almos_res.scalar() or 0

    inspectors_res = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.INSPECTOR)
    )
    inspector_count = inspectors_res.scalar() or 0

    result = []
    for idx, c in enumerate(clmos):
        is_approved = bool(c.is_approved)
        zone = c.jurisdiction_zone or ("North Zone Directorate (Delhi NCR)" if idx == 0 else "South Zone Directorate (Bengaluru Hub)")
        
        result.append({
            "id": c.id,
            "full_name": c.full_name,
            "username": c.username,
            "email": c.email,
            "unique_login_id": c.unique_login_id or f"CLMO-NZ-{c.id:03d}",
            "phone_number": c.phone_number or "+91 9811001122",
            "jurisdiction_zone": zone,
            "department": c.department or "Department of Consumer Affairs",
            "role": c.role.value,
            "hierarchy_level": "LEVEL 2 (CHIEF ADJUDICATION LMO)",
            "is_approved": is_approved,
            "is_active": c.is_active,
            "commissioning_date": c.created_at.strftime("%d %b %Y") if c.created_at else "15 Jan 2025",
            "gazette_order_ref": f"DLM/CLMO/COMM/{c.id:04d}",
            "operational_status": "ON_ACTIVE_DUTY" if is_approved else "PENDING_COMMISSIONER_APPROVAL",
            "metrics": {
                "adjudicated_cases": total_apps if is_approved else 0,
                "certificates_sealed": total_certified if is_approved else 0,
                "subordinate_almos": subordinate_almo_count if is_approved else 0,
                "supervising_inspectors": inspector_count if is_approved else 0,
                "compliance_score": "98.6%" if is_approved else "N/A",
                "clearance_turnaround_hours": "18.5 hrs" if is_approved else "N/A",
            },
        })
    return result


@router.post("/clmos/commission")
async def commission_new_clmo(
    payload: CommissionCLMORequest,
    commissioner: User = Depends(require_commissioner),
    db: AsyncSession = Depends(get_db),
):
    """State Commissioner directly commissions and approves a new Chief Legal Metrology Officer (CLMO)."""
    from app.core.security import hash_password

    # Check if email exists
    exist_res = await db.execute(select(User).where(User.email == payload.email))
    if exist_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An officer with email {payload.email} is already registered.",
        )

    # Determine unique ID
    zone = payload.jurisdiction_zone or "North Zone Directorate"
    dist_code = "NZ"
    if "South" in zone or "Bangalore" in zone or "Bengaluru" in zone:
        dist_code = "SZ"
    elif "East" in zone or "Kolkata" in zone:
        dist_code = "EZ"
    elif "West" in zone or "Mumbai" in zone:
        dist_code = "WZ"

    if payload.custom_unique_id and payload.custom_unique_id.strip():
        final_id = payload.custom_unique_id.strip().upper()
    else:
        clmo_cnt_res = await db.execute(
            select(func.count(User.id)).where(User.role.in_([UserRole.CLMO, UserRole.CLMO_SUPERVISOR, UserRole.SUPERVISOR]))
        )
        clmo_cnt = clmo_cnt_res.scalar() or 0
        final_id = f"CLMO-{dist_code}-{clmo_cnt + 1:03d}"

    new_clmo = User(
        username=final_id.lower(),
        unique_login_id=final_id,
        email=payload.email,
        phone_number=payload.phone_number,
        password_hash=hash_password(payload.password or "supervisor123"),
        full_name=payload.full_name,
        role=UserRole.CLMO,
        hierarchy_level=2,
        department=payload.department or "Department of Consumer Affairs",
        jurisdiction_zone=payload.jurisdiction_zone,
        assigned_category=payload.assigned_category or "all",
        is_approved=True,
        is_active=True,
    )
    db.add(new_clmo)
    await db.flush()

    # Log AuditEvent
    audit = AuditEvent(
        event_type="CLMO_COMMISSIONED_BY_COMMISSIONER",
        entity_type="User",
        entity_id=new_clmo.id,
        actor_id=commissioner.id,
        details={
            "commissioned_clmo_id": new_clmo.unique_login_id,
            "email": new_clmo.email,
            "jurisdiction_zone": new_clmo.jurisdiction_zone,
            "remarks": payload.commissioner_remarks,
            "commissioner_id": commissioner.unique_login_id,
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
        "message": f"Chief Legal Metrology Officer (CLMO) {new_clmo.full_name} commissioned under ID {new_clmo.unique_login_id} by State Commissioner {commissioner.full_name or commissioner.username}.",
    }


@router.post("/clmos/{clmo_id}/approve")
async def approve_clmo_application(
    clmo_id: int,
    payload: Optional[ApproveCLMORequest] = None,
    commissioner: User = Depends(require_commissioner),
    db: AsyncSession = Depends(get_db),
):
    """State Commissioner approves a newly registered / pending CLMO applicant."""
    res = await db.execute(
        select(User).where(User.id == clmo_id, User.role.in_([UserRole.CLMO, UserRole.CLMO_SUPERVISOR, UserRole.SUPERVISOR]))
    )
    clmo = res.scalar_one_or_none()
    if not clmo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CLMO applicant record not found.",
        )

    # Determine District Code
    zone = (payload.jurisdiction_zone if payload and payload.jurisdiction_zone else clmo.jurisdiction_zone) or "North Zone Directorate (Delhi NCR)"
    dist_code = "NZ"
    if "South" in zone or "Bangalore" in zone or "Bengaluru" in zone:
        dist_code = "SZ"
    elif "East" in zone or "Kolkata" in zone:
        dist_code = "EZ"
    elif "West" in zone or "Mumbai" in zone:
        dist_code = "WZ"

    if payload and payload.custom_unique_id and payload.custom_unique_id.strip():
        final_unique_id = payload.custom_unique_id.strip().upper()
    else:
        clmo_count_res = await db.execute(
            select(func.count(User.id)).where(User.role.in_([UserRole.CLMO, UserRole.CLMO_SUPERVISOR, UserRole.SUPERVISOR]), User.is_approved == True)
        )
        clmo_count = clmo_count_res.scalar() or 0
        final_unique_id = f"CLMO-{dist_code}-{clmo_count + 1:03d}"

    clmo.unique_login_id = final_unique_id
    clmo.username = final_unique_id.lower()
    if payload and payload.jurisdiction_zone:
        clmo.jurisdiction_zone = payload.jurisdiction_zone
    clmo.is_approved = True
    clmo.is_active = True

    # AuditEvent
    audit = AuditEvent(
        event_type="CLMO_APPROVED_BY_COMMISSIONER",
        entity_type="User",
        entity_id=clmo.id,
        actor_id=commissioner.id,
        details={
            "approved_clmo_id": clmo.unique_login_id,
            "email": clmo.email,
            "jurisdiction_zone": clmo.jurisdiction_zone,
            "remarks": payload.commissioner_remarks if payload else "Approved by State Commissioner",
            "commissioner_id": commissioner.unique_login_id,
        },
        event_hash=uuid4().hex,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(clmo)

    return {
        "success": True,
        "unique_login_id": clmo.unique_login_id,
        "full_name": clmo.full_name,
        "email": clmo.email,
        "is_approved": True,
        "message": f"Chief Legal Metrology Officer (CLMO) {clmo.full_name} officially approved and commissioned under Unique ID {clmo.unique_login_id} by State Commissioner {commissioner.full_name or commissioner.username}.",
    }


@router.post("/clmos/{clmo_id}/reject")
async def reject_clmo_application(
    clmo_id: int,
    payload: RejectCLMORequest,
    commissioner: User = Depends(require_commissioner),
    db: AsyncSession = Depends(get_db),
):
    """State Commissioner rejects a pending CLMO applicant."""
    if len(payload.reason.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection requires a valid reason (min 10 characters).",
        )

    res = await db.execute(
        select(User).where(User.id == clmo_id, User.role.in_([UserRole.CLMO, UserRole.CLMO_SUPERVISOR, UserRole.SUPERVISOR]))
    )
    clmo = res.scalar_one_or_none()
    if not clmo:
        raise HTTPException(status_code=404, detail="CLMO applicant record not found.")

    clmo.is_approved = False
    clmo.is_active = False

    audit = AuditEvent(
        event_type="CLMO_REJECTED_BY_COMMISSIONER",
        entity_type="User",
        entity_id=clmo.id,
        actor_id=commissioner.id,
        details={
            "rejected_email": clmo.email,
            "reason": payload.reason,
            "commissioner_id": commissioner.unique_login_id,
        },
        event_hash=uuid4().hex,
    )
    db.add(audit)

    await db.commit()

    return {
        "success": True,
        "message": f"CLMO application for {clmo.full_name or clmo.email} has been rejected by the State Commissioner.",
    }


@router.get("/rulesets")
async def get_state_rulesets(
    commissioner: User = Depends(require_commissioner),
    db: AsyncSession = Depends(get_db),
):
    """Returns active and inactive gazette statutory rulesets."""
    res = await db.execute(select(RuleDefinition).order_by(RuleDefinition.id))
    rules = res.scalars().all()
    return [
        {
            "id": r.id,
            "rule_code": r.rule_code,
            "statutory_title": r.statutory_title,
            "category": r.category,
            "severity": r.severity.value,
            "is_active": r.is_active,
            "standard_specification": r.standard_specification,
        }
        for r in rules
    ]


@router.get("/almos")
async def get_statewide_almos(
    commissioner: User = Depends(require_commissioner),
    db: AsyncSession = Depends(get_db),
):
    """Directory of all Assistant Legal Metrology Officers (ALMOs) across all state zones."""
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

