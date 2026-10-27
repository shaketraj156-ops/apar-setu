import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.errors import ConflictError, NotFoundError
from app.db.models import UploadBatch, StudentRecord, ValidationFinding, Programme
from app.services.validation.context import ValidationContext
from app.services.validation.engine import validate_batch

def revalidate_batch_service(db: Session, batch_id: uuid.UUID) -> UploadBatch:
    batch = db.get(UploadBatch, batch_id)
    if not batch: raise NotFoundError("Batch not found")
    if batch.status == "submitted": raise ConflictError("Cannot revalidate an already submitted batch")

    students = db.scalars(select(StudentRecord).where(StudentRecord.batch_id == batch_id)).all()
    if not students: raise NotFoundError("No student records found in batch")

    prog = db.get(Programme, students[0].programme_id)
    existing_rolls = set(db.scalars(
        select(StudentRecord.student_institution_id).where(
            StudentRecord.institution_id == batch.institution_id,
            StudentRecord.programme_id == prog.id,
            StudentRecord.academic_year == prog.academic_year,
            StudentRecord.batch_id != batch_id
        )
    ).all())
    existing_apaars = set(filter(None, db.scalars(
        select(StudentRecord.apaar_id).where(
            StudentRecord.enrollment_status != "withdrawn",
            StudentRecord.batch_id != batch_id
        )
    ).all()))

    ctx = ValidationContext(
        institution_id=batch.institution_id,
        programme_id=prog.id,
        academic_year=prog.academic_year,
        approved_intake=prog.approved_intake,
        supernumerary_quota=prog.supernumerary_quota,
        nri_quota=prog.nri_quota,
        oci_quota=prog.oci_quota,
        fn_quota=prog.fn_quota,
        enrolled_count=len(existing_rolls),
        existing_roll_numbers=existing_rolls,
        existing_apaar_ids=existing_apaars
    )

    rows = [{
        "student_institution_id": s.student_institution_id,
        "full_name": s.full_name,
        "dob": s.dob,
        "admission_date": s.admission_date,
        "apaar_id": s.apaar_id,
        "category": s.category,
        "is_supernumerary": s.is_supernumerary,
        "is_nri": s.is_nri,
        "is_oci": s.is_oci,
        "is_foreign_national": s.is_foreign_national
    } for s in students]

    result = validate_batch(rows, ctx)
    db.query(ValidationFinding).filter(ValidationFinding.batch_id == batch_id).delete()

    batch.total_rows = result.total_rows
    batch.valid_rows = result.valid_rows
    batch.error_rows = result.error_rows
    batch.warning_rows = result.warning_rows
    batch.status = "has_errors" if result.error_rows > 0 else "validated"

    for f in result.findings:
        rec_id = None
        if f.row_number and f.row_number <= len(students):
            rec_id = students[f.row_number - 1].id
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
    return batch
