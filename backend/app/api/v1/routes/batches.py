import uuid
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db, require_role, check_institution_access
from app.core.errors import ConflictError, NotFoundError
from app.db.models import UploadBatch, StudentRecord, ValidationFinding
from app.schemas.batch import UploadBatchRead, FindingRead
from app.schemas.common import PaginatedResponse
from app.services.audit import log_action
from app.services.batch_service import revalidate_batch_service

router = APIRouter()

class StudentPatch(BaseModel):
    full_name: str | None = None
    dob: str | None = None
    admission_date: str | None = None
    apaar_id: str | None = None
    category: str | None = None
    is_supernumerary: bool | None = None
    is_nri: bool | None = None

@router.get("", response_model=PaginatedResponse[UploadBatchRead])
@router.get("/", response_model=PaginatedResponse[UploadBatchRead])
def list_batches(
    institution_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = select(UploadBatch).order_by(UploadBatch.created_at.desc())
    if user.role in ["institution_admin", "institution_staff"]:
        query = query.where(UploadBatch.institution_id == user.institution_id)
    elif institution_id:
        query = query.where(UploadBatch.institution_id == institution_id)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        items=[UploadBatchRead.model_validate(b) for b in items]
    )

from app.api.v1.routes.uploads import upload_csv
router.post("/upload", response_model=UploadBatchRead, status_code=201)(upload_csv)

@router.get("/{id}", response_model=UploadBatchRead)
def get_batch(id: uuid.UUID, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    batch = db.get(UploadBatch, id)
    if not batch: raise NotFoundError("Batch not found")
    check_institution_access(user, batch.institution_id)
    findings = db.scalars(select(ValidationFinding).where(ValidationFinding.batch_id == id)).all()
    batch_read = UploadBatchRead.model_validate(batch)
    batch_read.findings = [FindingRead.model_validate(f) for f in findings]
    return batch_read

@router.get("/{id}/findings", response_model=PaginatedResponse[FindingRead])
def get_batch_findings(
    id: uuid.UUID,
    severity: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    batch = db.get(UploadBatch, id)
    if not batch: raise NotFoundError("Batch not found")
    check_institution_access(user, batch.institution_id)

    query = select(ValidationFinding).where(ValidationFinding.batch_id == id)
    if severity: query = query.where(ValidationFinding.severity == severity.lower())
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    findings = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        items=[FindingRead.model_validate(f) for f in findings]
    )

@router.patch("/records/{id}")
def correct_record(
    id: uuid.UUID,
    payload: StudentPatch,
    user: CurrentUser = Depends(require_role(["institution_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    student = db.get(StudentRecord, id)
    if not student: raise NotFoundError("Student record not found")
    check_institution_access(user, student.institution_id)
    if student.record_status == "submitted":
        raise ConflictError("Cannot modify a submitted and locked student record")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return {"status": "ok", "message": "Record updated. Please revalidate batch."}

@router.post("/{id}/revalidate", response_model=UploadBatchRead)
def revalidate_batch_endpoint(
    id: uuid.UUID,
    user: CurrentUser = Depends(require_role(["institution_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    batch = db.get(UploadBatch, id)
    if not batch: raise NotFoundError("Batch not found")
    check_institution_access(user, batch.institution_id)
    updated = revalidate_batch_service(db, id)
    findings = db.scalars(select(ValidationFinding).where(ValidationFinding.batch_id == id)).all()
    batch_read = UploadBatchRead.model_validate(updated)
    batch_read.findings = [FindingRead.model_validate(f) for f in findings]
    return batch_read

@router.post("/{id}/submit")
def submit_batch(
    id: uuid.UUID,
    request: Request,
    user: CurrentUser = Depends(require_role(["institution_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    batch = db.get(UploadBatch, id)
    if not batch: raise NotFoundError("Batch not found")
    check_institution_access(user, batch.institution_id)
    if batch.status == "submitted": raise ConflictError("Batch is already submitted")
    if batch.error_rows > 0:
        raise ConflictError(f"Cannot submit batch with {batch.error_rows} active validation errors. Please correct them first.")

    batch.status = "submitted"
    db.query(StudentRecord).filter(StudentRecord.batch_id == id).update({"record_status": "submitted"})
    db.commit()

    log_action(
        db=db, actor_id=user.id, actor_email=user.email,
        action="SUBMIT_CLEAN_BATCH", entity_type="upload_batch",
        entity_id=str(id), new_value={"total_records": batch.total_rows, "status": "submitted"},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    return {"status": "ok", "message": "Batch successfully submitted and locked."}
