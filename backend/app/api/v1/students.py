from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from app.services.supabase_client import get_supabase_admin_client
from app.services.revalidation_service import revalidate_record, apply_findings
from app.services.registry_client import RegistryClient
from app.core.config import settings

router = APIRouter(prefix="/students", tags=["Students"])

class StudentCorrectionUpdate(BaseModel):
    apaar_id: Optional[str] = None
    student_institution_id: Optional[str] = None
    full_name: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    admission_date: Optional[str] = None
    category: Optional[str] = None
    is_supernumerary: Optional[bool] = None
    is_nri: Optional[bool] = None
    is_oci: Optional[bool] = None
    is_foreign_national: Optional[bool] = None
    enrollment_status: Optional[str] = None

@router.get("")
def list_students(
    institution_id: Optional[str] = Query(None),
    programme_id: Optional[str] = Query(None),
    record_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    client = get_supabase_admin_client()
    query = client.table("student_records").select("*, programmes(name, academic_year), institutions(name, aicte_code)", count="exact")
    if institution_id:
        query = query.eq("institution_id", institution_id)
    if programme_id:
        query = query.eq("programme_id", programme_id)
    if record_status:
        query = query.eq("record_status", record_status)
    if search:
        query = query.or_(f"full_name.ilike.%{search}%,student_institution_id.ilike.%{search}%,apaar_id.ilike.%{search}%")
    
    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    res = query.execute()
    return {
        "total": res.count or len(res.data),
        "limit": limit,
        "offset": offset,
        "students": res.data
    }

@router.get("/{student_id}")
def get_student(student_id: str):
    client = get_supabase_admin_client()
    res = client.table("student_records").select("*, programmes(*), institutions(*)").eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student record not found")
    student = res.data[0]
    
    # fetch findings
    findings_res = client.table("validation_findings").select("*").eq("record_id", student_id).eq("is_resolved", False).execute()
    student["findings"] = findings_res.data
    return student

@router.patch("/{student_id}")
def update_student_record(student_id: str, updates: StudentCorrectionUpdate):
    client = get_supabase_admin_client()
    
    # 1. Fetch current record
    res = client.table("student_records").select("*").eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student record not found")
    record = res.data[0]

    # 2. Fetch programme details
    prog_res = client.table("programmes").select("*").eq("id", record["programme_id"]).execute()
    if not prog_res.data:
        raise HTTPException(status_code=400, detail="Associated programme not found")
    programme = prog_res.data[0]

    # 3. Apply updates to record copy
    data_to_update = {k: v for k, v in updates.dict().items() if v is not None}
    updated_record = {**record, **data_to_update}

    # 4. Check cross-institution & in-institution duplicates
    apaar = updated_record.get("apaar_id")
    other_active_insts = set()
    dup_in_inst = False

    if apaar:
        cross_res = client.table("student_records").select("institution_id, id").eq("apaar_id", apaar).eq("enrollment_status", "active").neq("id", student_id).execute()
        for r in cross_res.data:
            if r["institution_id"] != record["institution_id"]:
                other_active_insts.add(r["institution_id"])
            else:
                dup_in_inst = True

    # 5. Programme enrollment counts
    enr_res = client.table("student_records").select("id", count="exact").eq("programme_id", record["programme_id"]).in_("enrollment_status", ["active", "completed"]).execute()
    sup_res = client.table("student_records").select("id", count="exact").eq("programme_id", record["programme_id"]).eq("is_supernumerary", True).execute()
    enrolled_count = enr_res.count or 0
    super_count = sup_res.count or 0

    # 6. Re-validate
    registry = RegistryClient(base_url=settings.MOCK_APAAR_REGISTRY_URL)
    findings = revalidate_record(
        record=updated_record,
        programme=programme,
        registry=registry,
        other_active_institution_ids=other_active_insts,
        duplicate_in_institution=dup_in_inst,
        enrolled_count=enrolled_count,
        supernumerary_count=super_count
    )

    # 7. Update student_records in DB
    client.table("student_records").update(data_to_update).eq("id", student_id).execute()

    # 8. Apply findings & update record_status
    new_status = apply_findings(
        client=client,
        batch_id=record.get("batch_id"),
        record_id=student_id,
        findings=findings
    )

    # 9. Audit log
    client.table("audit_logs").insert({
        "action": "Updated student record (row correction)",
        "entity_type": "student_records",
        "entity_id": student_id,
        "old_value": {k: record[k] for k in data_to_update if k in record},
        "new_value": data_to_update
    }).execute()

    # 10. Return updated student with findings
    updated_record["record_status"] = new_status
    updated_record["findings"] = findings
    return updated_record
