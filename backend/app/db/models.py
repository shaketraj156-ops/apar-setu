# File: backend/app/db/models.py

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (JSON, BigInteger, Boolean, Date, DateTime, ForeignKey, Integer,
                        String, Text, Uuid)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# JSONB on Postgres, plain JSON on SQLite (tests)
JSONType = JSON().with_variant(JSONB(), 'postgresql')


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class Base(DeclarativeBase):
    pass


class Profile(Base):
    __tablename__ = 'profiles'
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)  # = auth.users.id
    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default='student')
    institution_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey('institutions.id'), nullable=True)
    apaar_id_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    @property
    def is_active(self) -> bool:
        return True


class Institution(Base):
    __tablename__ = 'institutions'
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    aicte_code: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    district: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    @property
    def aicte_id(self) -> str:
        return self.aicte_code

    @aicte_id.setter
    def aicte_id(self, val: str) -> None:
        self.aicte_code = val


class Programme(Base):
    __tablename__ = 'programmes'
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    institution_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('institutions.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String)
    academic_year: Mapped[str] = mapped_column(String)          # e.g. '2026-30'
    approved_intake: Mapped[int] = mapped_column(Integer, default=0)
    supernumerary_quota: Mapped[int] = mapped_column(Integer, default=0)
    nri_quota: Mapped[int] = mapped_column(Integer, default=0)
    oci_quota: Mapped[int] = mapped_column(Integer, default=0)
    fn_quota: Mapped[int] = mapped_column(Integer, default=0)
    session_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    session_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    @property
    def code(self) -> str:
        return self.name

    @code.setter
    def code(self, val: str) -> None:
        pass

    @property
    def supernumerary_seats(self) -> int:
        return self.supernumerary_quota

    @supernumerary_seats.setter
    def supernumerary_seats(self, val: int) -> None:
        self.supernumerary_quota = val


class UploadBatch(Base):
    __tablename__ = 'upload_batches'
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    institution_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('institutions.id', ondelete='CASCADE'))
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey('profiles.id'), nullable=True)
    file_name: Mapped[str] = mapped_column(String)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    error_rows: Mapped[int] = mapped_column(Integer, default=0)
    warning_rows: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default='uploaded')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class StudentRecord(Base):
    __tablename__ = 'student_records'
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    institution_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('institutions.id', ondelete='CASCADE'))
    programme_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('programmes.id', ondelete='RESTRICT'))
    batch_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey('upload_batches.id', ondelete='SET NULL'), nullable=True)
    academic_year: Mapped[str] = mapped_column(String)
    student_institution_id: Mapped[str] = mapped_column(String)
    full_name: Mapped[str] = mapped_column(String)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    admission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    apaar_id: Mapped[str | None] = mapped_column(String, nullable=True)
    apaar_id_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String, default='general')
    is_supernumerary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_nri: Mapped[bool] = mapped_column(Boolean, default=False)
    is_oci: Mapped[bool] = mapped_column(Boolean, default=False)
    is_foreign_national: Mapped[bool] = mapped_column(Boolean, default=False)
    enrollment_status: Mapped[str] = mapped_column(String, default='active')
    record_status: Mapped[str] = mapped_column(String, default='draft')
    registry_status: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    @property
    def admission_category(self) -> str:
        return self.category

    @admission_category.setter
    def admission_category(self, val: str) -> None:
        self.category = val

    @property
    def nri_status(self) -> bool:
        return self.is_nri

    @nri_status.setter
    def nri_status(self, val: bool) -> None:
        self.is_nri = val

    @property
    def oci_status(self) -> bool:
        return self.is_oci

    @oci_status.setter
    def oci_status(self, val: bool) -> None:
        self.is_oci = val

    @property
    def foreign_national(self) -> bool:
        return self.is_foreign_national

    @foreign_national.setter
    def foreign_national(self, val: bool) -> None:
        self.is_foreign_national = val


class ValidationFinding(Base):
    __tablename__ = 'validation_findings'
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    batch_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('upload_batches.id', ondelete='CASCADE'))
    record_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey('student_records.id', ondelete='CASCADE'), nullable=True)
    row_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rule_code: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text)
    evidence: Mapped[dict | None] = mapped_column(JSONType, default=dict)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class VerificationRequest(Base):
    __tablename__ = 'verification_requests'
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    verification_ref: Mapped[str] = mapped_column(String, unique=True)
    requester_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('profiles.id'))
    record_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('student_records.id', ondelete='CASCADE'))
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_status: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class ConsentRecord(Base):
    __tablename__ = 'consent_records'
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    record_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('student_records.id', ondelete='CASCADE'))
    student_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('profiles.id'))
    requester_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey('profiles.id'))
    verification_request_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey('verification_requests.id', ondelete='SET NULL'), nullable=True)
    status: Mapped[str] = mapped_column(String, default='PENDING')
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    old_value: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
