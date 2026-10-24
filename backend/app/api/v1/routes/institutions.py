import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db, check_institution_access
from app.core.config import get_settings
from app.core.errors import NotFoundError
from app.db.models import Institution, StudentRecord, UploadBatch, Programme
from app.schemas.common import PaginatedResponse
from app.schemas.institution import InstitutionRead

router = APIRouter()
settings = get_settings()

@router.get("/", response_model=PaginatedResponse[InstitutionRead])
def list_institutions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = select(Institution)
    if user.role in ["institution_admin", "institution_staff"]:
        if not user.institution_id:
            return PaginatedResponse(total=0, page=page, page_size=page_size, items=[])
        query = query.where(Institution.id == user.institution_id)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        items=[InstitutionRead.model_validate(item) for item in items]
    )

@router.get("/me/stats")
def get_institution_stats(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = user.institution_id
    if not inst_id:
        return {"error": "User does not belong to any institution"}

    total_programmes = db.scalar(select(func.count(Programme.id)).where(Programme.institution_id == inst_id)) or 0
    approved_intake = db.scalar(select(func.sum(Programme.approved_intake)).where(Programme.institution_id == inst_id)) or 0
    total_students = db.scalar(select(func.count(StudentRecord.id)).where(StudentRecord.institution_id == inst_id)) or 0
    submitted_students = db.scalar(select(func.count(StudentRecord.id)).where(StudentRecord.institution_id == inst_id, StudentRecord.record_status == "submitted")) or 0
    total_batches = db.scalar(select(func.count(UploadBatch.id)).where(UploadBatch.institution_id == inst_id)) or 0
    clean_batches = db.scalar(select(func.count(UploadBatch.id)).where(UploadBatch.institution_id == inst_id, UploadBatch.status == "submitted")) or 0

    return {
        "institution_id": str(inst_id),
        "total_programmes": total_programmes,
        "total_approved_intake": approved_intake,
        "enrolled_students": total_students,
        "submitted_students": submitted_students,
        "intake_utilization_pct": round((total_students / approved_intake * 100), 2) if approved_intake else 0.0,
        "total_batches": total_batches,
        "submitted_clean_batches": clean_batches
    }

@router.get("/{id}", response_model=InstitutionRead)
def get_institution(id: uuid.UUID, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    check_institution_access(user, id)
    inst = db.get(Institution, id)
    if not inst: raise NotFoundError(f"Institution {id} not found")
    return InstitutionRead.model_validate(inst)
