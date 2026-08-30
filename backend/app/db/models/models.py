"""
LMPC Compliance System — Database Models

SQLAlchemy ORM models for:
- Multi-tier users (State Commissioner, CLMO Supervisor, Inspector, Sub-Inspector, Resolution Desk, Manufacturer) with Unique Login IDs
- Work assignments & immutable quota credits
- Scans, extracted fields, violations, evidence files, and field revisions
- Assigned employers under inspector jurisdiction
- Active products under audit pipeline
- Employer pre-market packaging clearance applications
- Mandatory Field Visit Orders (triggered on Major / Critical violations)
- Statutory Gazette rule definitions and immutable audit events
"""

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


# ---------- Enums ----------

class UserRole(str, enum.Enum):
    STATE_COMMISSIONER = "state_commissioner"
    DIRECTOR = "director"
    CLMO = "clmo"
    CLMO_SUPERVISOR = "clmo"  # Alias
    ALMO = "almo"
    SUPERINTENDENT = "almo"  # Alias
    SUPERVISOR = "almo"  # Alias for backward compat
    SUPER_ADMIN = "clmo"  # Alias
    ADMIN = "admin"
    INSPECTOR = "inspector"
    SUB_INSPECTOR = "sub_inspector"
    RESOLUTION_DESK = "resolution_desk"
    EMPLOYEE = "employee"
    EMPLOYER = "employer"
    MANUFACTURER = "manufacturer"
    VIEWER = "viewer"


class ScanStatus(str, enum.Enum):
    PROCESSING = "processing"
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    REQUIRES_REVIEW = "requires_review"
    FAILED = "failed"


class ViolationSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    MAJOR = "MAJOR"
    MINOR = "MINOR"


class AssignmentStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class ApprovalStatus(str, enum.Enum):
    AUTO_APPROVED = "auto_approved"
    PENDING_SANCTION = "pending_sanction"
    SANCTIONED_APPROVED = "sanctioned_approved"
    REJECTED_REINSPECT = "rejected_reinspect"


class ProductAuditStatus(str, enum.Enum):
    SCHEDULED_FIELD_AUDIT = "scheduled_field_audit"
    IN_VERIFICATION = "in_verification"
    VIOLATION_FLAGGED = "violation_flagged"
    CLEARED_COMPLIANT = "cleared_compliant"


class PreMarketStatus(str, enum.Enum):
    PENDING_INSPECTOR = "pending_inspector"
    PENDING_ALMO_SANCTION = "pending_almo_sanction"
    VISIT_SANCTIONED = "visit_sanctioned"
    PENDING_FIELD_INSPECTION = "pending_field_inspection"
    FIELD_VISIT_COMPLETED = "field_visit_completed"
    VISIT_REPORT_REJECTED = "visit_report_rejected"
    FIELD_VISIT_WAIVED = "field_visit_waived"
    PENDING_SUPERVISOR = "pending_supervisor"
    PENDING_CLMO_APPROVAL = "pending_clmo_approval"
    APPROVED_CERTIFIED = "approved_certified"
    REJECTED_REVISE = "rejected_revise"
    REJECTED_SANCTIONED = "rejected_sanctioned"
    PENDING_REVIEW = "pending_review"
    RESUBMITTED = "resubmitted"


# ---------- Models ----------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    unique_login_id = Column(String(50), unique=True, nullable=True, index=True)  # COMM-HQ-001, CLMO-NZ-001, INSP-DEL-042, ASST-DEL-012, EMP-PARLE-101
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.INSPECTOR, nullable=False)
    hierarchy_level = Column(Integer, default=3, nullable=False)  # 1=Commissioner, 2=CLMO, 3=ALMO, 4=Inspector, 5=Sub-Inspector/ResolutionDesk, 6=Manufacturer
    zone_region = Column(String(100), nullable=True)  # e.g., "North Zone (Noida/Delhi)", "West Zone (Mumbai)"
    department = Column(String(255), nullable=True)
    jurisdiction_zone = Column(String(100), nullable=True)  # e.g., "North Zone", "Noida Sector 18"
    assigned_category = Column(String(100), nullable=True)  # e.g., "food", "cosmetics", "all"
    
    # Employer / Manufacturer-specific fields
    company_name = Column(String(255), nullable=True)
    gstin_fssai_id = Column(String(100), nullable=True)
    phone_number = Column(String(50), nullable=True)
    assigned_inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_approved = Column(Boolean, default=True, nullable=False)  # For inspectors requiring supervisor sign-off
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    scans = relationship("Scan", back_populates="user", lazy="selectin", foreign_keys="Scan.user_id")
    work_assignments = relationship(
        "WorkAssignment",
        back_populates="inspector",
        lazy="selectin",
        foreign_keys="WorkAssignment.inspector_id"
    )
    assigned_by_assignments = relationship(
        "WorkAssignment",
        back_populates="super_admin",
        lazy="selectin",
        foreign_keys="WorkAssignment.super_admin_id"
    )
    assigned_employers = relationship(
        "AssignedEmployer",
        back_populates="inspector",
        lazy="selectin",
        foreign_keys="AssignedEmployer.inspector_id"
    )
    field_audits = relationship(
        "ProductAudit",
        back_populates="inspector",
        lazy="selectin",
        foreign_keys="ProductAudit.inspector_id"
    )
    pre_market_applications = relationship(
        "PreMarketApplication",
        back_populates="employer",
        lazy="selectin",
        foreign_keys="PreMarketApplication.employer_id"
    )


class WorkAssignment(Base):
    __tablename__ = "work_assignments"

    id = Column(Integer, primary_key=True, index=True)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    super_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    industry_category = Column(String(100), nullable=False, index=True)
    target_company = Column(String(255), nullable=True)
    target_count = Column(Integer, default=10, nullable=False)
    month_year = Column(String(7), nullable=False, index=True)  # YYYY-MM
    due_date = Column(DateTime, nullable=False)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.ASSIGNED, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    inspector = relationship("User", foreign_keys=[inspector_id], back_populates="work_assignments")
    super_admin = relationship("User", foreign_keys=[super_admin_id], back_populates="assigned_by_assignments")
    scans = relationship("Scan", back_populates="assignment", lazy="selectin")
    credits = relationship("AssignmentCredit", back_populates="assignment", lazy="selectin")


class AssignmentCredit(Base):
    __tablename__ = "assignment_credits"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("work_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), unique=True, nullable=False)
    credited_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    assignment = relationship("WorkAssignment", back_populates="credits")
    scan = relationship("Scan", back_populates="assignment_credit")


class AssignedEmployer(Base):
    """Manufacturing units & brand facilities under an inspector's jurisdiction."""
    __tablename__ = "assigned_employers"

    id = Column(Integer, primary_key=True, index=True)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    facility_id = Column(String(100), nullable=True)  # e.g., "PLANT-NOIDA-01"
    facility_address = Column(String(500), nullable=False)
    gstin_fssai_id = Column(String(100), nullable=True)
    primary_contact_name = Column(String(255), nullable=True)
    primary_contact_phone = Column(String(50), nullable=True)
    industry_category = Column(String(100), nullable=False)  # "food", "cosmetics", etc.
    active_packaging_lines_count = Column(Integer, default=1, nullable=False)
    last_audited_at = Column(DateTime, nullable=True)
    inspection_status = Column(String(50), default="SCHEDULED", nullable=False)  # "SCHEDULED", "IN_PROGRESS", "CLEARED", "DEFECT_FOUND"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    inspector = relationship("User", foreign_keys=[inspector_id], back_populates="assigned_employers")


class ProductAudit(Base):
    """Active packaging commodities under inspection pipeline."""
    __tablename__ = "product_audits"

    id = Column(Integer, primary_key=True, index=True)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    employer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    product_name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    batch_number = Column(String(100), nullable=True)
    mrp = Column(Float, nullable=True)
    net_quantity = Column(String(100), nullable=True)
    gtin_barcode = Column(String(100), nullable=True)
    status = Column(Enum(ProductAuditStatus, values_callable=lambda x: [e.value for e in x]), default=ProductAuditStatus.SCHEDULED_FIELD_AUDIT, nullable=False, index=True)
    last_scan_id = Column(Integer, ForeignKey("scans.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    inspector = relationship("User", foreign_keys=[inspector_id], back_populates="field_audits")
    employer = relationship("User", foreign_keys=[employer_id])
    last_scan = relationship("Scan", foreign_keys=[last_scan_id])


class PreMarketApplication(Base):
    """Pre-market packaging artwork compliance clearance application from a Manufacturer / Brand Owner."""
    __tablename__ = "pre_market_applications"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    product_name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    packaging_type = Column(String(100), default="Pouch / Box", nullable=False)
    declared_mrp = Column(Float, nullable=True)
    declared_net_quantity = Column(String(100), nullable=True)
    artwork_file_path = Column(String(500), nullable=False)
    status = Column(Enum(PreMarketStatus, values_callable=lambda x: [e.value for e in x]), default=PreMarketStatus.PENDING_INSPECTOR, nullable=False, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="SET NULL"), nullable=True)
    
    # Severity-Based Physical Field Visit Trigger fields
    triage_severity = Column(String(20), default="NONE", nullable=True)  # NONE, MINOR, MAJOR, CRITICAL
    visit_required = Column(Boolean, default=False, nullable=False)
    visit_recommended = Column(Boolean, default=False, nullable=False)
    visit_recommendation_justification = Column(Text, nullable=True)
    visit_trigger_reason = Column(String(255), nullable=True)
    visit_order_id = Column(String(50), nullable=True)  # e.g., VISIT-2026-8821 or VO-2026-008821
    visit_order_no = Column(String(50), nullable=True)  # e.g., VO-2026-008821
    visit_waived_by_clmo = Column(Boolean, default=False, nullable=False)
    clmo_waiver_justification = Column(Text, nullable=True)
    waiver_severity_checked = Column(Boolean, default=False, nullable=False)

    # Sub-Inspector & ALMO Verification state
    sub_inspector_verified = Column(Boolean, default=False, nullable=True)
    almo_approved = Column(Boolean, default=False, nullable=True)

    # Assigned Hierarchy Officers
    assigned_almo_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_clmo_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Field Inspector verification details
    inspector_notes = Column(Text, nullable=True)
    inspector_verified_at = Column(DateTime, nullable=True)

    # Supervisor / CLMO final signature & clearance details
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    certificate_number = Column(String(100), nullable=True)
    verification_method = Column(String(50), default="DIGITAL_OCR_ONLY", nullable=False)  # DIGITAL_OCR_ONLY, PHYSICAL_FIELD_INSPECTION_CONFIRMED
    supervisor_notes = Column(Text, nullable=True)
    supervisor_signed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    employer = relationship("User", foreign_keys=[employer_id], back_populates="pre_market_applications")
    assigned_inspector = relationship("User", foreign_keys=[assigned_inspector_id])
    assigned_almo = relationship("User", foreign_keys=[assigned_almo_id])
    assigned_clmo = relationship("User", foreign_keys=[assigned_clmo_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    scan = relationship("Scan", foreign_keys=[scan_id])
    visit_order = relationship("FieldVisitOrder", back_populates="application", uselist=False, lazy="selectin")


class FieldVisitOrder(Base):
    """Mandatory physical on-site inspection order triggered for Major / Critical violations (Issued by ALMO)."""
    __tablename__ = "field_visit_orders"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(String(50), unique=True, index=True, nullable=False)  # UUID or VISIT-2026-8821
    visit_order_no = Column(String(50), unique=True, index=True, nullable=True)  # VO-{YYYY}-{NNNNNN}
    application_id = Column(Integer, ForeignKey("pre_market_applications.id", ondelete="CASCADE"), nullable=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Sanction Authority (ALMO Level 3)
    sanctioned_by_almo_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sanctioned_at = Column(DateTime, nullable=True)
    visit_sanctioned = Column(Boolean, default=True, nullable=False)

    # Hierarchy Assignment
    assigned_inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_sub_inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Trigger Logic & Guardrails
    triage_severity = Column(String(20), default="MAJOR", nullable=True)  # MAJOR, CRITICAL
    visit_trigger_reason = Column(String(255), nullable=False)
    triggered_by_inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_waived = Column(Boolean, default=False, nullable=False)
    waived_by_clmo_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    waiver_reason = Column(Text, nullable=True)
    
    # Scheduling & Location
    visit_status = Column(String(50), default="SCHEDULED", nullable=False)  # SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    scheduled_date = Column(DateTime, nullable=True)
    scheduled_time = Column(String(20), nullable=True)
    visit_location_name = Column(String(255), nullable=True)
    visit_location_type = Column(String(50), default="MANUFACTURING_PLANT", nullable=False)  # MANUFACTURING_PLANT, WAREHOUSE, RETAIL_POINT
    visit_address = Column(Text, nullable=True)
    premises_lat = Column(Float, nullable=True)
    premises_lng = Column(Float, nullable=True)
    
    # On-Site Check-In & Geo-Fencing
    visit_started_at = Column(DateTime, nullable=True)
    visit_lat = Column(Float, nullable=True)
    visit_lng = Column(Float, nullable=True)
    gps_accuracy_meters = Column(Float, nullable=True)
    gps_confidence = Column(String(20), default="HIGH", nullable=True)  # HIGH, LOW, UNVERIFIED

    # On-Site Evidence (Immutable after report submission)
    factory_floor_photos = Column(JSON, default=list)  # List of photo objects with client hashes
    caliper_font_measurement_mm = Column(Float, nullable=True)
    caliper_attested_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    caliper_attested_at = Column(DateTime, nullable=True)
    physical_net_weight_grams = Column(Float, nullable=True)
    batch_records_cross_checked = Column(Boolean, default=False, nullable=False)
    physical_tampering_confirmed = Column(Boolean, default=False, nullable=False)
    on_site_inspector_remarks = Column(Text, nullable=True)
    
    # Cryptographic Attestation Signature
    inspection_signature = Column(String(64), nullable=True)  # SHA-256 hash of visit record

    # Outcome & Recommendation
    visit_report_submitted = Column(Boolean, default=False, nullable=False)
    visit_recommendation = Column(String(50), nullable=True)  # APPROVE_WITH_CONDITIONS, REJECT_SANCTION, SEEK_CLARIFICATION
    visit_submitted_at = Column(DateTime, nullable=True)

    # ALMO Report Verification & Loop Protection
    sub_inspector_verified = Column(Boolean, default=False, nullable=True)
    almo_report_approved = Column(Boolean, default=False, nullable=False)
    almo_review_remarks = Column(Text, nullable=True)
    almo_reviewed_at = Column(DateTime, nullable=True)
    visit_report_rejected_count = Column(Integer, default=0, nullable=False)
    last_visit_report_rejected_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    application = relationship("PreMarketApplication", foreign_keys=[application_id], back_populates="visit_order")
    sanctioned_by_almo = relationship("User", foreign_keys=[sanctioned_by_almo_id])
    inspector = relationship("User", foreign_keys=[assigned_inspector_id])
    sub_inspector = relationship("User", foreign_keys=[assigned_sub_inspector_id])
    caliper_attester = relationship("User", foreign_keys=[caliper_attested_by])
    clmo_waiver = relationship("User", foreign_keys=[waived_by_clmo_id])


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("work_assignments.id", ondelete="SET NULL"), nullable=True, index=True)
    product_name = Column(String(500), nullable=True)
    brand = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)
    image_url = Column(String(1000), nullable=False)
    status = Column(Enum(ScanStatus), default=ScanStatus.PROCESSING, nullable=False, index=True)
    compliance_score = Column(Float, nullable=True)
    raw_ocr_text = Column(Text, nullable=True)
    calibration_method = Column(String(50), nullable=True)  # "relative" | "calibrated" | "manual"

    # Feature 1: GPS Location & Cryptographic Chain of Custody
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    gps_accuracy_meters = Column(Float, nullable=True)
    location_name = Column(String(255), nullable=True)
    client_evidence_hash = Column(String(64), nullable=True)  # SHA-256 computed on client before upload
    inspection_signature = Column(String(64), nullable=True)  # SHA-256(client_hash + GPS + time + user)

    # Feature 2: Dual-Source Barcode / GTIN & Multi-Price Status
    barcode_data = Column(JSON, nullable=True)  # {"gtin": str, "format": str, "raw": str}
    barcode_cross_check_status = Column(String(50), nullable=True)  # "MATCHED", "MISMATCH_TAMPERED", "NOT_DETECTED"

    # Feature 4 & Governance: Two-Tier Regulatory Sanction Gate
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.AUTO_APPROVED, nullable=False, index=True)
    super_admin_reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    super_admin_review_notes = Column(Text, nullable=True)
    sanctioned_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="scans")
    assignment = relationship("WorkAssignment", back_populates="scans")
    assignment_credit = relationship("AssignmentCredit", back_populates="scan", uselist=False)
    extracted_fields = relationship("ExtractedField", back_populates="scan", lazy="selectin", cascade="all, delete-orphan")
    violations = relationship("Violation", back_populates="scan", lazy="selectin", cascade="all, delete-orphan")
    evidence_files = relationship("EvidenceFile", back_populates="scan", lazy="selectin", cascade="all, delete-orphan")
    field_revisions = relationship("FieldRevision", back_populates="scan", lazy="selectin", cascade="all, delete-orphan")


class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    file_type = Column(String(50), nullable=False)
    storage_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False)
    mime_type = Column(String(100), default="image/jpeg", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    scan = relationship("Scan", back_populates="evidence_files")


class FieldRevision(Base):
    __tablename__ = "field_revisions"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False, index=True)
    revision_number = Column(Integer, default=1, nullable=False)
    source = Column(String(50), nullable=False)
    raw_text = Column(Text, nullable=True)
    normalized_value = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    bounding_box = Column(JSON, nullable=True)
    corrected_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    scan = relationship("Scan", back_populates="field_revisions")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    field_value = Column(Text, nullable=True)
    normalized_value = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    bounding_box = Column(JSON, nullable=True)
    font_size_mm = Column(Float, nullable=True)
    font_status = Column(String(50), nullable=True)
    measurement_method = Column(String(50), nullable=True)
    is_manually_corrected = Column(Boolean, default=False, nullable=False)

    # Relationships
    scan = relationship("Scan", back_populates="extracted_fields")


class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_code = Column(String(100), nullable=False)
    field_id = Column(String(100), nullable=True)
    severity = Column(Enum(ViolationSeverity), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)

    # Relationships
    scan = relationship("Scan", back_populates="violations")


class RuleDefinition(Base):
    __tablename__ = "rule_definitions"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(50), unique=True, nullable=False, index=True)
    statutory_title = Column(String(255), nullable=False)
    category = Column(String(100), default="all", nullable=False)
    legal_text = Column(Text, nullable=False)
    standard_specification = Column(Text, nullable=False)
    severity = Column(Enum(ViolationSeverity), default=ViolationSeverity.MAJOR, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    details = Column(JSON, nullable=True)
    prev_event_hash = Column(String(64), nullable=True)
    event_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)


class SubmissionVersion(Base):
    __tablename__ = "submission_versions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("pre_market_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    artwork_url = Column(Text, nullable=True)
    declared_mrp = Column(Float, nullable=True)
    declared_net_quantity = Column(String(100), nullable=True)
    submission_data_json = Column(JSON, nullable=True)
    change_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class FieldVisitMember(Base):
    __tablename__ = "field_visit_members"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("field_visit_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_in_visit = Column(String(50), default="SUB_INSPECTOR", nullable=False)  # LEAD_INSPECTOR, SUB_INSPECTOR, OBSERVER
    attendance_status = Column(String(50), default="ASSIGNED", nullable=False)  # ASSIGNED, PRESENT, ABSENT
    signed_at = Column(DateTime, nullable=True)
    signature_hash = Column(String(64), nullable=True)
    observations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class ResolutionCase(Base):
    __tablename__ = "resolution_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(100), unique=True, nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("pre_market_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="OPEN", nullable=False)  # OPEN, RESPONSE_RECEIVED, OVERDUE_ESCALATED, RESOLVED
    memo_text = Column(Text, nullable=False)
    deficiencies_json = Column(JSON, nullable=True)
    sla_deadline_days = Column(Integer, default=15, nullable=False)
    dispatched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    sla_deadline = Column(DateTime, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    manufacturer_response_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class CertificateEvent(Base):
    __tablename__ = "certificate_events"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("pre_market_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    certificate_number = Column(String(100), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # ISSUED, REVOKED, SUSPENDED, RENEWED
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    audit_metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class OfficerWarrant(Base):
    __tablename__ = "officer_warrants"

    id = Column(Integer, primary_key=True, index=True)
    warrant_number = Column(String(100), unique=True, nullable=False, index=True)
    issuer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    issuer_role = Column(String(50), nullable=False)  # state_commissioner, director, clmo, clmo_supervisor
    target_officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_officer_name = Column(String(255), nullable=False)
    target_officer_role = Column(String(50), nullable=False)  # clmo, almo
    warrant_type = Column(String(50), nullable=False)  # SHOW_CAUSE_WARRANT, STATUTORY_INQUIRY, SUSPENSION_ORDER, AUDIT_SUBPOENA, JURISDICTION_SEIZURE
    charges_summary = Column(String(500), nullable=False)
    statutory_grounds = Column(Text, nullable=False)
    action_mandated = Column(Text, nullable=True)
    hearing_deadline_days = Column(Integer, default=7, nullable=False)
    hearing_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE_SERVED", nullable=False)  # ACTIVE_SERVED, UNDER_HEARING, RESOLVED_REVOKED, DISCIPLINARY_ENFORCED
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


