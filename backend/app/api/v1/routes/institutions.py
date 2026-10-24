"""Institutions API placeholder."""
# File: backend/app/api/v1/routes/institutions.py
import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db, require_role, check_institution_access
from app.core.config import get_settings
from app.core.errors import NotFoundError, ForbiddenError
from app.db.models import Institution
from app.schemas.common import PaginatedResponse
from app.schemas.institution import InstitutionRead, IntakeUpdate
from app.services.audit import log_action

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
    
    # Institution admin only sees their own institution
    if user.role in ["institution_admin", "institution_staff"]:
        if not user.institution_id:
            return PaginatedResponse(total=0, page=page, page_size=page_size, items=[])
        query = query.where(Institution.id == user.institution_id)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[InstitutionRead.model_validate(item) for item in items]
    )


@router.get("/{id}", response_model=InstitutionRead)
def get_institution(
    id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_institution_access(user, id)
    inst = db.get(Institution, id)
    if not inst:
        raise NotFoundError(f"Institution {id} not found")
    return InstitutionRead.model_validate(inst)
