import base64
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Body
from app.api.deps import CurrentUser, get_current_user
from pydantic import BaseModel
from app.services.supabase_client import get_supabase_admin_client
from app.services.qr_credentials import (
    build_payload, sign_credential, verify_credential, qr_png, mask_apaar
)
from app.services.consent_service import effective_status, Consent, GRANTED
from app.core.config import settings

router = APIRouter(prefix="", tags=["Verification & Verifiable Credentials"])

class VerifyStudentRequest(BaseModel):
    record_id: str
    requester_id: Optional[str] = None

class GenerateQRRequest(BaseModel):
    record_id: str

@router.post("/verify/student")
def verify_student(req: VerifyStudentRequest, user: CurrentUser = Depends(get_current_user)):
    client = get_supabase_admin_client()

    # 1. Fetch student record with relations
    res = client.table("student_records").select("*, institutions(name), programmes(name)").eq("id", req.record_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student record not found")
    record = res.data[0]

    # 2. Verify consent (if requester_id provided)
    if req.requester_id:
        cons_res = client.table("consent_records").select("*").eq("record_id", req.record_id).eq("requester_id", req.requester_id).eq("status", "GRANTED").execute()
        if not cons_res.data:
            raise HTTPException(status_code=403, detail="No active GRANTED consent found for this requester. Access denied.")

    # 3. Build minimal signed credential
    rec_dict = {
        "apaar_id": record.get("apaar_id", ""),
        "student_institution_id": record["student_institution_id"],
        "institution": record["institutions"]["name"] if record.get("institutions") else "Institution",
        "programme": record["programmes"]["name"] if record.get("programmes") else "Programme",
        "academic_year": record["academic_year"],
        "status": record["enrollment_status"].upper()
    }
    payload = build_payload(rec_dict, consent="GRANTED")
    signed_jwt = sign_credential(payload, settings.QR_PRIVATE_KEY_PEM)

    # 4. Log verification request in audit
    client.table("verification_requests").insert({
        "requester_id": req.requester_id or "00000000-0000-0000-0000-000000000002",
        "record_id": req.record_id,
        "purpose": "Academic and Employment Background Verification",
        "result_status": "VERIFIED"
    }).execute()

    return {
        **payload,
        "credential": signed_jwt
    }

@router.post("/credentials/qr")
def generate_qr_credential(req: GenerateQRRequest, user: CurrentUser = Depends(get_current_user)):
    client = get_supabase_admin_client()

    res = client.table("student_records").select("*, institutions(name), programmes(name)").eq("id", req.record_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student record not found")
    record = res.data[0]

    if user.role == "student" and record.get("apaar_id_hash") != user.apaar_id_hash:
        raise HTTPException(status_code=403, detail="Students can only generate credentials for their own record")
    if user.role in ("institution_admin", "institution_staff") and str(record.get("institution_id")) != str(user.institution_id):
        raise HTTPException(status_code=403, detail="Access to other institution's data is forbidden")

    rec_dict = {
        "apaar_id": record.get("apaar_id", ""),
        "student_institution_id": record["student_institution_id"],
        "institution": record["institutions"]["name"] if record.get("institutions") else "Institution",
        "programme": record["programmes"]["name"] if record.get("programmes") else "Programme",
        "academic_year": record["academic_year"],
        "status": record["enrollment_status"].upper()
    }
    payload = build_payload(rec_dict, consent="GRANTED")
    token = sign_credential(payload, settings.QR_PRIVATE_KEY_PEM)
    png_bytes = qr_png(token, base_url=settings.QR_BASE_URL)
    qr_b64 = f"data:image/png;base64,{base64.b64encode(png_bytes).decode()}"

    return {
        "verification_id": payload["verification_id"],
        "token": token,
        "qr_code_data_uri": qr_b64,
        "payload": payload
    }

@router.get("/verify/qr")
def verify_qr_token(t: str = Query(..., description="The signed Ed25519 credential token")):
    res = verify_credential(t, settings.QR_PUBLIC_KEY_PEM)
    return res

@router.get("/credentials/qr/{record_id}/png")
def download_qr_png(record_id: str):
    client = get_supabase_admin_client()
    res = client.table("student_records").select("*, institutions(name), programmes(name)").eq("id", record_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student record not found")
    record = res.data[0]

    rec_dict = {
        "apaar_id": record.get("apaar_id", ""),
        "student_institution_id": record["student_institution_id"],
        "institution": record["institutions"]["name"] if record.get("institutions") else "Institution",
        "programme": record["programmes"]["name"] if record.get("programmes") else "Programme",
        "academic_year": record["academic_year"],
        "status": record["enrollment_status"].upper()
    }
    payload = build_payload(rec_dict, consent="GRANTED")
    token = sign_credential(payload, settings.QR_PRIVATE_KEY_PEM)
    png_bytes = qr_png(token, base_url=settings.QR_BASE_URL)

    return Response(content=png_bytes, media_type="image/png", headers={
        "Content-Disposition": f"inline; filename={record['student_institution_id']}_qr.png"
    })
