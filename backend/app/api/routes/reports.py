"""
LMPC Compliance System — Reports API Routes

Provides endpoints to download official PDF certificates and Excel exports.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.routes.scan import _build_scan_detail_response, _get_scan_or_404
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.models import Scan, User
from app.services.doc_generator import generate_docx_report, generate_excel_report
from app.services.pdf_generator import generate_pdf_report

router = APIRouter(tags=["Reports"])


@router.get("/scans/{scan_id}/report/pdf")
async def download_pdf_report(
    scan_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate and download an official Legal Metrology PDF inspection certificate."""
    scan = await _get_scan_or_404(db, scan_id, current_user)
    scan_detail = _build_scan_detail_response(scan)
    scan_data = scan_detail.model_dump()

    pdf_bytes = generate_pdf_report(scan_data)

    filename = f"LMPC_Audit_Report_#{scan_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/scans/{scan_id}/report/docx")
async def download_docx_report(
    scan_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate and download an official Legal Metrology Word (.docx) inspection notice."""
    scan = await _get_scan_or_404(db, scan_id, current_user)
    scan_detail = _build_scan_detail_response(scan)
    scan_data = scan_detail.model_dump()

    docx_bytes = generate_docx_report(scan_data)

    filename = f"LMPC_Audit_Notice_#{scan_id}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/scans/{scan_id}/report/excel")
async def download_excel_report(
    scan_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate and download an Excel spreadsheet audit record."""
    scan = await _get_scan_or_404(db, scan_id, current_user)
    scan_detail = _build_scan_detail_response(scan)
    scan_data = scan_detail.model_dump()

    excel_bytes = generate_excel_report(scan_data)

    filename = f"LMPC_Audit_Data_#{scan_id}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
