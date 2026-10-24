# File: backend/app/schemas/institution.py
import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class InstitutionRead(BaseModel):
    id: uuid.UUID
    aicte_code: str
    name: str
    state: str
    district: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class IntakeUpdate(BaseModel):
    approved_intake: int = Field(..., ge=0, description="New approved intake count")
