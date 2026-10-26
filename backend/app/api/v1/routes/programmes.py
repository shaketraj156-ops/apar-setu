"""Programmes API placeholder."""
# File: backend/app/api/v1/routes/programmes.py
import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db, require_role, check_institution_access
from app.core.errors import NotFoundError, ForbiddenError
from app.db.models import Programme, Institution
from app.schemas.common import PaginatedResponse
from app.schemas.programme import ProgrammeCreate, ProgrammeRead
from app.services.audit import log_action

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ProgrammeRead])
@router.get("/", response_model=PaginatedResponse[ProgrammeRead])
def list_programmes(
    institution_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = select(Programme)

    if user.role in ["institution_admin", "institution_staff"]:
        query = query.where(Programme.institution_id == user.institution_id)
    elif institution_id:
        query = query.where(Programme.institution_id == institution_id)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[ProgrammeRead.model_validate(item) for item in items]
    )


@router.post("/", response_model=ProgrammeRead, status_code=201)
def create_programme(
    payload: ProgrammeCreate,
    request: Request,
    user: CurrentUser = Depends(require_role(["institution_admin", "aicte_officer", "system_admin"])),
    db: Session = Depends(get_db)
):
    target_inst = user.institution_id if user.role == "institution_admin" else (payload.institution_id or user.institution_id)
    if not target_inst:
        raise ForbiddenError("Institution ID is required")

    inst = db.get(Institution, target_inst)
    if not inst:
        raise NotFoundError("Target institution does not exist")

    prog = Programme(
        institution_id=target_inst,
        name=payload.name,
        academic_year=payload.academic_year,
        approved_intake=payload.approved_intake,
        supernumerary_quota=payload.supernumerary_quota,
        nri_quota=payload.nri_quota,
        oci_quota=payload.oci_quota,
        fn_quota=payload.fn_quota,
        session_start=payload.session_start,
        session_end=payload.session_end
    )
    db.add(prog)
    db.commit()
    db.refresh(prog)

    # Audit log
    log_action(
        db=db,
        actor_id=user.id,
        actor_email=user.email,
        action="CREATE_PROGRAMME",
        entity_type="programme",
        entity_id=str(prog.id),
        new_value=payload.model_dump(mode="json"),
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    return ProgrammeRead.model_validate(prog)
