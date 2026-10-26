import uuid
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db, require_role
from app.core.errors import NotFoundError
from app.core.rate_limit import check_verify_rate_limit
from app.db.models import ConsentRecord
from app.schemas.verify import VerifyRequestInput, VerifyResponse, ConsentDecisionInput
from app.services.verification_service import verify_student_credential

router = APIRouter()

@router.post("/request", response_model=VerifyResponse, dependencies=[Depends(check_verify_rate_limit)])
@router.post("/student", response_model=VerifyResponse, dependencies=[Depends(check_verify_rate_limit)])
def request_verification(
    payload: VerifyRequestInput,
    request: Request,
    user: CurrentUser = Depends(require_role(["verifier", "aicte_officer", "system_admin"])),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    return verify_student_credential(
        db=db,
        apaar_id=payload.apaar_id,
        requester_profile_id=user.id,
        purpose=payload.purpose,
        roll_number=payload.student_institution_id,
        client_ip=client_ip
    )

@router.post("/consent/{id}/decision")
def record_consent_decision(
    id: uuid.UUID,
    payload: ConsentDecisionInput,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    consent = db.get(ConsentRecord, id)
    if not consent: raise NotFoundError("Consent record not found")
    consent.status = payload.decision.upper()
    db.commit()
    return {"status": "ok", "decision": consent.status}
