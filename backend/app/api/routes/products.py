"""
LMPC Compliance System — Products & Applications Universal Dossier API
"""

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import normalize_image_url
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.models import (
    FieldVisitOrder,
    PreMarketApplication,
    PreMarketStatus,
    ProductAudit,
    Scan,
    User,
)
from app.api.routes.inspector.router import get_application_violations

router = APIRouter(prefix="/products", tags=["Products & Applications"])


@router.get("/{product_id}")
async def get_product_dossier(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full product / application dossier with multi-angle artwork, caliper measurements, and visit orders."""
    # 1. Try finding by PreMarketApplication.id
    app_res = await db.execute(
        select(PreMarketApplication).where(PreMarketApplication.id == product_id)
    )
    app_obj = app_res.scalar_one_or_none()

    if not app_obj:
        # Try finding by scan_id
        app_res2 = await db.execute(
            select(PreMarketApplication).where(PreMarketApplication.scan_id == product_id)
        )
        app_obj = app_res2.scalar_one_or_none()

    if app_obj:
        emp_name = "Parle Products Pvt Ltd"
        if app_obj.employer_id:
            emp_res = await db.execute(select(User).where(User.id == app_obj.employer_id))
            emp = emp_res.scalar_one_or_none()
            if emp:
                emp_name = emp.company_name or emp.full_name or emp.username

        app_violations = await get_application_violations(app_obj, db)

        # Check attached field visit order
        vo_res = await db.execute(
            select(FieldVisitOrder).where(FieldVisitOrder.application_id == app_obj.id)
        )
        vo = vo_res.scalars().first()
        visit_data = None
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
                "physical_net_weight_grams": vo.physical_net_weight_grams,
                "batch_records_cross_checked": vo.batch_records_cross_checked,
                "factory_floor_photos": vo.factory_floor_photos or [],
                "inspection_signature": vo.inspection_signature,
                "gps_confidence": vo.gps_confidence or "HIGH",
                "visit_report_submitted": vo.visit_report_submitted,
                "visit_recommendation": vo.visit_recommendation,
                "on_site_inspector_remarks": vo.on_site_inspector_remarks,
                "almo_report_approved": vo.almo_report_approved,
            }

        # Resolve artwork URLs list
        raw_urls = []
        if app_obj.artwork_file_path:
            try:
                parsed = json.loads(app_obj.artwork_file_path)
                if isinstance(parsed, list):
                    raw_urls = [normalize_image_url(u) for u in parsed if u]
            except Exception:
                raw_urls = [normalize_image_url(app_obj.artwork_file_path)]

        norm_img_url = raw_urls[0] if raw_urls else normalize_image_url(app_obj.artwork_file_path)

        return {
            "id": app_obj.id,
            "application_id": app_obj.id,
            "product_name": app_obj.product_name,
            "brand": app_obj.brand,
            "category": app_obj.category,
            "packaging_type": app_obj.packaging_type,
            "declared_mrp": app_obj.declared_mrp,
            "declared_net_quantity": app_obj.declared_net_quantity,
            "mrp": app_obj.declared_mrp,
            "net_quantity": app_obj.declared_net_quantity,
            "company_name": emp_name,
            "status": app_obj.status.value if hasattr(app_obj.status, "value") else str(app_obj.status),
            "artwork_file_path": norm_img_url,
            "artwork_urls": raw_urls,
            "image_url": norm_img_url,
            "scan_id": app_obj.scan_id,
            "certificate_number": app_obj.certificate_number,
            "inspector_notes": app_obj.inspector_notes,
            "supervisor_notes": app_obj.supervisor_notes,
            "visit_order": visit_data,
            "violations": app_violations,
            "created_at": app_obj.created_at.strftime("%Y-%m-%d %H:%M UTC") if app_obj.created_at else None,
        }

    # 2. Try ProductAudit
    pa_res = await db.execute(select(ProductAudit).where(ProductAudit.id == product_id))
    pa = pa_res.scalar_one_or_none()
    if pa:
        emp_name = "Parle Products Pvt Ltd"
        if pa.employer_id:
            emp_res = await db.execute(select(User).where(User.id == pa.employer_id))
            emp = emp_res.scalar_one_or_none()
            if emp:
                emp_name = emp.company_name or emp.full_name or emp.username

        return {
            "id": pa.id,
            "application_id": pa.id,
            "product_name": pa.product_name,
            "brand": pa.brand,
            "category": pa.category,
            "batch_number": pa.batch_number,
            "mrp": pa.mrp,
            "net_quantity": pa.net_quantity,
            "company_name": emp_name,
            "status": pa.status.value if hasattr(pa.status, "value") else str(pa.status),
            "artwork_file_path": "/uploads/artwork_sample.png",
            "artwork_urls": ["/uploads/artwork_sample.png"],
            "image_url": "/uploads/artwork_sample.png",
            "violations": [],
            "created_at": pa.created_at.strftime("%Y-%m-%d %H:%M UTC") if pa.created_at else None,
        }

    raise HTTPException(status_code=404, detail="Product or Application dossier not found")
