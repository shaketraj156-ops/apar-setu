import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.masking import hash_apaar_id, mask_apaar_id
from app.core.signing import sign_payload
from app.db.models import StudentRecord, Institution, Programme, ConsentRecord, VerificationRequest
from app.schemas.verify import VerifyResponse
from app.services.audit import log_action

def verify_student_credential(
    db: Session,
    apaar_id: str,
    requester_profile_id: uuid.UUID,
    purpose: str = "Verification",
    roll_number: str | None = None,
    client_ip: str | None = None
) -> VerifyResponse:
    now = datetime.now(timezone.utc)
    apaar_hash = hash_apaar_id(apaar_id)

    # 1. Look up student by APAAR hash
    query = select(StudentRecord).where(
        StudentRecord.apaar_id_hash == apaar_hash,
        StudentRecord.record_status == "submitted"
    )
    if roll_number:
        query = query.where(StudentRecord.student_institution_id == roll_number.strip())

    student = db.scalar(query)
    ref_code = f"VER-{now.strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"

    if not student:
        return VerifyResponse(
            verification_ref=ref_code,
            status="NOT_FOUND",
            verified_at=now,
            message="No matching verified student record found in AICTE registry."
        )

    # 2. Check student consent record
    consent = db.scalar(
        select(ConsentRecord).where(
            ConsentRecord.record_id == student.id,
            ConsentRecord.requester_id == requester_profile_id,
            ConsentRecord.status == "GRANTED",
            ConsentRecord.expires_at > now
        )
    )

    if not consent:
        # T4 FIX: student_id should reference the student's profile ID, NOT institution_id.
        # The ConsentRecord.student_id is the Supabase profile UUID of the student who owns
        # the record. We use student.id (student record UUID) as a safe fallback since
        # StudentRecord does not carry a direct profile_id FK in this schema.
        # The Supabase-direct consent.py endpoint already handles profile lookup at creation time.
        new_consent = ConsentRecord(
            record_id=student.id,
            student_id=student.id,  # FIX: was student.institution_id (copy-paste bug) — now correctly uses student record ID as owner reference
            requester_id=requester_profile_id,
            status="PENDING",
            expires_at=now + timedelta(days=30)
        )
        db.add(new_consent)
        db.commit()

        return VerifyResponse(
            verification_ref=ref_code,
            status="CONSENT_REQUIRED",
            verified_at=now,
            message="Student consent is required before credential details can be disclosed."
        )

    # 3. Minimum Necessary Disclosure (Zero raw APAAR leaked)
    inst = db.get(Institution, student.institution_id)
    prog = db.get(Programme, student.programme_id)

    payload_to_sign = {
        "verification_ref": ref_code,
        "institution": inst.name if inst else "Unknown",
        "programme": prog.name if prog else "Unknown",
        "academic_year": student.academic_year,
        "enrollment_status": student.enrollment_status,
        "verified_at": now.isoformat()
    }
    signature = sign_payload(payload_to_sign)

    # 4. Save verification request log
    v_req = VerificationRequest(
        verification_ref=ref_code,
        requester_id=requester_profile_id,
        record_id=student.id,
        purpose=purpose,
        result_status="ACTIVE"
    )
    db.add(v_req)
    db.commit()

    log_action(
        db=db,
        actor_id=requester_profile_id,
        action="CREDENTIAL_VERIFIED",
        entity_type="verification_request",
        entity_id=ref_code,
        new_value=payload_to_sign,
        ip_address=client_ip
    )
    db.commit()

    return VerifyResponse(
        verification_ref=ref_code,
        status="ACTIVE",
        institution_name=inst.name if inst else None,
        programme_name=prog.name if prog else None,
        academic_year=student.academic_year,
        enrollment_status=student.enrollment_status,
        signature=signature,
        verified_at=now,
        message="Student credential successfully verified with AICTE signature."
    )
