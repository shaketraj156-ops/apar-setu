from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.services.risk_scoring import RiskInput, compute_risk
from app.services.export_service import export_csv, export_excel, export_pdf

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/kpis")
def get_national_kpis(db: Session = Depends(get_db)):
    row = db.execute(text("SELECT * FROM v_national_kpis")).mappings().first()
    return dict(row) if row else {}

@router.get("/intake")
def get_intake_utilization(
    state: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None),
    alert_level: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = "SELECT * FROM v_intake_utilization WHERE 1=1"
    params = {}
    if state:
        query += " AND state = :state"
        params["state"] = state
    if institution_id:
        query += " AND institution_id = :institution_id"
        params["institution_id"] = institution_id
    if alert_level:
        query += " AND alert_level = :alert_level"
        params["alert_level"] = alert_level
    rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]

@router.get("/duplicates")
def get_duplicate_enrolments(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM v_duplicate_enrolments")).mappings().all()
    return [dict(r) for r in rows]

@router.get("/data-quality")
def get_data_quality(institution_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = "SELECT * FROM v_data_quality WHERE 1=1"
    params = {}
    if institution_id:
        query += " AND institution_id = :institution_id"
        params["institution_id"] = institution_id
    rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]

@router.get("/category")
def get_category_report(institution_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = "SELECT * FROM v_category_report WHERE 1=1"
    params = {}
    if institution_id:
        query += " AND institution_id = :institution_id"
        params["institution_id"] = institution_id
    rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]

@router.get("/compliance")
def get_compliance_report(institution_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = "SELECT * FROM v_compliance_report WHERE 1=1"
    params = {}
    if institution_id:
        query += " AND institution_id = :institution_id"
        params["institution_id"] = institution_id
    rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]

@router.get("/risk")
def get_risk_scores(institution_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query_inst = "SELECT id, name FROM institutions WHERE is_active = true"
    params_inst = {}
    if institution_id:
        query_inst += " AND id = :institution_id"
        params_inst["institution_id"] = institution_id
    institutions = db.execute(text(query_inst), params_inst).mappings().all()

    results = []
    for inst in institutions:
        iid = str(inst["id"])
        iname = inst["name"]
        
        total_records = db.execute(text("SELECT count(*) FROM student_records WHERE institution_id = :iid"), {"iid": iid}).scalar() or 0
        total_enrolled = db.execute(text("SELECT count(*) FROM student_records WHERE institution_id = :iid AND enrollment_status IN ('active', 'completed')"), {"iid": iid}).scalar() or 0

        cap = db.execute(text("SELECT coalesce(sum(approved_intake), 0) as app_intake, coalesce(sum(supernumerary_quota), 0) as sup_quota FROM programmes WHERE institution_id = :iid"), {"iid": iid}).mappings().first()
        app_intake = cap["app_intake"]
        sup_quota = cap["sup_quota"]

        findings = db.execute(text("""
            SELECT f.severity, f.rule_code 
            FROM validation_findings f
            JOIN student_records s ON s.id = f.record_id
            WHERE s.institution_id = :iid AND f.is_resolved = false
        """), {"iid": iid}).mappings().all()

        error_cnt = sum(1 for f in findings if f["severity"] == "error")
        warning_cnt = sum(1 for f in findings if f["severity"] == "warning")
        dup_cnt = sum(1 for f in findings if "DUPLICATE" in f["rule_code"])
        cat_conflict_cnt = sum(1 for f in findings if "CATEGORY" in f["rule_code"] or "SUPERNUMERARY" in f["rule_code"])

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
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db)
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

    query = f"SELECT * FROM {view_name}"
    params = {}
    if isinstance(institution_id, str) and institution_id.strip() and name != "kpis":
        query += " WHERE institution_id = :institution_id"
        params["institution_id"] = institution_id
    rows = [dict(r) for r in db.execute(text(query), params).mappings().all()]

    if format == "csv":
        data = export_csv(rows, date_from=date_from, date_to=date_to)
        return Response(content=data, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={name}_report.csv"})
    elif format == "xlsx":
        data = export_excel(rows, title=name.title(), date_from=date_from, date_to=date_to)
        return Response(content=data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={name}_report.xlsx"})
    elif format == "pdf":
        data = export_pdf(rows, title=f"APAARSetu {name.title()} Report", date_from=date_from, date_to=date_to)
        return Response(content=data, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={name}_report.pdf"})

