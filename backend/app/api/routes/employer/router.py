"""
LMPC Compliance System — Employer / Brand API Router

Dedicated Pre-Market Compliance & Brand Registry Endpoints:
1. Pre-Market Packaging Artwork Submission & Digital Self-Test
2. Pre-Market Packaging Clearance Application & Certificate Tracker
3. Active Commercial Packaging Lines Directory
4. Statutory Notice Center & Rectification Uploads
"""

from datetime import datetime, timezone
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import normalize_image_url
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.models import (
    ApprovalStatus,
    PreMarketApplication,
    PreMarketStatus,
    ProductAudit,
    Scan,
    ScanStatus,
    User,
    UserRole,
)

router = APIRouter(prefix="/employer", tags=["Employer Brand Portal"])


# ---------- Employer Role Enforcement Dependency ----------
async def require_employer_or_supervisor(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    if current_user.role not in [UserRole.EMPLOYER, UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Requires Employer/Brand credentials.",
        )
    return current_user


# ---------- 1. Pre-Market Clearance Application Submission ----------
class SubmitPreMarketRequest(BaseModel):
    product_name: str
    brand: str
    category: str
    packaging_type: Optional[str] = "Pouch / Box"
    declared_mrp: Optional[float] = None
    declared_net_quantity: Optional[str] = None
    artwork_file_path: Optional[str] = None
    artwork_urls: Optional[List[str]] = None
    scan_id: Optional[int] = None


@router.post("/pre-market/submit")
async def submit_pre_market_application(
    payload: SubmitPreMarketRequest,
    current_user: User = Depends(require_employer_or_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Submit pre-market packaging artwork for Inspector verification and subsequent Supervisor clearance."""
    target_employer_id = current_user.id
    assigned_inspector_id = current_user.assigned_inspector_id

    if current_user.role in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        first_emp = await db.execute(select(User).where(User.role == UserRole.EMPLOYER))
        emp_obj = first_emp.scalars().first()
        if emp_obj:
            target_employer_id = emp_obj.id
            assigned_inspector_id = emp_obj.assigned_inspector_id

    # If no inspector directly assigned, assign first available field inspector
    if not assigned_inspector_id:
        first_insp = await db.execute(select(User).where(User.role == UserRole.INSPECTOR))
        insp_obj = first_insp.scalars().first()
        if insp_obj:
            assigned_inspector_id = insp_obj.id

    # Resolve artwork file path
    import json
    artwork_path = payload.artwork_file_path
    if payload.artwork_urls and len(payload.artwork_urls) > 0:
        clean_urls = [normalize_image_url(u) for u in payload.artwork_urls if u]
        if clean_urls:
            artwork_path = json.dumps(clean_urls) if len(clean_urls) > 1 else clean_urls[0]

    if payload.scan_id and not artwork_path:
        scan_res = await db.execute(select(Scan).where(Scan.id == payload.scan_id))
        scan_obj = scan_res.scalar_one_or_none()
        if scan_obj and scan_obj.image_url:
            if not artwork_path or artwork_path in ["/uploads/artwork_sample.png", "/uploads/artwork_submitted.png", ""]:
                artwork_path = scan_obj.image_url

    if artwork_path and not artwork_path.startswith("["):
        artwork_path = normalize_image_url(artwork_path)

    app = PreMarketApplication(
        employer_id=target_employer_id,
        assigned_inspector_id=assigned_inspector_id,
        scan_id=payload.scan_id,
        product_name=payload.product_name,
        brand=payload.brand,
        category=payload.category.lower(),
        packaging_type=payload.packaging_type or "Pouch / Box",
        declared_mrp=payload.declared_mrp,
        declared_net_quantity=payload.declared_net_quantity,
        artwork_file_path=artwork_path,
        status=PreMarketStatus.PENDING_INSPECTOR,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)

    # Get assigned inspector name
    insp_name = "Assigned Field Inspector"
    if assigned_inspector_id:
        insp_res = await db.execute(select(User).where(User.id == assigned_inspector_id))
        insp = insp_res.scalar_one_or_none()
        if insp:
            insp_name = insp.full_name or insp.username

    return {
        "id": app.id,
        "product_name": app.product_name,
        "assigned_inspector": insp_name,
        "status": app.status.value if hasattr(app.status, "value") else str(app.status),
        "message": f"Pre-market application queued for verification by {insp_name}. Upon inspector approval, it will be forwarded to Directorate Supervisor for official signature.",
        "created_at": app.created_at.strftime("%Y-%m-%d %H:%M UTC"),
    }


# ---------- 2. My Pre-Market Clearance Applications ----------
@router.get("/my-applications")
async def get_my_pre_market_applications(
    current_user: User = Depends(require_employer_or_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all pre-market packaging clearance applications submitted by this employer with verification lifecycle."""
    target_id = current_user.id
    if current_user.role in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        first_emp = await db.execute(select(User).where(User.role == UserRole.EMPLOYER))
        emp_obj = first_emp.scalars().first()
        if emp_obj:
            target_id = emp_obj.id

    res = await db.execute(
        select(PreMarketApplication)
        .where(PreMarketApplication.employer_id == target_id)
        .order_by(PreMarketApplication.created_at.desc())
    )
    apps = res.scalars().all()

    result = []
    for a in apps:
        insp_name = "Regional Inspectorate"
        if a.assigned_inspector_id:
            insp_res = await db.execute(select(User).where(User.id == a.assigned_inspector_id))
            insp = insp_res.scalar_one_or_none()
            if insp:
                insp_name = insp.full_name or insp.username

        # Resolve image from scan if application artwork is generic
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
            "product_name": a.product_name,
            "brand": a.brand,
            "category": a.category,
            "packaging_type": a.packaging_type,
            "declared_mrp": a.declared_mrp,
            "declared_net_quantity": a.declared_net_quantity,
            "artwork_file_path": norm_img_url,
            "image_url": norm_img_url,
            "artwork_urls": parsed_urls,
            "status": a.status.value,
            "assigned_inspector_id": a.assigned_inspector_id,
            "assigned_inspector_name": insp_name,
            "inspector_notes": a.inspector_notes,
            "inspector_verified_at": a.inspector_verified_at.strftime("%Y-%m-%d %H:%M UTC") if a.inspector_verified_at else None,
            "certificate_number": a.certificate_number,
            "supervisor_notes": a.supervisor_notes,
            "supervisor_signed_at": a.supervisor_signed_at.strftime("%Y-%m-%d %H:%M UTC") if a.supervisor_signed_at else None,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M UTC"),
        })

    return result


# ---------- 3. Active Commercial Packaging Lines ----------
@router.get("/my-products")
async def get_my_commercial_products(
    current_user: User = Depends(require_employer_or_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """List commercial packaging lines registered and audited under this brand."""
    target_id = current_user.id
    if current_user.role in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        first_emp = await db.execute(select(User).where(User.role == UserRole.EMPLOYER))
        emp_obj = first_emp.scalars().first()
        if emp_obj:
            target_id = emp_obj.id

    res = await db.execute(
        select(ProductAudit)
        .where(ProductAudit.employer_id == target_id)
        .order_by(ProductAudit.created_at.desc())
    )
    products = res.scalars().all()

    result = []
    for p in products:
        img_url = None
        if p.last_scan_id:
            s_res = await db.execute(select(Scan).where(Scan.id == p.last_scan_id))
            s_obj = s_res.scalar_one_or_none()
            if s_obj and s_obj.image_url:
                img_url = s_obj.image_url
        if not img_url:
            # Try to find a scan by product_name
            s_res = await db.execute(
                select(Scan).where(Scan.product_name == p.product_name).order_by(Scan.created_at.desc())
            )
            s_obj = s_res.scalars().first()
            if s_obj and s_obj.image_url:
                img_url = s_obj.image_url

        norm_img_url = normalize_image_url(img_url)

        result.append({
            "id": p.id,
            "product_name": p.product_name,
            "brand": p.brand,
            "category": p.category,
            "batch_number": p.batch_number,
            "mrp": p.mrp,
            "net_quantity": p.net_quantity,
            "gtin_barcode": p.gtin_barcode,
            "artwork_file_path": norm_img_url,
            "image_url": norm_img_url,
            "status": p.status.value,
            "notes": p.notes,
            "created_at": p.created_at.strftime("%Y-%m-%d"),
        })

    return result



# ---------- 4. Show-Cause Notices & 15-Day Deficiency Rectification Center ----------
class NoticeRectificationReplyRequest(BaseModel):
    reply_text: str
    corrective_artwork_url: Optional[str] = "/uploads/rectified_artwork.png"


class DeficiencyCaseResponseRequest(BaseModel):
    response_notes: str
    corrective_artwork_url: Optional[str] = None
    declared_mrp: Optional[float] = None
    declared_net_quantity: Optional[str] = None


@router.get("/my-notices")
async def get_my_statutory_notices(
    current_user: User = Depends(require_employer_or_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve any Show-Cause notices or inspection infractions issued against this brand."""
    res = await db.execute(
        select(Scan)
        .where(Scan.approval_status == ApprovalStatus.SANCTIONED_APPROVED)
        .order_by(Scan.created_at.desc())
    )
    scans = res.scalars().all()

    return [
        {
            "id": s.id,
            "product_name": s.product_name,
            "category": s.category,
            "compliance_score": s.compliance_score,
            "notice_number": f"LMPC/SCN/{s.created_at.year}/{s.id:05d}",
            "supervisor_notes": s.super_admin_review_notes or "Inspection infraction confirmed under LMPC 2011.",
            "issued_at": s.created_at.strftime("%Y-%m-%d"),
            "status": "Rectification Submitted • Under Inspector Review" if s.super_admin_review_notes and "Rectification Reply Submitted" in s.super_admin_review_notes else "Awaiting Rectification Proof",
        }
        for s in scans
    ]


@router.get("/deficiency-cases")
async def get_my_deficiency_cases(
    current_user: User = Depends(require_employer_or_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all 15-Day Statutory Deficiency Cases and Memos issued for this employer's products."""
    from app.db.models.models import ResolutionCase, SubmissionVersion
    from datetime import datetime, timezone

    # Fetch applications owned by this employer
    app_query = select(PreMarketApplication)
    if current_user.role == UserRole.EMPLOYER:
        app_query = app_query.where(PreMarketApplication.employer_id == current_user.id)
    app_res = await db.execute(app_query)
    apps = {a.id: a for a in app_res.scalars().all()}

    if not apps:
        return []

    res = await db.execute(
        select(ResolutionCase)
        .where(ResolutionCase.application_id.in_(list(apps.keys())))
        .order_by(ResolutionCase.created_at.desc())
    )
    cases = res.scalars().all()

    now = datetime.now(timezone.utc)
    result = []
    for c in cases:
        app = apps.get(c.application_id)
        if not app:
            continue

        # Get submission versions
        v_res = await db.execute(
            select(SubmissionVersion)
            .where(SubmissionVersion.application_id == app.id)
            .order_by(SubmissionVersion.version_number.desc())
        )
        versions = v_res.scalars().all()

        days_remaining = (
            (c.sla_deadline.replace(tzinfo=timezone.utc) - now).days
            if c.sla_deadline.tzinfo is None
            else (c.sla_deadline - now).days
        )
        is_overdue = days_remaining < 0 and c.status == "OPEN"

        # Resolve image URL
        raw_img = app.artwork_file_path
        if app.scan_id and (not raw_img or raw_img in ["/uploads/artwork_sample.png", "/uploads/artwork_submitted.png"]):
            s_res = await db.execute(select(Scan).where(Scan.id == app.scan_id))
            s_obj = s_res.scalar_one_or_none()
            if s_obj and s_obj.image_url:
                raw_img = s_obj.image_url
        norm_img_url = normalize_image_url(raw_img)
        from app.api.routes.inspector.router import get_application_violations
        app_violations = await get_application_violations(app, db)

        result.append({
            "id": c.id,
            "case_number": c.case_number,
            "application_id": c.application_id,
            "product_name": app.product_name,
            "brand": app.brand,
            "category": app.category,
            "packaging_type": app.packaging_type,
            "declared_mrp": app.declared_mrp,
            "declared_net_quantity": app.declared_net_quantity,
            "artwork_file_path": norm_img_url,
            "image_url": norm_img_url,
            "status": "OVERDUE_ESCALATED" if is_overdue else c.status,
            "memo_text": c.memo_text,
            "deficiencies": c.deficiencies_json or [],
            "violations": app_violations,
            "sla_deadline_days": c.sla_deadline_days,
            "dispatched_at": c.dispatched_at.strftime("%Y-%m-%d %H:%M UTC") if c.dispatched_at else None,
            "sla_deadline": c.sla_deadline.strftime("%Y-%m-%d") if c.sla_deadline else None,
            "days_remaining": max(days_remaining, 0),
            "is_overdue": is_overdue,
            "manufacturer_response_notes": c.manufacturer_response_notes,
            "resolved_at": c.resolved_at.strftime("%Y-%m-%d %H:%M UTC") if c.resolved_at else None,
            "versions": [
                {
                    "id": v.id,
                    "version_number": v.version_number,
                    "artwork_url": normalize_image_url(v.artwork_url),
                    "change_summary": v.change_summary,
                    "created_at": v.created_at.strftime("%Y-%m-%d %H:%M UTC") if v.created_at else None,
                }
                for v in versions
            ],
        })

    return result


@router.post("/upload-artwork")
async def upload_artwork_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Directly uploads corrected artwork file to uploads directory."""
    from app.services.scan_service import save_upload_image
    file_path = await save_upload_image(file)
    norm_url = normalize_image_url(file_path)
    return {
        "success": True,
        "artwork_url": norm_url,
        "url": norm_url,
        "file_path": file_path,
    }


@router.post("/upload-multiple-artwork")
async def upload_multiple_artwork_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Uploads multiple artwork or evidence photos simultaneously."""
    from app.services.scan_service import save_upload_image
    urls = []
    for f in files:
        file_path = await save_upload_image(f)
        urls.append(normalize_image_url(file_path))
    return {
        "success": True,
        "artwork_urls": urls,
        "urls": urls,
        "primary_url": urls[0] if urls else None,
        "count": len(urls),
    }


@router.post("/deficiency-cases/{case_id}/respond")
async def respond_to_deficiency_case(
    case_id: int,
    payload: DeficiencyCaseResponseRequest,
    current_user: User = Depends(require_employer_or_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Brand Owner submits 15-day deficiency verification response & rectified packaging photo."""
    from app.db.models.models import ResolutionCase, SubmissionVersion

    res = await db.execute(select(ResolutionCase).where(ResolutionCase.id == case_id))
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="15-Day Deficiency case not found.")

    app_res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == case.application_id))
    app = app_res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Linked pre-market application not found.")

    now = datetime.now(timezone.utc)
    rectified_img = normalize_image_url(payload.corrective_artwork_url or app.artwork_file_path)

    # Count existing versions
    v_count_res = await db.execute(
        select(SubmissionVersion).where(SubmissionVersion.application_id == app.id)
    )
    existing_versions = v_count_res.scalars().all()
    next_ver = len(existing_versions) + 1

    # Add SubmissionVersion record
    version_rec = SubmissionVersion(
        application_id=app.id,
        version_number=next_ver,
        submitted_by_id=current_user.id,
        artwork_url=rectified_img,
        declared_mrp=payload.declared_mrp if payload.declared_mrp is not None else app.declared_mrp,
        declared_net_quantity=payload.declared_net_quantity or app.declared_net_quantity,
        change_summary=payload.response_notes,
        submission_data_json={
            "response_notes": payload.response_notes,
            "case_number": case.case_number,
            "rectified_at": now.isoformat(),
        },
    )
    db.add(version_rec)

    # Update Resolution Case
    case.status = "RESPONSE_RECEIVED"
    case.manufacturer_response_notes = payload.response_notes

    # Update PreMarketApplication with new artwork and reset status for Inspector verification
    app.artwork_file_path = rectified_img
    if payload.declared_mrp is not None:
        app.declared_mrp = payload.declared_mrp
    if payload.declared_net_quantity:
        app.declared_net_quantity = payload.declared_net_quantity

    app.status = PreMarketStatus.PENDING_INSPECTOR
    app.inspector_notes = f"[15-DAY DEFICIENCY RESPONSE V{next_ver}] {payload.response_notes}"

    await db.commit()
    await db.refresh(case)
    await db.refresh(app)

    return {
        "success": True,
        "case_number": case.case_number,
        "status": "RESPONSE_RECEIVED",
        "version_number": next_ver,
        "rectified_artwork_url": rectified_img,
        "message": f"15-Day statutory rectification response & version {next_ver} submitted successfully! Routed to Field Inspectorate and Resolution Desk for verification.",
    }


@router.post("/notices/{scan_id}/reply")
async def submit_notice_rectification_reply(
    scan_id: int,
    payload: NoticeRectificationReplyRequest,
    current_user: User = Depends(require_employer_or_supervisor),
    db: AsyncSession = Depends(get_db),
):
    """Brand Owner submits formal reply and corrective artwork, routing immediately into the Field Inspector queue."""
    res = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = res.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Statutory notice / inspection record not found.")

    # Determine assigned inspector
    assigned_inspector_id = current_user.assigned_inspector_id
    if not assigned_inspector_id:
        first_insp = await db.execute(select(User).where(User.role == UserRole.INSPECTOR))
        insp_obj = first_insp.scalars().first()
        if insp_obj:
            assigned_inspector_id = insp_obj.id

    # Create PreMarketApplication for Inspector verification
    app = PreMarketApplication(
        employer_id=current_user.id,
        assigned_inspector_id=assigned_inspector_id,
        scan_id=scan.id,
        product_name=scan.product_name or "Rectified Packaging Commodity",
        brand=scan.brand or current_user.company_name or "Enterprise Brand",
        category=scan.category or "food",
        packaging_type="Rectified Commercial Packaging (Show-Cause Response)",
        declared_mrp=10.0,
        declared_net_quantity="100 g",
        artwork_file_path=normalize_image_url(payload.corrective_artwork_url),
        status=PreMarketStatus.PENDING_INSPECTOR,
        inspector_notes=f"BRAND SHOW-CAUSE REPLY: {payload.reply_text}",
    )
    db.add(app)

    scan.super_admin_review_notes = f"Rectification Reply Submitted by Brand: {payload.reply_text}"
    await db.commit()
    await db.refresh(app)

    return {
        "success": True,
        "application_id": app.id,
        "product_name": app.product_name,
        "status": "RECTIFICATION_SUBMITTED",
        "message": f"Rectification proof and reply submitted. Queued immediately for Field Inspector verification under Pre-Market Queue #{app.id}.",
    }



# ---------- 5. Clearance Certificate Multi-Format Exports (PDF, DOCX, EXCEL) ----------

async def _get_app_payload(db: AsyncSession, application_id: int) -> dict:
    res = await db.execute(select(PreMarketApplication).where(PreMarketApplication.id == application_id))
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Pre-market application not found.")

    emp_res = await db.execute(select(User).where(User.id == app.employer_id))
    emp = emp_res.scalar_one_or_none()

    return {
        "id": app.id,
        "company_name": emp.company_name if emp else "Enterprise Brand",
        "gstin_fssai_id": emp.gstin_fssai_id if emp else "Registered FMCG Unit",
        "product_name": app.product_name,
        "brand": app.brand,
        "category": app.category,
        "packaging_type": app.packaging_type,
        "declared_mrp": app.declared_mrp,
        "declared_net_quantity": app.declared_net_quantity,
        "certificate_number": app.certificate_number or f"LMPC/PMC/2026/08/{app.id:04d}",
        "supervisor_notes": app.supervisor_notes,
        "created_at": app.created_at.strftime("%Y-%m-%d"),
    }


@router.get("/pre-market/{application_id}/certificate/pdf")
async def download_pre_market_pdf(
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import Response
    from app.services.pdf_generator import generate_pre_market_clearance_pdf

    pm_data = await _get_app_payload(db, application_id)
    pdf_bytes = generate_pre_market_clearance_pdf(pm_data)
    filename = f"LMPC_Packaging_Clearance_Certificate_{pm_data['certificate_number'].replace('/', '_')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/pre-market/{application_id}/certificate/docx")
async def download_pre_market_docx(
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import Response
    from app.services.doc_generator import generate_pre_market_clearance_docx

    pm_data = await _get_app_payload(db, application_id)
    docx_bytes = generate_pre_market_clearance_docx(pm_data)
    filename = f"LMPC_Packaging_Clearance_Certificate_{pm_data['certificate_number'].replace('/', '_')}.docx"

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/pre-market/{application_id}/certificate/excel")
async def download_pre_market_excel(
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import Response
    from app.services.doc_generator import generate_pre_market_clearance_excel

    pm_data = await _get_app_payload(db, application_id)
    excel_bytes = generate_pre_market_clearance_excel(pm_data)
    filename = f"LMPC_Packaging_Clearance_Record_{pm_data['certificate_number'].replace('/', '_')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

