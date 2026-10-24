import io
import re
from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
import pandas as pd
from app.services.supabase_client import get_supabase_admin_client
from app.services.registry_client import RegistryClient, RegistryStatus
from app.services.revalidation_service import revalidate_record, next_record_status
from app.core.config import settings

router = APIRouter(prefix="/batches", tags=["Upload Batches & Ingestion"])

_APAAR_RE = re.compile(r"^\d{12}$")

@router.get("")
def list_batches(institution_id: Optional[str] = Query(None)):
    client = get_supabase_admin_client()
    query = client.table("upload_batches").select("*, institutions(name, aicte_code)")
    if institution_id:
        query = query.eq("institution_id", institution_id)
    res = query.order("created_at", desc=True).execute()
    return res.data

@router.get("/{batch_id}")
def get_batch(batch_id: str):
    client = get_supabase_admin_client()
    res = client.table("upload_batches").select("*, institutions(name)").eq("id", batch_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch = res.data[0]

    findings_res = client.table("validation_findings").select("*, student_records(full_name, student_institution_id, apaar_id)").eq("batch_id", batch_id).execute()
    batch["findings"] = findings_res.data
    return batch

@router.post("/upload")
async def upload_student_batch(
    file: UploadFile = File(...),
    institution_id: str = Form(...)
):
    client = get_supabase_admin_client()

    # 1. Verify institution exists
    inst_res = client.table("institutions").select("*").eq("id", institution_id).execute()
    if not inst_res.data:
        raise HTTPException(status_code=400, detail="Invalid institution_id")

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
    batch_insert = client.table("upload_batches").insert({
        "institution_id": institution_id,
        "file_name": file.filename,
        "total_rows": total_rows,
        "status": "validating"
    }).execute()
    batch_id = batch_insert.data[0]["id"]

    # 4. Fetch institution programmes
    prog_res = client.table("programmes").select("*").eq("institution_id", institution_id).execute()
    prog_by_name = {p["name"].strip().lower(): p for p in prog_res.data}

    registry = RegistryClient(base_url=settings.MOCK_APAAR_REGISTRY_URL)

    # 5. Track duplicates in current batch
    apaar_seen_in_batch = {}
    for idx, row in df.iterrows():
        a = str(row.get("apaar_id", "")).strip()
        if a and _APAAR_RE.match(a):
            apaar_seen_in_batch.setdefault(a, []).append(idx + 1)

    error_count = 0
    warning_count = 0
    records_to_insert = []
    findings_to_insert = []

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
        prog_id = programme["id"] if programme else (prog_res.data[0]["id"] if prog_res.data else None)

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

        # Base revalidate check
        if programme:
            active_other = set()
            dup_inst = False
            if apaar and _APAAR_RE.match(apaar):
                cross = client.table("student_records").select("institution_id").eq("apaar_id", apaar).eq("enrollment_status", "active").execute()
                for c in cross.data:
                    if c["institution_id"] != institution_id:
                        active_other.add(c["institution_id"])
                    else:
                        dup_inst = True

            base_findings = revalidate_record(
                record={
                    "apaar_id": apaar,
                    "student_institution_id": sid,
                    "full_name": name,
                    "dob": dob,
                    "admission_date": adm_date,
                    "programme_id": prog_id,
                    "academic_year": ay,
                    "category": cat,
                    "is_nri": is_nri,
                    "is_oci": is_oci,
                    "is_foreign_national": is_fn,
                    "is_supernumerary": is_sup
                },
                programme=programme,
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

        records_to_insert.append({
            "batch_id": batch_id,
            "institution_id": institution_id,
            "programme_id": prog_id,
            "academic_year": ay,
            "student_institution_id": sid,
            "full_name": name or f"Student {row_num}",
            "gender": gender or "O",
            "dob": dob,
            "admission_date": adm_date or str(date.today()),
            "category": cat if cat in ["general","obc","sc","st","ews","management","nri","oci","foreign_national"] else "general",
            "is_supernumerary": is_sup,
            "is_nri": is_nri,
            "is_oci": is_oci,
            "is_foreign_national": is_fn,
            "enrollment_status": enrol if enrol in ["active","withdrawn","transferred","completed"] else "active",
            "record_status": rec_status,
            "registry_status": reg_st,
            "apaar_id": apaar or None
        })

        for f in row_findings:
            findings_to_insert.append({
                **f,
                "batch_id": batch_id,
                "row_number": row_num
            })

    # 7. Insert student records in bulk
    ins_records = client.table("student_records").insert(records_to_insert).execute()
    inserted_records = ins_records.data or []

    # Map findings to inserted student record IDs
    for f in findings_to_insert:
        r_idx = f["row_number"] - 1
        if 0 <= r_idx < len(inserted_records):
            f["record_id"] = inserted_records[r_idx]["id"]

    if findings_to_insert:
        client.table("validation_findings").insert(findings_to_insert).execute()

    # 8. Update batch status
    final_status = "has_errors" if error_count > 0 else "validated"
    client.table("upload_batches").update({
        "valid_rows": total_rows - error_count - warning_count,
        "error_rows": error_count,
        "warning_rows": warning_count,
        "status": final_status
    }).eq("id", batch_id).execute()

    return {
        "batch_id": batch_id,
        "file_name": file.filename,
        "total_rows": total_rows,
        "valid_rows": total_rows - error_count - warning_count,
        "error_rows": error_count,
        "warning_rows": warning_count,
        "status": final_status,
        "findings_count": len(findings_to_insert)
    }

@router.post("/{batch_id}/submit")
def submit_batch(batch_id: str):
    client = get_supabase_admin_client()
    # Check if any unresolved error findings exist
    err_res = client.table("validation_findings").select("id", count="exact").eq("batch_id", batch_id).eq("severity", "error").eq("is_resolved", False).execute()
    if (err_res.count or 0) > 0:
        raise HTTPException(status_code=400, detail=f"Cannot submit batch with {err_res.count} unresolved errors. Please correct them first.")

    # Update batch to submitted
    client.table("upload_batches").update({"status": "submitted"}).eq("id", batch_id).execute()
    # Update students in this batch to submitted
    client.table("student_records").update({"record_status": "submitted"}).eq("batch_id", batch_id).neq("record_status", "flagged").execute()
    return {"status": "submitted", "message": "Batch successfully submitted to AICTE Central Repository"}
