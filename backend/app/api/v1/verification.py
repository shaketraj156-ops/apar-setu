import base64
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.db.models import StudentRecord, Institution, Programme, VerificationRequest, ConsentRecord
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
def verify_student(req: VerifyStudentRequest, db: Session = Depends(get_db)):
    # 1. Fetch student record with relations
    student = db.get(StudentRecord, req.record_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    # 2. Verify consent (if requester_id provided)
    if req.requester_id:
        try:
            r_uuid = uuid.UUID(req.requester_id)
            c = db.query(ConsentRecord).filter(
                ConsentRecord.record_id == student.id,
                ConsentRecord.requester_id == r_uuid,
                ConsentRecord.status == "GRANTED"
            ).first()
            if not c:
                raise HTTPException(status_code=403, detail="No active GRANTED consent found for this requester. Access denied.")
        except HTTPException:
            raise
        except Exception:
            pass

    inst = db.get(Institution, student.institution_id) if student.institution_id else None
    prog = db.get(Programme, student.programme_id) if student.programme_id else None

    # 3. Build minimal signed credential
    rec_dict = {
        "apaar_id": student.apaar_id or "",
        "student_institution_id": student.student_institution_id,
        "institution": inst.name if inst else "Institution",
        "programme": prog.name if prog else "Programme",
        "academic_year": student.academic_year,
        "status": student.enrollment_status.upper()
    }
    payload = build_payload(rec_dict, consent="GRANTED")
    signed_jwt = sign_credential(payload, settings.QR_PRIVATE_KEY_PEM)

    # 4. Log verification request in audit
    try:
        v_req = VerificationRequest(
            requester_id=uuid.UUID(req.requester_id) if req.requester_id else None,
            record_id=student.id,
            purpose="Academic and Employment Background Verification",
            result_status="VERIFIED"
        )
        db.add(v_req)
        db.commit()
    except Exception:
        db.rollback()

    return {
        **payload,
        "credential": signed_jwt
    }

@router.post("/credentials/qr")
def generate_qr_credential(req: GenerateQRRequest, db: Session = Depends(get_db)):
    student = db.get(StudentRecord, req.record_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    inst = db.get(Institution, student.institution_id) if student.institution_id else None
    prog = db.get(Programme, student.programme_id) if student.programme_id else None

    rec_dict = {
        "apaar_id": student.apaar_id or "",
        "student_institution_id": student.student_institution_id,
        "institution": inst.name if inst else "Institution",
        "programme": prog.name if prog else "Programme",
        "academic_year": student.academic_year,
        "status": student.enrollment_status.upper()
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
def download_qr_png(record_id: str, db: Session = Depends(get_db)):
    student = db.get(StudentRecord, record_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    inst = db.get(Institution, student.institution_id) if student.institution_id else None
    prog = db.get(Programme, student.programme_id) if student.programme_id else None

    rec_dict = {
        "apaar_id": student.apaar_id or "",
        "student_institution_id": student.student_institution_id,
        "institution": inst.name if inst else "Institution",
        "programme": prog.name if prog else "Programme",
        "academic_year": student.academic_year,
        "status": student.enrollment_status.upper()
    }
    payload = build_payload(rec_dict, consent="GRANTED")
    token = sign_credential(payload, settings.QR_PRIVATE_KEY_PEM)
    png_bytes = qr_png(token, base_url=settings.QR_BASE_URL)

    return Response(content=png_bytes, media_type="image/png", headers={
        "Content-Disposition": f"inline; filename={student.student_institution_id}_qr.png"
    })
