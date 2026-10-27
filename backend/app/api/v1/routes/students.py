"""
Students API route - APAARSetu
=================================
Provides endpoints for:
  - Listing student records (with institution_id filter for AICTE officers, limit/page_size alias for frontend)
  - Fetching a single student record
  - Creating a student record (institution admin)
  - PATCH endpoint for row-level inline correction (T3 fix)
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_optional_user, get_db, require_role, check_institution_access
from app.core.errors import NotFoundError, ForbiddenError, ConflictError
from app.core.masking import mask_apaar_id, hash_apaar_id
from app.db.models import StudentRecord, Institution, Programme
from app.schemas.common import PaginatedResponse
from app.schemas.student import StudentRecordCreate, StudentRecordRead
from app.services.audit import log_action

router = APIRouter()


class StudentPatch(BaseModel):
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


@router.get("/", response_model=PaginatedResponse[StudentRecordRead])
def list_students(
    institution_id: Optional[uuid.UUID] = None,
    programme_id: Optional[uuid.UUID] = None,
    academic_year: Optional[str] = None,
    record_status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    limit: Optional[int] = Query(None, ge=1, le=500, description="Alias for page_size"),
    user: CurrentUser | None = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    effective_page_size = limit if limit is not None else page_size
    query = select(StudentRecord)

    # Multi-tenant isolation: Institution users only see their own students
    if user and user.role in ["institution_admin", "institution_staff"]:
        if not user.institution_id:
            return PaginatedResponse(total=0, page=page, page_size=effective_page_size, items=[])
        query = query.where(StudentRecord.institution_id == user.institution_id)
    elif institution_id:
        query = query.where(StudentRecord.institution_id == institution_id)

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
        data.apaar_id_masked = mask_apaar_id(r.apaar_id)
        items.append(data)

    return PaginatedResponse(total=total, page=page, page_size=effective_page_size, items=items)


@router.get("/{id}", response_model=StudentRecordRead)
def get_student(
    id: uuid.UUID,
    user: CurrentUser | None = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    student = db.get(StudentRecord, id)
    if not student:
        raise NotFoundError(f"Student record {id} not found")

    if user:
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
    student = db.get(StudentRecord, id)
    if not student:
        raise NotFoundError(f"Student record {id} not found")

    check_institution_access(user, student.institution_id)

    if student.record_status == "submitted":
        raise ConflictError("Cannot modify a submitted and locked student record. Submitted records are immutable.")

    old_values = {k: getattr(student, k, None) for k in payload.model_dump(exclude_unset=True).keys()}

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, field, value)

    if payload.apaar_id is not None:
        student.apaar_id_hash = hash_apaar_id(payload.apaar_id) if payload.apaar_id else None

    db.commit()
    db.refresh(student)

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
    target_inst = user.institution_id if user.role == "institution_admin" else (payload.institution_id or user.institution_id)
    if not target_inst:
        raise ForbiddenError("Institution ID is required")

    prog = db.get(Programme, payload.programme_id)
    if not prog or prog.institution_id != target_inst:
        raise NotFoundError(f"Programme {payload.programme_id} not found for this institution")

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
        is_nri=payload.is_nri,
        is_oci=payload.is_oci,
        is_foreign_national=payload.is_foreign_national,
        is_supernumerary=payload.is_supernumerary,
        enrollment_status=payload.enrollment_status,
        record_status=payload.record_status
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    log_action(
        db=db,
        actor_id=user.id,
        actor_email=user.email,
        action="CREATE_STUDENT_RECORD",
        entity_type="student_record",
        entity_id=str(student.id),
        new_value=payload.model_dump(),
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    data = StudentRecordRead.model_validate(student)
    data.apaar_id_masked = mask_apaar_id(student.apaar_id)
    return data
