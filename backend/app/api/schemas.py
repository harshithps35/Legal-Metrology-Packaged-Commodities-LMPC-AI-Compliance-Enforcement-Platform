"""
LMPC Compliance System — Pydantic Schemas

Request/response models for all API endpoints:
- Auth & User management
- Scans, extracted fields, violations, and compliance reports
- Work assignments & quota tracking
- AI risk recommendations & batch allocation
- Statutory rules catalog
- Regulatory sanction & approval workflow
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ============================================================
# Auth & User Schemas
# ============================================================

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = "inspector"
    jurisdiction_zone: Optional[str] = None
    assigned_category: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    unique_login_id: Optional[str] = None
    email: str
    phone_number: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    department: Optional[str] = None
    jurisdiction_zone: Optional[str] = None
    assigned_category: Optional[str] = None
    company_name: Optional[str] = None
    gstin_fssai_id: Optional[str] = None
    is_active: bool
    is_approved: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class SendPhoneOTPRequest(BaseModel):
    phone_number: str


class VerifyPhoneOTPRequest(BaseModel):
    phone_number: str
    otp: str


class SendEmailOTPRequest(BaseModel):
    email: str


class VerifyEmailOTPRequest(BaseModel):
    email: str
    otp: str


class EmployerRegisterRequest(BaseModel):
    company_name: str
    gstin_fssai_id: str
    contact_person: str
    email: str
    phone_number: str
    password: str
    category: Optional[str] = "food"
    jurisdiction_zone: Optional[str] = "North Zone (Delhi NCR)"
    phone_otp: Optional[str] = None
    email_otp: Optional[str] = None


class InspectorRegisterRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    department: Optional[str] = "Lead Legal Metrology Enforcement"
    jurisdiction_zone: str = "North Zone (Delhi NCR)"
    assigned_category: Optional[str] = "all"
    phone_otp: Optional[str] = None
    email_otp: Optional[str] = None


class SubInspectorRegisterRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    department: Optional[str] = "Field Inspection Squad & On-site Verification"
    jurisdiction_zone: str = "North Zone (Delhi NCR)"
    assigned_category: Optional[str] = "all"
    phone_otp: Optional[str] = None
    email_otp: Optional[str] = None


class InspectorCommissionRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    department: Optional[str] = "Legal Metrology Enforcement Directorate"
    jurisdiction_zone: str = "North Zone (Delhi NCR)"
    assigned_category: Optional[str] = "all"
    custom_unique_id: Optional[str] = None


class InspectorApproveRequest(BaseModel):
    custom_unique_id: Optional[str] = None
    jurisdiction_zone: Optional[str] = None
    assigned_category: Optional[str] = None
    notes: Optional[str] = None


class SupervisorCommissionRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    department: Optional[str] = "Department of Consumer Affairs HQ"
    jurisdiction_zone: Optional[str] = "National HQ / All Zones"
    warrant_notes: Optional[str] = None


class CLMORegisterRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    department: Optional[str] = "Department of Consumer Affairs / Legal Metrology Directorate"
    jurisdiction_zone: str = "North Zone Directorate (Delhi NCR)"
    assigned_category: Optional[str] = "all"
    phone_otp: Optional[str] = None
    email_otp: Optional[str] = None


class CLMOCommissionRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    jurisdiction_zone: str = "North Zone Directorate (Noida / Delhi NCR)"
    custom_unique_id: Optional[str] = None
    department: Optional[str] = "Department of Consumer Affairs / Legal Metrology Directorate"
    warrant_notes: Optional[str] = None


class ALMORegisterRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    department: Optional[str] = "Regional Legal Metrology Sanctioning Office"
    jurisdiction_zone: str = "Noida / Greater Noida District Office"
    assigned_category: Optional[str] = "all"
    phone_otp: Optional[str] = None
    email_otp: Optional[str] = None


class ALMOCommissionRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str
    password: str
    jurisdiction_zone: str = "Noida / Greater Noida District Office"
    custom_unique_id: Optional[str] = None
    department: Optional[str] = "Regional Legal Metrology Sanctioning Office"
    warrant_notes: Optional[str] = None


class ALMOApproveRequest(BaseModel):
    custom_unique_id: Optional[str] = None
    jurisdiction_zone: Optional[str] = None
    notes: Optional[str] = None


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# ============================================================
# Statutory Rules Catalog Schemas
# ============================================================

class RuleDefinitionResponse(BaseModel):
    id: int
    rule_code: str
    statutory_title: str
    category: str
    legal_text: str
    standard_specification: str
    severity: str
    is_active: bool

    model_config = {"from_attributes": True}


# ============================================================
# Work Assignment & Quota Schemas
# ============================================================

class WorkAssignmentCreate(BaseModel):
    inspector_id: int
    title: str
    industry_category: str
    target_company: Optional[str] = None
    target_count: int = 10
    month_year: str = Field(..., description="Format: YYYY-MM e.g. '2026-08'")
    due_date: datetime
    notes: Optional[str] = None


class WorkAssignmentBatchCreate(BaseModel):
    assignments: list[WorkAssignmentCreate]


BatchWorkAssignmentCreate = WorkAssignmentBatchCreate


class WorkAssignmentResponse(BaseModel):
    id: int
    super_admin_id: int
    inspector_id: int
    title: str
    industry_category: str
    target_company: Optional[str] = None
    target_count: int
    completed_count: int = 0
    month_year: str
    due_date: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime
    inspector: Optional[UserResponse] = None

    model_config = {"from_attributes": True}


class BatchWorkAssignmentResponse(BaseModel):
    dispatched_count: int
    message: str
    assignments: list[WorkAssignmentResponse]


class AIRecommendationItem(BaseModel):
    inspector_id: int
    inspector_name: str
    industry_category: str
    jurisdiction_zone: str
    historical_scan_count: int
    critical_violations_count: int
    risk_level: str  # "HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"
    risk_score: float
    recommended_quota: int
    reasoning: str


class AIRecommendationResponse(BaseModel):
    month_year: str
    generated_at: datetime
    summary: dict[str, Any]
    recommendations: list[AIRecommendationItem]


# ============================================================
# Regulatory Sanction Schemas
# ============================================================

class SanctionRequest(BaseModel):
    action: str = Field(..., description="'approve_notice' | 'grant_certificate' | 'request_reinspection'")
    notes: Optional[str] = None


SanctionDecisionRequest = SanctionRequest


class SanctionDecisionResponse(BaseModel):
    scan_id: int
    approval_status: str
    legal_notice_number: Optional[str] = None
    reviewer_name: Optional[str] = None
    sanctioned_at: Optional[datetime] = None
    notes: Optional[str] = None


class SanctionResponse(BaseModel):
    scan_id: int
    approval_status: str
    super_admin_reviewer_id: int
    sanctioned_at: datetime
    notes: Optional[str] = None
    legal_notice_number: Optional[str] = None


# ============================================================
# Scan Schemas
# ============================================================

class ScanCreate(BaseModel):
    """Metadata submitted alongside the image upload."""
    product_name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    assignment_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_accuracy_meters: Optional[float] = None
    location_name: Optional[str] = None
    client_evidence_hash: Optional[str] = None


class BoundingBoxSchema(BaseModel):
    x: int
    y: int
    w: int
    h: int


class ExtractedFieldResponse(BaseModel):
    field_id: str
    display_name: str
    detected: bool
    value: Optional[str] = None
    normalized_value: Optional[str] = None
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    confidence: float = 0.0
    bounding_box: Optional[BoundingBoxSchema] = None
    font_height_px: Optional[int] = None
    font_status: Optional[str] = None
    source: str = ""
    is_manually_corrected: bool = False


class ViolationResponse(BaseModel):
    id: Optional[int] = None
    rule_code: str
    field_id: str
    severity: str
    title: str
    description: str
    recommendation: str = ""


class FontMeasurementResponse(BaseModel):
    field_id: str
    font_height_px: int
    font_height_mm: float
    min_required_mm: float
    status: str
    measurement_method: str
    confidence: str


class VerdictResponse(BaseModel):
    status: str
    display_name: str
    color: str


class ComplianceReportResponse(BaseModel):
    verdict: VerdictResponse
    compliance_score: float
    violation_summary: dict[str, int]
    violations: list[ViolationResponse]
    field_statuses: dict[str, Any]
    font_measurements: dict[str, Any]
    metadata: dict[str, Any] = {}


class ScanSummaryResponse(BaseModel):
    """Lightweight scan summary for list endpoints."""
    id: int
    product_name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    status: str
    compliance_score: Optional[float] = None
    approval_status: str = "auto_approved"
    location_name: Optional[str] = None
    client_evidence_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedScansResponse(BaseModel):
    items: list[ScanSummaryResponse]
    total: int
    page: int
    page_size: int
    pages: int = 1
    total_pages: Optional[int] = None


class FieldCorrectionItem(BaseModel):
    field_id: str
    corrected_value: str
    reason: Optional[str] = None


class FieldCorrectionBatchRequest(BaseModel):
    corrections: list[FieldCorrectionItem]


class FieldCorrectionResponse(BaseModel):
    scan_id: int
    updated_fields: list[str]
    new_compliance_score: float
    new_verdict: str
    message: str


class ScanDetailResponse(BaseModel):
    """Full scan detail with extracted fields, violations, evidence hashes, and report."""
    id: int
    product_name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    image_url: str
    status: str
    compliance_score: Optional[float] = None
    raw_ocr_text: Optional[str] = None
    calibration_method: Optional[str] = None
    
    # Feature 1: GPS & Evidence
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_accuracy_meters: Optional[float] = None
    location_name: Optional[str] = None
    client_evidence_hash: Optional[str] = None
    inspection_signature: Optional[str] = None

    # Feature 2: Barcode GTIN & Price Check
    barcode_data: Optional[dict[str, Any]] = None
    barcode_cross_check_status: Optional[str] = None

    # Governance: Two-Tier Approval
    approval_status: str = "auto_approved"
    super_admin_reviewer_id: Optional[int] = None
    super_admin_review_notes: Optional[str] = None
    sanctioned_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime
    user: UserResponse
    assignment: Optional[WorkAssignmentResponse] = None
    extracted_fields: list[ExtractedFieldResponse]
    violations: list[ViolationResponse]
    compliance_report: Optional[ComplianceReportResponse] = None

    model_config = {"from_attributes": True}


# ============================================================
# Dashboard Schemas
# ============================================================

class CommonViolationResponse(BaseModel):
    title: str
    severity: str
    count: int


class DashboardStatsResponse(BaseModel):
    total_scans: int
    compliant_count: int
    non_compliant_count: int
    review_count: int
    avg_compliance_score: float
    most_common_violations: list[CommonViolationResponse]

