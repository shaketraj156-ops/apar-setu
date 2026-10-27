from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response
from app.services.supabase_client import get_supabase_admin_client
from app.services.risk_scoring import RiskInput, compute_risk
from app.services.export_service import export_csv, export_excel, export_pdf

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/kpis")
def get_national_kpis():
    client = get_supabase_admin_client()
    res = client.table("v_national_kpis").select("*").execute()
    return res.data[0] if res.data else {}

@router.get("/intake")
def get_intake_utilization(
    state: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None),
    alert_level: Optional[str] = Query(None)
):
    client = get_supabase_admin_client()
    query = client.table("v_intake_utilization").select("*")
    if state:
        query = query.eq("state", state)
    if institution_id:
        query = query.eq("institution_id", institution_id)
    if alert_level:
        query = query.eq("alert_level", alert_level)
    res = query.execute()
    return res.data

@router.get("/duplicates")
def get_duplicate_enrolments():
    client = get_supabase_admin_client()
    res = client.table("v_duplicate_enrolments").select("*").execute()
    return res.data

@router.get("/data-quality")
def get_data_quality(institution_id: Optional[str] = Query(None)):
    client = get_supabase_admin_client()
    query = client.table("v_data_quality").select("*")
    if institution_id:
        query = query.eq("institution_id", institution_id)
    res = query.execute()
    return res.data

@router.get("/category")
def get_category_report(institution_id: Optional[str] = Query(None)):
    client = get_supabase_admin_client()
    query = client.table("v_category_report").select("*")
    if institution_id:
        query = query.eq("institution_id", institution_id)
    res = query.execute()
    return res.data

@router.get("/compliance")
def get_compliance_report(institution_id: Optional[str] = Query(None)):
    client = get_supabase_admin_client()
    query = client.table("v_compliance_report").select("*")
    if institution_id:
        query = query.eq("institution_id", institution_id)
    res = query.execute()
    return res.data

@router.get("/risk")
def get_risk_scores(institution_id: Optional[str] = Query(None)):
    client = get_supabase_admin_client()
    # Gather aggregate statistics per institution
    institutions_res = client.table("institutions").select("id, name").execute()
    institutions = institutions_res.data
    if institution_id:
        institutions = [i for i in institutions if i["id"] == institution_id]

    results = []
    for inst in institutions:
        iid = inst["id"]
        iname = inst["name"]
        
        # Total records
        rec_res = client.table("student_records").select("id", count="exact").eq("institution_id", iid).execute()
        total_records = rec_res.count or 0

        # Enrolled
        enr_res = client.table("student_records").select("id", count="exact").eq("institution_id", iid).in_("enrollment_status", ["active", "completed"]).execute()
        total_enrolled = enr_res.count or 0

        # Capacity from programmes
        prog_res = client.table("programmes").select("approved_intake, supernumerary_quota").eq("institution_id", iid).execute()
        app_intake = sum(p["approved_intake"] for p in prog_res.data) if prog_res.data else 0
        sup_quota = sum(p["supernumerary_quota"] for p in prog_res.data) if prog_res.data else 0

        # Findings counts
        find_res = client.table("validation_findings").select("severity, rule_code").eq("is_resolved", False).execute()
        # Filter for this institution's records
        inst_records_res = client.table("student_records").select("id").eq("institution_id", iid).execute()
        inst_rec_ids = {r["id"] for r in inst_records_res.data}
        inst_findings = [f for f in find_res.data if f.get("record_id") in inst_rec_ids]

        error_cnt = sum(1 for f in inst_findings if f["severity"] == "error")
        warning_cnt = sum(1 for f in inst_findings if f["severity"] == "warning")
        dup_cnt = sum(1 for f in inst_findings if "DUPLICATE" in f["rule_code"])
        cat_conflict_cnt = sum(1 for f in inst_findings if "CATEGORY" in f["rule_code"] or "SUPERNUMERARY" in f["rule_code"])

        risk_input = RiskInput(
            entity=iname,
            total_records=total_records,
            duplicate_records=dup_cnt,
            approved_intake=app_intake,
            supernumerary_quota=sup_quota,
            total_enrolled=total_enrolled,
            error_records=error_cnt,
            warning_records=warning_cnt,
            category_conflicts=cat_conflict_cnt
        )
        risk_res = compute_risk(risk_input)
        results.append({
            "institution_id": iid,
            "institution_name": iname,
            **risk_res.to_dict()
        })
    return results

@router.get("/{name}/export")
def export_report(
    name: str,
    format: str = Query("csv", pattern="^(csv|xlsx|pdf)$"),
    institution_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None)
):
    view_map = {
        "kpis": "v_national_kpis",
        "intake": "v_intake_utilization",
        "duplicates": "v_duplicate_enrolments",
        "data-quality": "v_data_quality",
        "category": "v_category_report",
        "compliance": "v_compliance_report",
    }
    view_name = view_map.get(name)
    if not view_name:
        raise HTTPException(status_code=404, detail=f"Report '{name}' not found")

    client = get_supabase_admin_client()
    query = client.table(view_name).select("*")
    if isinstance(institution_id, str) and institution_id.strip() and name != "kpis":
        query = query.eq("institution_id", institution_id)
    res = query.execute()
    rows = res.data or []

    if format == "csv":
        data = export_csv(rows, date_from=date_from, date_to=date_to)
        return Response(content=data, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={name}_report.csv"})
    elif format == "xlsx":
        data = export_excel(rows, title=name.title(), date_from=date_from, date_to=date_to)
        return Response(content=data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={name}_report.xlsx"})
    elif format == "pdf":
        data = export_pdf(rows, title=f"SNAP {name.title()} Report", date_from=date_from, date_to=date_to)
        return Response(content=data, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={name}_report.pdf"})
