from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from app.api.deps import CurrentUser, get_current_user
from pydantic import BaseModel
from app.services.supabase_client import get_supabase_admin_client
from app.services.consent_service import (
    create_request, transition, effective_status, Consent,
    ConsentError, GRANTED, REJECTED, REVOKED, DEFAULT_SCOPE
)

router = APIRouter(prefix="/consents", tags=["Consent Management"])

class CreateConsentRequest(BaseModel):
    record_id: str
    student_id: Optional[str] = None
    requester_id: Optional[str] = None
    scope: Optional[List[str]] = list(DEFAULT_SCOPE)
    ttl_days: Optional[int] = 30

@router.get("")
def list_consents(
    student_id: Optional[str] = Query(None),
    record_id: Optional[str] = Query(None),
    requester_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):
    # Students only see consents addressed to them; verifiers only the ones they requested.
    if user.role == "student":
        student_id = str(user.id)
    elif user.role == "verifier":
        requester_id = str(user.id)
    client = get_supabase_admin_client()
    query = client.table("consent_records").select("*, student_records(full_name, student_institution_id, programmes(name), institutions(name))")
    if student_id:
        query = query.eq("student_id", student_id)
    if record_id:
        query = query.eq("record_id", record_id)
    if requester_id:
        query = query.eq("requester_id", requester_id)
    if status:
        query = query.eq("status", status)
    
    res = query.order("created_at", desc=True).execute()
    # Apply effective_status (checking expiration on read)
    now = datetime.now(timezone.utc)
    out = []
    for r in res.data:
        exp = datetime.fromisoformat(r["expires_at"].replace("Z", "+00:00")) if r.get("expires_at") else None
        c = Consent(
            id=r["id"],
            student_id=r["student_id"],
            requester_id=r["requester_id"],
            record_id=r["record_id"],
            status=r["status"],
            scope=tuple(r["scope"] or []),
            expires_at=exp
        )
        r["status"] = effective_status(c, now)
        out.append(r)
    return out

@router.post("", status_code=201)
def request_consent(req: CreateConsentRequest, user: CurrentUser = Depends(get_current_user)):
    client = get_supabase_admin_client()
    if user.role == "student":
        req.student_id = str(user.id)
    elif user.role == "verifier":
        req.requester_id = str(user.id)

    # 1. Lookup student record
    rec_res = client.table("student_records").select("id, apaar_id_hash").eq("id", req.record_id).execute()
    if not rec_res.data:
        raise HTTPException(status_code=404, detail="Student record not found")
    record = rec_res.data[0]

    # Find profile matching student or fallback to a demo profile ID
    student_id = req.student_id
    if not student_id:
        prof_res = client.table("profiles").select("id").eq("role", "student").execute()
        student_id = prof_res.data[0]["id"] if prof_res.data else "00000000-0000-0000-0000-000000000001"

    requester_id = req.requester_id
    if not requester_id:
        req_res = client.table("profiles").select("id").eq("role", "verifier").execute()
        requester_id = req_res.data[0]["id"] if req_res.data else "00000000-0000-0000-0000-000000000002"

    try:
        consent = create_request(
            id="",
            student_id=student_id,
            requester_id=requester_id,
            record_id=req.record_id,
            scope=req.scope,
            ttl_days=req.ttl_days or 30
        )
    except ConsentError as e:
        raise HTTPException(status_code=422, detail=str(e))

    ins_res = client.table("consent_records").insert({
        "record_id": req.record_id,
        "student_id": student_id,
        "requester_id": requester_id,
        "status": consent.status,
        "scope": list(consent.scope),
        "expires_at": consent.expires_at.isoformat()
    }).execute()

    return ins_res.data[0]

@router.post("/{consent_id}/grant")
def grant_consent(consent_id: str, user: CurrentUser = Depends(get_current_user)):
    return _apply_transition(consent_id, GRANTED, user)

@router.post("/{consent_id}/reject")
def reject_consent(consent_id: str, user: CurrentUser = Depends(get_current_user)):
    return _apply_transition(consent_id, REJECTED, user)

@router.post("/{consent_id}/revoke")
def revoke_consent(consent_id: str, user: CurrentUser = Depends(get_current_user)):
    return _apply_transition(consent_id, REVOKED, user)

def _apply_transition(consent_id: str, new_status: str, user: CurrentUser):
    client = get_supabase_admin_client()
    res = client.table("consent_records").select("*").eq("id", consent_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Consent record not found")
    r = res.data[0]

    # Only the student the consent belongs to (or a national admin) may decide it.
    if user.role not in ("system_admin",) and str(r["student_id"]) != str(user.id):
        raise HTTPException(status_code=403, detail="Only the student who owns this consent can change it")
    actor = str(user.id)
    exp = datetime.fromisoformat(r["expires_at"].replace("Z", "+00:00")) if r.get("expires_at") else None
    c = Consent(
        id=r["id"],
        student_id=r["student_id"],
        requester_id=r["requester_id"],
        record_id=r["record_id"],
        status=r["status"],
        scope=tuple(r["scope"] or []),
        expires_at=exp
    )

    try:
        updated = transition(c, new_status, actor_id=actor)
    except ConsentError as e:
        raise HTTPException(status_code=409, detail=str(e))

    now_iso = datetime.now(timezone.utc).isoformat()
    upd_res = client.table("consent_records").update({
        "status": updated.status,
        "decided_at": now_iso
    }).eq("id", consent_id).execute()
    return upd_res.data[0]
