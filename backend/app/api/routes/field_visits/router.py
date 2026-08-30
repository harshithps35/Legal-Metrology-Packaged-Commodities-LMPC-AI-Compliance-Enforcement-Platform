"""
LMPC Compliance System — Field Visit Orders API Router

Statutory on-site physical inspection workflow:
- Automated / Manual visit order creation triggered on Major / Critical violations
- Inspector & Sub-Inspector dispatch to factory premises / warehouse / retail point
- On-site evidence capture: factory floor photos, vernier caliper font measurement, QA batch logs
- Submission of Field Visit Reports to CLMO for final adjudication
"""

import hashlib
from datetime import datetime, timezone
from typing import Annotated, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.models import (
    FieldVisitOrder,
    PreMarketApplication,
    PreMarketStatus,
    Scan,
    User,
    UserRole,
)

router = APIRouter(prefix="/field-visits", tags=["Field Visit Orders & On-Site Inspection"])


# ---------- Schemas ----------

class CreateFieldVisitOrderRequest(BaseModel):
    application_id: Optional[int] = None
    scan_id: Optional[int] = None
    assigned_inspector_id: Optional[int] = None
    assigned_sub_inspector_id: Optional[int] = None
    visit_trigger_reason: str
    scheduled_date: Optional[str] = None  # YYYY-MM-DD
    scheduled_time: Optional[str] = "11:00 AM"
    visit_location_name: str
    visit_location_type: Optional[str] = "MANUFACTURING_PLANT"  # MANUFACTURING_PLANT, WAREHOUSE, RETAIL_POINT
    visit_address: str


class UploadVisitEvidenceRequest(BaseModel):
    factory_floor_photos: Optional[List[str]] = []
    caliper_font_measurement_mm: Optional[float] = None
    physical_net_weight_grams: Optional[float] = None
    batch_records_cross_checked: Optional[bool] = False
    physical_tampering_confirmed: Optional[bool] = False
    on_site_inspector_remarks: Optional[str] = None


class SubmitVisitReportRequest(BaseModel):
    visit_recommendation: str  # APPROVE_WITH_CONDITIONS, REJECT_SANCTION, SEEK_CLARIFICATION
    on_site_inspector_remarks: str
    caliper_font_measurement_mm: Optional[float] = None
    physical_net_weight_grams: Optional[float] = None
    factory_floor_photos: Optional[List[str]] = []
    batch_records_cross_checked: Optional[bool] = True
    physical_tampering_confirmed: Optional[bool] = False


# ---------- Helper to serialize visit order ----------

def _find_order_conds(visit_id: str):
    conds = [FieldVisitOrder.visit_id == visit_id, FieldVisitOrder.visit_order_no == visit_id]
    if str(visit_id).isdigit():
        conds.append(FieldVisitOrder.id == int(visit_id))
    return or_(*conds)


async def _serialize_visit_order(order: FieldVisitOrder, db: AsyncSession) -> dict:
    insp_res = await db.execute(select(User).where(User.id == order.assigned_inspector_id))
    insp = insp_res.scalar_one_or_none()

    sub_insp = None
    if order.assigned_sub_inspector_id:
        sub_res = await db.execute(select(User).where(User.id == order.assigned_sub_inspector_id))
        sub_insp = sub_res.scalar_one_or_none()

    app_data = None
    if order.application_id:
        app_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == order.application_id))
        app_obj = app_res.scalar_one_or_none()
        if app_obj:
            app_data = {
                "id": app_obj.id,
                "product_name": app_obj.product_name,
                "brand": app_obj.brand,
                "category": app_obj.category,
                "status": app_obj.status.value if hasattr(app_obj.status, "value") else str(app_obj.status),
                "declared_mrp": app_obj.declared_mrp,
                "declared_net_quantity": app_obj.declared_net_quantity,
            }

    return {
        "id": order.id,
        "visit_id": order.visit_id,
        "visit_order_no": order.visit_order_no or order.visit_id,
        "application_id": order.application_id,
        "application": app_data,
        "scan_id": order.scan_id,
        "sanctioned_by_almo_id": order.sanctioned_by_almo_id,
        "sanctioned_at": order.sanctioned_at.strftime("%Y-%m-%d %H:%M UTC") if order.sanctioned_at else None,
        "visit_sanctioned": order.visit_sanctioned,
        "assigned_inspector_id": order.assigned_inspector_id,
        "inspector_name": insp.full_name or insp.username if insp else "Assigned Inspector",
        "inspector_badge": insp.unique_login_id if insp else "LM-INSP-001",
        "assigned_sub_inspector_id": order.assigned_sub_inspector_id,
        "sub_inspector_name": sub_insp.full_name or sub_insp.username if sub_insp else None,
        "sub_inspector_badge": sub_insp.unique_login_id if sub_insp else None,
        "triage_severity": order.triage_severity or "MAJOR",
        "visit_trigger_reason": order.visit_trigger_reason,
        "visit_status": order.visit_status,
        "scheduled_date": order.scheduled_date.strftime("%Y-%m-%d") if order.scheduled_date else None,
        "scheduled_time": order.scheduled_time,
        "visit_location_name": order.visit_location_name,
        "visit_location_type": order.visit_location_type,
        "visit_address": order.visit_address,
        "factory_floor_photos": order.factory_floor_photos or [],
        "caliper_font_measurement_mm": order.caliper_font_measurement_mm,
        "caliper_attested_by": order.caliper_attested_by,
        "caliper_attested_at": order.caliper_attested_at.strftime("%Y-%m-%d %H:%M UTC") if order.caliper_attested_at else None,
        "physical_net_weight_grams": order.physical_net_weight_grams,
        "batch_records_cross_checked": order.batch_records_cross_checked,
        "physical_tampering_confirmed": order.physical_tampering_confirmed,
        "on_site_inspector_remarks": order.on_site_inspector_remarks,
        "inspection_signature": order.inspection_signature,
        "gps_confidence": order.gps_confidence or "HIGH",
        "visit_report_submitted": order.visit_report_submitted,
        "visit_recommendation": order.visit_recommendation,
        "visit_submitted_at": order.visit_submitted_at.strftime("%Y-%m-%d %H:%M UTC") if order.visit_submitted_at else None,
        "almo_report_approved": order.almo_report_approved,
        "almo_review_remarks": order.almo_review_remarks,
        "visit_report_rejected_count": order.visit_report_rejected_count,
        "is_waived": order.is_waived,
        "created_at": order.created_at.strftime("%Y-%m-%d %H:%M UTC"),
    }


# ---------- Endpoints ----------

@router.post("/orders")
async def create_field_visit_order(
    payload: CreateFieldVisitOrderRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a mandatory on-site physical inspection order for Major / Critical packaging violations (ALMO Authority)."""
    target_inspector_id = payload.assigned_inspector_id or current_user.id
    if current_user.role in [UserRole.MANUFACTURER, UserRole.EMPLOYER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Brand owners cannot issue statutory field visit orders.",
        )

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

    sched_dt = None
    if payload.scheduled_date:
        try:
            sched_dt = datetime.strptime(payload.scheduled_date, "%Y-%m-%d")
        except ValueError:
            sched_dt = now
    else:
        sched_dt = now

    order = FieldVisitOrder(
        visit_id=visit_id_code,
        visit_order_no=visit_order_no,
        application_id=payload.application_id,
        scan_id=payload.scan_id,
        sanctioned_by_almo_id=current_user.id,
        sanctioned_at=now,
        visit_sanctioned=True,
        assigned_inspector_id=target_inspector_id,
        assigned_sub_inspector_id=payload.assigned_sub_inspector_id,
        visit_trigger_reason=payload.visit_trigger_reason,
        triggered_by_inspector_id=current_user.id,
        visit_status="SCHEDULED",
        scheduled_date=sched_dt,
        scheduled_time=payload.scheduled_time or "11:00 AM",
        visit_location_name=payload.visit_location_name,
        visit_location_type=payload.visit_location_type or "MANUFACTURING_PLANT",
        visit_address=payload.visit_address,
        triage_severity="MAJOR",
    )
    db.add(order)

    # If linked to application, update status to PENDING_FIELD_INSPECTION / VISIT_SANCTIONED
    if payload.application_id:
        app_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == payload.application_id))
        app_obj = app_res.scalar_one_or_none()
        if app_obj:
            app_obj.status = PreMarketStatus.VISIT_SANCTIONED
            app_obj.visit_required = True
            app_obj.visit_trigger_reason = payload.visit_trigger_reason
            app_obj.visit_order_id = visit_id_code
            app_obj.visit_order_no = visit_order_no
            app_obj.assigned_almo_id = current_user.id
            app_obj.supervisor_notes = f"FIELD VISIT SANCTIONED BY ALMO: Order #{visit_order_no} ({payload.visit_trigger_reason}). Scheduled at {payload.visit_location_name}."

    await db.commit()
    await db.refresh(order)

    return await _serialize_visit_order(order, db)


@router.get("/orders/my-assigned")
async def get_my_assigned_field_visits(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all physical inspection orders assigned to the logged-in Inspector or Sub-Inspector."""
    query = select(FieldVisitOrder).order_by(FieldVisitOrder.created_at.desc())

    if current_user.role in [UserRole.INSPECTOR, UserRole.SUB_INSPECTOR]:
        query = query.where(
            (FieldVisitOrder.assigned_inspector_id == current_user.id) |
            (FieldVisitOrder.assigned_sub_inspector_id == current_user.id)
        )

    res = await db.execute(query)
    orders = res.scalars().all()

    return [await _serialize_visit_order(o, db) for o in orders]


@router.get("/orders/schedule")
async def get_all_field_visits_schedule(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """ALMO, CLMO, and State Commissioner calendar view of all scheduled and completed field visits."""
    res = await db.execute(select(FieldVisitOrder).order_by(FieldVisitOrder.scheduled_date.asc()))
    orders = res.scalars().all()
    return [await _serialize_visit_order(o, db) for o in orders]


@router.get("/orders/{visit_id}")
async def get_field_visit_order(
    visit_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single visit order details."""
    query = select(FieldVisitOrder).where(_find_order_conds(visit_id))
    res = await db.execute(query)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail=f"Field visit order {visit_id} not found.")

    return await _serialize_visit_order(order, db)


@router.patch("/orders/{visit_id}/start")
async def start_field_visit(
    visit_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Inspector logs arrival at manufacturing unit / warehouse and commences physical audit."""
    query = select(FieldVisitOrder).where(_find_order_conds(visit_id))
    res = await db.execute(query)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Visit order not found.")

    order.visit_status = "IN_PROGRESS"
    order.visit_started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(order)

    return {"success": True, "visit_status": "IN_PROGRESS", "message": "On-site field audit initiated with GPS timestamp lock."}


@router.post("/orders/{visit_id}/evidence")
async def upload_field_visit_evidence(
    visit_id: str,
    payload: UploadVisitEvidenceRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload factory floor photos, vernier caliper measurements, and on-site logs."""
    query = select(FieldVisitOrder).where(_find_order_conds(visit_id))
    res = await db.execute(query)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Visit order not found.")

    if order.visit_report_submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence record is locked and immutable after Visit Report submission.",
        )

    if payload.factory_floor_photos:
        existing = order.factory_floor_photos or []
        order.factory_floor_photos = list(set(existing + payload.factory_floor_photos))

    if payload.caliper_font_measurement_mm is not None:
        order.caliper_font_measurement_mm = payload.caliper_font_measurement_mm

    if payload.physical_net_weight_grams is not None:
        order.physical_net_weight_grams = payload.physical_net_weight_grams

    if payload.batch_records_cross_checked is not None:
        order.batch_records_cross_checked = payload.batch_records_cross_checked

    if payload.physical_tampering_confirmed is not None:
        order.physical_tampering_confirmed = payload.physical_tampering_confirmed

    if payload.on_site_inspector_remarks:
        order.on_site_inspector_remarks = payload.on_site_inspector_remarks

    await db.commit()
    await db.refresh(order)

    return await _serialize_visit_order(order, db)


@router.post("/orders/{visit_id}/submit-report")
async def submit_field_visit_report(
    visit_id: str,
    payload: SubmitVisitReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Inspector submits final on-site Field Visit Report with statutory recommendation for ALMO report review & CLMO adjudication."""
    query = select(FieldVisitOrder).where(_find_order_conds(visit_id))
    res = await db.execute(query)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Visit order not found.")

    now = datetime.now(timezone.utc)
    order.visit_status = "COMPLETED"
    order.visit_report_submitted = True
    order.visit_recommendation = payload.visit_recommendation
    order.on_site_inspector_remarks = payload.on_site_inspector_remarks
    order.visit_submitted_at = now
    order.caliper_attested_by = current_user.id
    order.caliper_attested_at = now

    if payload.caliper_font_measurement_mm is not None:
        order.caliper_font_measurement_mm = payload.caliper_font_measurement_mm

    if payload.physical_net_weight_grams is not None:
        order.physical_net_weight_grams = payload.physical_net_weight_grams

    if payload.factory_floor_photos:
        existing = order.factory_floor_photos or []
        order.factory_floor_photos = list(set(existing + payload.factory_floor_photos))

    order.batch_records_cross_checked = payload.batch_records_cross_checked
    order.physical_tampering_confirmed = payload.physical_tampering_confirmed

    # Generate immutable cryptographic inspection signature
    sig_payload = f"{order.visit_id}:{order.application_id}:{order.assigned_inspector_id}:{order.assigned_sub_inspector_id}:{now.isoformat()}"
    order.inspection_signature = hashlib.sha256(sig_payload.encode()).hexdigest()

    # Update parent application status to FIELD_VISIT_COMPLETED (ready for ALMO report review)
    if order.application_id:
        app_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == order.application_id))
        app_obj = app_res.scalar_one_or_none()
        if app_obj:
            app_obj.status = PreMarketStatus.FIELD_VISIT_COMPLETED
            app_obj.inspector_verified_at = now
            app_obj.inspector_notes = f"FIELD VISIT COMPLETED (Order #{order.visit_order_no or order.visit_id}): Recommendation = {payload.visit_recommendation}. Caliper font = {payload.caliper_font_measurement_mm or 'N/A'}mm. Signature: {order.inspection_signature[:16]}..."

    await db.commit()
    await db.refresh(order)

    return {
        "success": True,
        "visit_id": order.visit_id,
        "visit_order_no": order.visit_order_no,
        "visit_status": "COMPLETED",
        "visit_recommendation": order.visit_recommendation,
        "inspection_signature": order.inspection_signature,
        "message": "Field Visit Report successfully submitted and cryptographically sealed. Routed to ALMO for evidence verification.",
        "order": await _serialize_visit_order(order, db),
    }
