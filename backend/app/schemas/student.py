# File: backend/app/schemas/student.py
import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field


class StudentRecordBase(BaseModel):
    programme_id: uuid.UUID
    academic_year: str = Field(..., description="e.g. 2026-30")
    student_institution_id: str = Field(..., description="College Roll Number")
    full_name: str
    gender: str | None = None
    dob: date | None = None
    admission_date: date | None = None
    category: str = Field("general", description="general/obc/sc/st/ews/management/nri/oci/foreign_national")
    is_supernumerary: bool = False
    is_nri: bool = False
    is_oci: bool = False
    is_foreign_national: bool = False


class StudentRecordCreate(StudentRecordBase):
    apaar_id: str | None = Field(None, description="12-digit APAAR ID")
    institution_id: uuid.UUID | None = None


class StudentRecordRead(BaseModel):
    id: uuid.UUID
    institution_id: uuid.UUID
    programme_id: uuid.UUID
    batch_id: uuid.UUID | None = None
    academic_year: str
    student_institution_id: str
    full_name: str
    gender: str | None = None
    dob: date | None = None
    admission_date: date | None = None
    category: str
    is_supernumerary: bool
    is_nri: bool
    is_oci: bool
    is_foreign_national: bool
    enrollment_status: str
    record_status: str
    apaar_id_masked: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
