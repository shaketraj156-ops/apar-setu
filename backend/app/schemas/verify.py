import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class VerifyRequestInput(BaseModel):
    apaar_id: str = Field(..., description="12-digit student APAAR ID")
    student_institution_id: str | None = Field(None, description="Optional Roll Number for double-blind match")
    purpose: str = Field("Employment / Higher Studies Verification", description="Reason for verification")

class VerifyResponse(BaseModel):
    verification_ref: str
    status: str = Field(..., description="ACTIVE / CONSENT_REQUIRED / NOT_FOUND")
    institution_name: str | None = None
    programme_name: str | None = None
    academic_year: str | None = None
    enrollment_status: str | None = None
    signature: str | None = None
    verified_at: datetime
    message: str

class ConsentDecisionInput(BaseModel):
    decision: str = Field(..., description="GRANTED or REJECTED")
