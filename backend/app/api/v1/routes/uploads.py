import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db, require_role
from app.core.errors import NotFoundError, UnprocessableError
from app.core.masking import hash_apaar_id
from app.db.models import Programme, UploadBatch, StudentRecord, ValidationFinding, Profile
from app.schemas.batch import UploadBatchRead, FindingRead
from app.services.csv_parser import parse_csv_stream
from app.services.registry import verify_apaar_with_registry
from app.services.validation.context import ValidationContext
from app.services.validation.engine import validate_batch

router = APIRouter()

@router.post("/csv", response_model=UploadBatchRead, status_code=201)
def upload_csv(
    file: UploadFile = File(...),
    programme_id: uuid.UUID | None = Form(None),
    academic_year: str | None = Form(None),
    institution_id: uuid.UUID | None = Form(None),
    user: CurrentUser = Depends(require_role(["institution_admin", "system_admin"])),
    db: Session = Depends(get_db)
):
    target_inst = user.institution_id or institution_id
    if not target_inst:
        raise UnprocessableError("Institution ID is required")
    
    if programme_id:
        prog = db.get(Programme, programme_id)
        if not prog or prog.institution_id != target_inst:
            raise NotFoundError("Programme not found for your institution")
    else:
        prog = db.scalars(select(Programme).where(Programme.institution_id == target_inst)).first()
        if not prog:
            raise NotFoundError("No programmes configured for your institution")
        programme_id = prog.id

    if not academic_year:
        academic_year = prog.academic_year or "2026-30"

    content = file.file.read()
    rows = parse_csv_stream(content)
    if not rows:
        raise UnprocessableError("No data rows found in uploaded CSV")

    existing_rolls = set(db.scalars(
        select(StudentRecord.student_institution_id).where(
            StudentRecord.institution_id == target_inst,
            StudentRecord.programme_id == programme_id,
            StudentRecord.academic_year == academic_year
        )
    ).all())
    existing_apaars = set(filter(None, db.scalars(
        select(StudentRecord.apaar_id).where(StudentRecord.enrollment_status != "withdrawn")
    ).all()))

    ctx = ValidationContext(
        institution_id=target_inst,
        programme_id=programme_id,
        academic_year=academic_year,
        approved_intake=prog.approved_intake,
        supernumerary_quota=prog.supernumerary_quota,
        nri_quota=prog.nri_quota,
        oci_quota=prog.oci_quota,
        fn_quota=prog.fn_quota,
        enrolled_count=len(existing_rolls),
        existing_roll_numbers=existing_rolls,
        existing_apaar_ids=existing_apaars
    )

    result = validate_batch(rows, ctx)
    batch_status = "has_errors" if result.error_rows > 0 else "validated"

    uploader_id = user.id if db.get(Profile, user.id) else None
    batch = UploadBatch(
        institution_id=target_inst,
        uploaded_by=uploader_id,
        file_name=file.filename or "upload.csv",
        total_rows=result.total_rows,
        valid_rows=result.valid_rows,
        error_rows=result.error_rows,
        warning_rows=result.warning_rows,
        status=batch_status
    )
    db.add(batch)
    db.flush()

    created_students = []
    for idx, r in enumerate(rows, start=1):
        apaar = r.get("apaar_id")
        reg_status = verify_apaar_with_registry(apaar) if apaar else None
        dob_val = None
        if r.get("dob"):
            try: dob_val = datetime.strptime(str(r["dob"]).strip(), "%Y-%m-%d").date()
            except Exception: pass
        adm_val = None
        if r.get("admission_date"):
            try: adm_val = datetime.strptime(str(r["admission_date"]).strip(), "%Y-%m-%d").date()
            except Exception: pass

        sid = r.get("student_institution_id") or f"ROW-{idx}"
        existing_student = db.scalars(
            select(StudentRecord).where(
                StudentRecord.institution_id == target_inst,
                StudentRecord.student_institution_id == sid,
                StudentRecord.academic_year == academic_year
            )
        ).first()

        if existing_student:
            student = existing_student
            student.programme_id = programme_id
            student.batch_id = batch.id
            student.full_name = r.get("full_name") or student.full_name
            student.gender = r.get("gender") or student.gender
            student.dob = dob_val or student.dob
            student.admission_date = adm_val or student.admission_date
            student.apaar_id = apaar
            student.category = r.get("category") or student.category
            student.is_supernumerary = bool(r.get("is_supernumerary"))
            student.is_nri = bool(r.get("is_nri"))
            student.is_oci = bool(r.get("is_oci"))
            student.is_foreign_national = bool(r.get("is_foreign_national"))
            student.record_status = "draft"
            student.registry_status = reg_status
            db.query(ValidationFinding).filter(ValidationFinding.record_id == student.id).delete()
        else:
            student = StudentRecord(
                institution_id=target_inst,
                programme_id=programme_id,
                batch_id=batch.id,
                academic_year=academic_year,
                student_institution_id=sid,
                full_name=r.get("full_name") or "UNKNOWN",
                gender=r.get("gender"),
                dob=dob_val,
                admission_date=adm_val,
                apaar_id=apaar,
                category=r.get("category") or "general",
                is_supernumerary=bool(r.get("is_supernumerary")),
                is_nri=bool(r.get("is_nri")),
                is_oci=bool(r.get("is_oci")),
                is_foreign_national=bool(r.get("is_foreign_national")),
                record_status="draft",
                registry_status=reg_status
            )
            db.add(student)
        created_students.append(student)

    db.flush()

    for f in result.findings:
        rec_id = None
        if f.row_number and f.row_number <= len(created_students):
            rec_id = created_students[f.row_number - 1].id
        finding = ValidationFinding(
            batch_id=batch.id,
            record_id=rec_id,
            row_number=f.row_number,
            rule_code=f.rule_code,
            severity=f.severity,
            message=f.message,
            evidence=f.evidence or {},
            recommended_action=f.recommended_action
        )
        db.add(finding)

    db.commit()
    db.refresh(batch)
    findings = db.scalars(select(ValidationFinding).where(ValidationFinding.batch_id == batch.id)).all()
    batch_read = UploadBatchRead.model_validate(batch)
    batch_read.findings = [FindingRead.model_validate(f) for f in findings]
    return batch_read
