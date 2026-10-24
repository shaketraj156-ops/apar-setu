# File: backend/app/schemas/programme.py
import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field


class ProgrammeBase(BaseModel):
    name: str = Field(..., description="Programme name e.g. B.Tech Computer Science")
    academic_year: str = Field(..., description="e.g. 2026-30")
    approved_intake: int = Field(0, ge=0)
    supernumerary_quota: int = Field(0, ge=0)
    nri_quota: int = Field(0, ge=0)
    oci_quota: int = Field(0, ge=0)
    fn_quota: int = Field(0, ge=0)
    session_start: date | None = None
    session_end: date | None = None


class ProgrammeCreate(ProgrammeBase):
    institution_id: uuid.UUID | None = None


class ProgrammeRead(ProgrammeBase):
    id: uuid.UUID
    institution_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
