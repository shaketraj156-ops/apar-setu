import io
import re
import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.db.session import get_db
from app.db.models import Institution, Programme, UploadBatch, StudentRecord, ValidationFinding
from app.core.masking import hash_apaar_id
from app.services.registry_client import RegistryClient, RegistryStatus
from app.services.revalidation_service import revalidate_record, next_record_status
from app.core.config import settings

router = APIRouter(prefix="/batches", tags=["Upload Batches & Ingestion"])

_APAAR_RE = re.compile(r"^\d{12}$")

@router.get("")
def list_batches(institution_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(UploadBatch)
    if institution_id:
        try:
            inst_uuid = uuid.UUID(institution_id)
            query = query.filter(UploadBatch.institution_id == inst_uuid)
        except ValueError:
            return []
    batches = query.order_by(UploadBatch.created_at.desc()).all()
    results = []
    for b in batches:
        inst = db.get(Institution, b.institution_id)
        results.append({
            "id": str(b.id),
            "institution_id": str(b.institution_id),
            "file_name": b.file_name,
            "total_rows": b.total_rows,
            "valid_rows": b.valid_rows,
            "error_rows": b.error_rows,
            "warning_rows": b.warning_rows,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "institutions": {
                "name": inst.name if inst else "Unknown",
                "aicte_code": inst.aicte_code if inst else ""
            } if inst else None
        })
    return results

@router.get("/{batch_id}")
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    try:
        b_uuid = uuid.UUID(batch_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid batch ID format")

    batch = db.get(UploadBatch, b_uuid)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    inst = db.get(Institution, batch.institution_id)
    findings = db.query(ValidationFinding).filter(ValidationFinding.batch_id == b_uuid).all()

    findings_data = []
    for f in findings:
        st = db.get(StudentRecord, f.record_id) if f.record_id else None
        findings_data.append({
            "id": str(f.id),
            "batch_id": str(f.batch_id),
            "record_id": str(f.record_id) if f.record_id else None,
            "row_number": f.row_number,
            "rule_code": f.rule_code,
            "severity": f.severity,
            "message": f.message,
            "evidence": f.evidence,
            "recommended_action": f.recommended_action,
            "is_resolved": f.is_resolved,
            "student_records": {
                "full_name": st.full_name if st else "",
                "student_institution_id": st.student_institution_id if st else "",
                "apaar_id": st.apaar_id if st else ""
            } if st else None
        })

    return {
        "id": str(batch.id),
        "institution_id": str(batch.institution_id),
        "file_name": batch.file_name,
        "total_rows": batch.total_rows,
        "valid_rows": batch.valid_rows,
        "error_rows": batch.error_rows,
        "warning_rows": batch.warning_rows,
        "status": batch.status,
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "institutions": {"name": inst.name if inst else "Unknown"},
        "findings": findings_data
    }

@router.post("/upload")
async def upload_student_batch(
    file: UploadFile = File(...),
    institution_id: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        inst_uuid = uuid.UUID(institution_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid institution_id format")

    # 1. Verify institution exists
    inst = db.get(Institution, inst_uuid)
    if not inst:
        raise HTTPException(status_code=400, detail="Invalid institution_id: institution does not exist")

    # 2. Parse file content
    contents = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents), dtype=str)
        elif file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(contents), dtype=str)
        else:
            raise HTTPException(status_code=400, detail="Only CSV or Excel files supported")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    df = df.fillna("")
    total_rows = len(df)
    if total_rows == 0:
        raise HTTPException(status_code=400, detail="Uploaded file contains no rows")

    # 3. Create upload_batch record
    batch = UploadBatch(
        institution_id=inst_uuid,
        file_name=file.filename or "upload.csv",
        total_rows=total_rows,
        status="validating"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    batch_id = batch.id

    # 4. Fetch institution programmes
    programmes = db.query(Programme).filter(Programme.institution_id == inst_uuid).all()
    prog_by_name = {p.name.strip().lower(): p for p in programmes}

    registry = RegistryClient(base_url=settings.MOCK_APAAR_REGISTRY_URL)

    # 5. Track duplicates in current batch
    apaar_seen_in_batch = {}
    for idx, row in df.iterrows():
        a = str(row.get("apaar_id", "")).strip()
        if a and _APAAR_RE.match(a):
            apaar_seen_in_batch.setdefault(a, []).append(idx + 1)

    error_count = 0
    warning_count = 0
    student_records = []
    row_findings_map = []

    # 6. Validate each row
    for idx, row in df.iterrows():
        row_num = idx + 1
        name = str(row.get("student_name") or row.get("full_name") or "").strip()
        pname = str(row.get("programme") or "").strip().lower()
        ay = str(row.get("academic_year") or "2026-30").strip()
        apaar = str(row.get("apaar_id") or "").strip()
        sid = str(row.get("student_institution_id") or f"STU-{row_num:03d}").strip()
        gender = str(row.get("gender") or "").strip()
        dob = str(row.get("dob") or "").strip() or None
        adm_date = str(row.get("admission_date") or "").strip() or None
        cat = str(row.get("category") or "general").strip().lower()
        is_sup = str(row.get("is_supernumerary", "false")).lower() in ("true", "1", "yes")
        is_nri = str(row.get("is_nri", "false")).lower() in ("true", "1", "yes")
        is_oci = str(row.get("is_oci", "false")).lower() in ("true", "1", "yes")
        is_fn = str(row.get("is_foreign_national", "false")).lower() in ("true", "1", "yes")
        enrol = str(row.get("enrollment_status", "active")).lower().strip() or "active"

        programme = prog_by_name.get(pname)
        prog_id = programme.id if programme else (programmes[0].id if programmes else None)

        row_findings = []

        # Duplicate in batch
        if apaar and len(apaar_seen_in_batch.get(apaar, [])) > 1:
            row_findings.append({
                "rule_code": "DUPLICATE_IN_BATCH",
                "severity": "error",
                "message": f"Same APAAR ID is repeated in batch (rows: {apaar_seen_in_batch[apaar]})",
                "evidence": {"rows": apaar_seen_in_batch[apaar]},
                "recommended_action": "Remove duplicate entries"
            })

        # Cross-institution duplicate check
        if programme:
            active_other = set()
            dup_inst = False
            if apaar and _APAAR_RE.match(apaar):
                h = hash_apaar_id(apaar)
                cross = db.query(StudentRecord.institution_id).filter(
                    StudentRecord.apaar_id_hash == h,
                    StudentRecord.enrollment_status == "active"
                ).all()
                for c in cross:
                    if c[0] != inst_uuid:
                        active_other.add(str(c[0]))
                    else:
                        dup_inst = True

            prog_dict = {
                "id": str(programme.id),
                "name": programme.name,
                "approved_intake": programme.approved_intake,
                "supernumerary_quota": programme.supernumerary_quota,
                "nri_quota": programme.nri_quota,
                "oci_quota": programme.oci_quota,
                "fn_quota": programme.fn_quota,
                "session_start": programme.session_start.isoformat() if programme.session_start else None,
                "session_end": programme.session_end.isoformat() if programme.session_end else None
            }

            base_findings = revalidate_record(
                record={
                    "apaar_id": apaar,
                    "student_institution_id": sid,
                    "full_name": name,
                    "dob": dob,
                    "admission_date": adm_date,
                    "programme_id": str(prog_id) if prog_id else None,
                    "academic_year": ay,
                    "category": cat,
                    "is_nri": is_nri,
                    "is_oci": is_oci,
                    "is_foreign_national": is_fn,
                    "is_supernumerary": is_sup
                },
                programme=prog_dict,
                registry=registry,
                other_active_institution_ids=active_other,
                duplicate_in_institution=dup_inst
            )
            row_findings.extend(base_findings)

        rec_status = next_record_status(row_findings)
        if any(f["severity"] == "error" for f in row_findings):
            error_count += 1
        elif any(f["severity"] == "warning" for f in row_findings):
            warning_count += 1

        reg_st = registry.lookup(apaar).value if apaar and _APAAR_RE.match(apaar) else None

        existing_st = db.query(StudentRecord).filter(
            StudentRecord.institution_id == inst_uuid,
            StudentRecord.student_institution_id == sid,
            StudentRecord.academic_year == ay
        ).first()

        if existing_st:
            st = existing_st
            st.batch_id = batch_id
            st.programme_id = prog_id
            st.full_name = name or st.full_name
            st.gender = gender or st.gender
            st.dob = date.fromisoformat(dob) if dob else None
            st.admission_date = date.fromisoformat(adm_date) if adm_date else date.today()
            st.category = cat if cat in ["general","obc","sc","st","ews","management","nri","oci","foreign_national"] else "general"
            st.is_supernumerary = is_sup
            st.is_nri = is_nri
            st.is_oci = is_oci
            st.is_foreign_national = is_fn
            st.enrollment_status = enrol if enrol in ["active","withdrawn","transferred","completed"] else "active"
            st.record_status = rec_status
            st.registry_status = reg_st
            st.apaar_id = apaar or None
            db.query(ValidationFinding).filter(ValidationFinding.record_id == st.id).delete()
        else:
            st = StudentRecord(
                batch_id=batch_id,
                institution_id=inst_uuid,
                programme_id=prog_id,
                academic_year=ay,
                student_institution_id=sid,
                full_name=name or f"Student {row_num}",
                gender=gender or "O",
                dob=date.fromisoformat(dob) if dob else None,
                admission_date=date.fromisoformat(adm_date) if adm_date else date.today(),
                category=cat if cat in ["general","obc","sc","st","ews","management","nri","oci","foreign_national"] else "general",
                is_supernumerary=is_sup,
                is_nri=is_nri,
                is_oci=is_oci,
                is_foreign_national=is_fn,
                enrollment_status=enrol if enrol in ["active","withdrawn","transferred","completed"] else "active",
                record_status=rec_status,
                registry_status=reg_st,
                apaar_id=apaar or None
            )
            db.add(st)
        student_records.append(st)
        row_findings_map.append(row_findings)

    # 7. Insert student records and validation findings
    db.commit()
    for st in student_records:
        db.refresh(st)

    findings_objects = []
    for idx, findings in enumerate(row_findings_map):
        st = student_records[idx]
        for f in findings:
            findings_objects.append(ValidationFinding(
                batch_id=batch_id,
                record_id=st.id,
                row_number=idx + 1,
                rule_code=f["rule_code"],
                severity=f["severity"],
                message=f["message"],
                evidence=f.get("evidence", {}),
                recommended_action=f.get("recommended_action")
            ))

    if findings_objects:
        db.add_all(findings_objects)

    # 8. Update batch status
    final_status = "has_errors" if error_count > 0 else "validated"
    batch.valid_rows = total_rows - error_count - warning_count
    batch.error_rows = error_count
    batch.warning_rows = warning_count
    batch.status = final_status
    db.commit()

    return {
        "batch_id": str(batch_id),
        "file_name": file.filename,
        "total_rows": total_rows,
        "valid_rows": total_rows - error_count - warning_count,
        "error_rows": error_count,
        "warning_rows": warning_count,
        "status": final_status,
        "findings_count": len(findings_objects)
    }

@router.post("/{batch_id}/submit")
def submit_batch(batch_id: str, db: Session = Depends(get_db)):
    try:
        b_uuid = uuid.UUID(batch_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid batch ID")

    batch = db.get(UploadBatch, b_uuid)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    err_count = db.query(ValidationFinding).filter(
        ValidationFinding.batch_id == b_uuid,
        ValidationFinding.severity == "error",
        ValidationFinding.is_resolved == False
    ).count()

    if err_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot submit batch with {err_count} unresolved errors. Please correct them first.")

    batch.status = "submitted"
    db.query(StudentRecord).filter(
        StudentRecord.batch_id == b_uuid,
        StudentRecord.record_status != "flagged"
    ).update({"record_status": "submitted"}, synchronize_session=False)

    db.commit()
    return {"status": "submitted", "message": "Batch successfully submitted to AICTE Central Repository"}
