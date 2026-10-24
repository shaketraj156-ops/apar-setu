"""Students API placeholder."""
# File: backend/app/api/v1/routes/students.py
import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db, require_role, check_institution_access
from app.core.errors import NotFoundError, ForbiddenError
from app.core.masking import mask_apaar_id, hash_apaar_id
from app.db.models import StudentRecord, Institution, Programme
from app.schemas.common import PaginatedResponse
from app.schemas.student import StudentRecordCreate, StudentRecordRead
from app.services.audit import log_action

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[StudentRecordRead])
def list_students(
    programme_id: uuid.UUID | None = None,
    academic_year: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = select(StudentRecord)

    # Multi-tenant isolation: Institution users only see their own students
    if user.role in ["institution_admin", "institution_staff"]:
        query = query.where(StudentRecord.institution_id == user.institution_id)

    if programme_id:
        query = query.where(StudentRecord.programme_id == programme_id)
    if academic_year:
        query = query.where(StudentRecord.academic_year == academic_year)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    records = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()

    items = []
    for r in records:
        data = StudentRecordRead.model_validate(r)
        # Always mask APAAR ID in list responses
        data.apaar_id_masked = mask_apaar_id(r.apaar_id)
        items.append(data)

    return PaginatedResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/{id}", response_model=StudentRecordRead)
def get_student(
    id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.get(StudentRecord, id)
    if not student:
        raise NotFoundError(f"Student record {id} not found")

    check_institution_access(user, student.institution_id)

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

    # Immutable Audit Log
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
