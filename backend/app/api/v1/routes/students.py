"""
Students API route — SNAP
=================================
Provides endpoints for:
  - Listing student records (with institution_id filter for AICTE officers, limit/page_size alias for frontend)
  - Fetching a single student record
  - Creating a student record (institution admin)
  - PATCH endpoint for row-level inline correction (T3 fix)

Changes vs original:
  - T1: Added `institution_id` query param for AICTE/admin roles (previously JWT-only)
  - T2: Added `limit` alias for `page_size` so frontend `?limit=25` works correctly
  - T3: Added PATCH `/students/{id}` handler for row-level correction from InstitutionPortal
"""

# File: backend/app/api/v1/routes/students.py
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db, require_role, check_institution_access
from app.core.errors import NotFoundError, ForbiddenError, ConflictError
from app.core.masking import mask_apaar_id, hash_apaar_id
from app.db.models import StudentRecord, Institution, Programme
from app.schemas.common import PaginatedResponse
from app.schemas.student import StudentRecordCreate, StudentRecordRead
from app.services.audit import log_action

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic model for inline row-level corrections (T3)
# Accepts any subset of editable fields; submitted records are locked.
# ---------------------------------------------------------------------------
class StudentPatch(BaseModel):
    """
    Payload for PATCH /students/{id}.
    All fields are optional — only provided fields are updated.
    APAAR ID corrections trigger re-hash at DB level.
    """
    apaar_id: Optional[str] = None
    student_institution_id: Optional[str] = None
    full_name: Optional[str] = None
    dob: Optional[str] = None
    admission_date: Optional[str] = None
    category: Optional[str] = None
    is_nri: Optional[bool] = None
    is_oci: Optional[bool] = None
    is_foreign_national: Optional[bool] = None
    is_supernumerary: Optional[bool] = None


@router.get("", response_model=PaginatedResponse[StudentRecordRead])
@router.get("/", response_model=PaginatedResponse[StudentRecordRead])
def list_students(
    # T1: institution_id filter — AICTE officers can filter by specific institution
    institution_id: Optional[uuid.UUID] = None,
    programme_id: Optional[uuid.UUID] = None,
    academic_year: Optional[str] = None,
    record_status: Optional[str] = None,
    # T2: Accept both `page_size` (canonical) and `limit` (frontend alias)
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Alias for page_size (frontend compatibility)"),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List student records with multi-tenant isolation.

    - Institution staff/admin: only see their own institution's records (JWT enforced)
    - AICTE/system_admin: can optionally filter by institution_id
    - Accepts `limit` as alias for `page_size` for frontend compatibility
    - Supports filtering by record_status (flagged, validated, submitted, all)
    """
    # T2: Resolve limit alias → page_size
    effective_page_size = limit if limit is not None else page_size

    query = select(StudentRecord)

    # Multi-tenant isolation: Institution users only see their own students
    if user.role in ["institution_admin", "institution_staff"]:
        # JWT-enforced: institution users are hard-locked to their institution
        query = query.where(StudentRecord.institution_id == user.institution_id)
    elif user.role == "student":
        # Students only ever see their own record (matched via the APAAR hash on their profile)
        if not user.apaar_id_hash:
            return PaginatedResponse(total=0, page=page, page_size=effective_page_size, items=[], students=[])
        query = query.where(StudentRecord.apaar_id_hash == user.apaar_id_hash)
    elif institution_id:
        # T1: AICTE/auditor roles can optionally filter to a specific institution
        query = query.where(StudentRecord.institution_id == institution_id)

    # Optional filters
    if programme_id:
        query = query.where(StudentRecord.programme_id == programme_id)
    if academic_year:
        query = query.where(StudentRecord.academic_year == academic_year)
    if record_status and record_status != "all":
        query = query.where(StudentRecord.record_status == record_status)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    records = db.scalars(query.offset((page - 1) * effective_page_size).limit(effective_page_size)).all()

    items = []
    for r in records:
        data = StudentRecordRead.model_validate(r)
        # Always mask APAAR ID in list responses — DPDP compliance
        data.apaar_id_masked = mask_apaar_id(r.apaar_id)
        items.append(data)

    return PaginatedResponse(total=total, page=page, page_size=effective_page_size, items=items, students=items)


@router.get("/{id}", response_model=StudentRecordRead)
def get_student(
    id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch a single student record by ID.
    Enforces institution access — institution staff cannot view students from other institutions.
    """
    student = db.get(StudentRecord, id)
    if not student:
        raise NotFoundError(f"Student record {id} not found")

    if user.role == "student":
        if not user.apaar_id_hash or student.apaar_id_hash != user.apaar_id_hash:
            raise ForbiddenError("Students can only view their own record", code="FORBIDDEN")
    else:
        check_institution_access(user, student.institution_id)

    data = StudentRecordRead.model_validate(student)
    data.apaar_id_masked = mask_apaar_id(student.apaar_id)
    return data


@router.patch("/{id}")
def patch_student(
    id: uuid.UUID,
    payload: StudentPatch,
    request: Request,
    user: CurrentUser = Depends(require_role(["institution_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    """
    T3: Row-level inline correction for InstitutionPortal.

    Allows institution admins to correct individual student fields without
    re-uploading the entire CSV batch. Only non-submitted records can be edited.

    If `apaar_id` is changed, the SHA-256 hash is recomputed for consistent DB lookups.
    Triggers an audit log entry for compliance.

    Returns the updated student record with masked APAAR ID.
    """
    student = db.get(StudentRecord, id)
    if not student:
        raise NotFoundError(f"Student record {id} not found")

    # Multi-tenant isolation: institution admins cannot edit other institutions' records
    check_institution_access(user, student.institution_id)

    # Submitted records are immutable — enforce lock
    if student.record_status == "submitted":
        raise ConflictError("Cannot modify a submitted and locked student record. Submitted records are immutable.")

    # Capture old values for audit trail
    old_values = {k: getattr(student, k, None) for k in payload.model_dump(exclude_unset=True).keys()}

    # Apply the patch — only update provided fields
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in ("dob", "admission_date") and isinstance(value, str):
            val_str = value.strip()
            if val_str:
                try:
                    from datetime import datetime as dt
                    value = dt.strptime(val_str, "%Y-%m-%d").date()
                except Exception:
                    pass
            else:
                value = None
        setattr(student, field, value)

    # If APAAR ID was corrected, recompute the SHA-256 hash for DB lookup consistency
    if payload.apaar_id is not None:
        student.apaar_id_hash = hash_apaar_id(payload.apaar_id) if payload.apaar_id else None

    db.commit()
    db.refresh(student)

    # Audit log for compliance — every correction must be traceable
    log_action(
        db=db,
        actor_id=user.id,
        actor_email=user.email,
        action="PATCH_STUDENT_RECORD",
        entity_type="student_record",
        entity_id=str(student.id),
        old_value=old_values,
        new_value=payload.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    # Return updated record with masked APAAR ID
    data = StudentRecordRead.model_validate(student)
    data.apaar_id_masked = mask_apaar_id(student.apaar_id)
    return data


@router.post("/", response_model=StudentRecordRead, status_code=201)
def create_student(
    payload: StudentRecordCreate,
    request: Request,
    user: CurrentUser = Depends(require_role(["institution_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    """
    Create a single student record (not batch upload).
    Used for manual one-off additions. Institution admin is locked to their institution.
    """
    target_inst = user.institution_id if user.role == "institution_admin" else (payload.institution_id or user.institution_id)
    if not target_inst:
        raise ForbiddenError("Institution ID is required")

    inst = db.get(Institution, target_inst)
    if not inst:
        raise NotFoundError("Target institution does not exist")

    prog = db.get(Programme, payload.programme_id)
    if not prog or prog.institution_id != target_inst:
        raise NotFoundError("Programme does not exist for this institution")

    student = StudentRecord(
        institution_id=target_inst,
        programme_id=payload.programme_id,
        academic_year=payload.academic_year,
        student_institution_id=payload.student_institution_id,
        full_name=payload.full_name,
        gender=payload.gender,
        dob=payload.dob,
        admission_date=payload.admission_date,
        apaar_id=payload.apaar_id,
        apaar_id_hash=hash_apaar_id(payload.apaar_id),
        category=payload.category,
        is_supernumerary=payload.is_supernumerary,
        is_nri=payload.is_nri,
        is_oci=payload.is_oci,
        is_foreign_national=payload.is_foreign_national,
        record_status="draft"
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Immutable Audit Log — append-only, trigger-protected at DB level
    log_action(
        db=db,
        actor_id=user.id,
        actor_email=user.email,
        action="CREATE_STUDENT_RECORD",
        entity_type="student_record",
        entity_id=str(student.id),
        new_value={"full_name": student.full_name, "roll_no": student.student_institution_id},
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    data = StudentRecordRead.model_validate(student)
    data.apaar_id_masked = mask_apaar_id(student.apaar_id)
    return data
