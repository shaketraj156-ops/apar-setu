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

    progs = db.scalars(select(Programme).where(Programme.institution_id == inst_id)).all()
    total_programmes = len(progs)
    approved_intake = sum(p.approved_intake or 0 for p in progs)
    total_students = db.scalar(select(func.count(StudentRecord.id)).where(StudentRecord.institution_id == inst_id)) or 0
    submitted_students = db.scalar(select(func.count(StudentRecord.id)).where(StudentRecord.institution_id == inst_id, StudentRecord.record_status == "submitted")) or 0
    total_batches = db.scalar(select(func.count(UploadBatch.id)).where(UploadBatch.institution_id == inst_id)) or 0
    clean_batches = db.scalar(select(func.count(UploadBatch.id)).where(UploadBatch.institution_id == inst_id, UploadBatch.status == "submitted")) or 0

    programme_stats = []
    for p in progs:
        enrolled = db.scalar(select(func.count(StudentRecord.id)).where(StudentRecord.programme_id == p.id)) or 0
        util = round((enrolled / p.approved_intake * 100), 2) if p.approved_intake else 0.0
        programme_stats.append({
            "id": str(p.id),
            "name": p.name,
            "approved_intake": p.approved_intake,
            "supernumerary_quota": p.supernumerary_quota,
            "enrolled_count": enrolled,
            "utilization_pct": util
        })

    cat_counts = db.execute(
        select(StudentRecord.category, func.count(StudentRecord.id))
        .where(StudentRecord.institution_id == inst_id)
        .group_by(StudentRecord.category)
    ).all()
    category_breakdown = {cat or "general": count for cat, count in cat_counts}

    return {
        "institution_id": str(inst_id),
        "total_programmes": total_programmes,
        "total_approved_intake": approved_intake,
        "enrolled_students": total_students,
        "submitted_students": submitted_students,
        "intake_utilization_pct": round((total_students / approved_intake * 100), 2) if approved_intake else 0.0,
        "total_batches": total_batches,
        "submitted_clean_batches": clean_batches,
        "programme_intake_meter": programme_stats,
        "category_breakdown": category_breakdown
    }

@router.get("/{id}", response_model=InstitutionRead)
def get_institution(id: uuid.UUID, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    check_institution_access(user, id)
    inst = db.get(Institution, id)
    if not inst: raise NotFoundError(f"Institution {id} not found")
    return InstitutionRead.model_validate(inst)
