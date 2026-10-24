"""Consent lifecycle: PENDING -> GRANTED | REJECTED ; GRANTED -> REVOKED | EXPIRED ; PENDING -> EXPIRED.

Pure state-machine logic (no DB) so Dev 2 can call it from FastAPI routes and persist the result.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

PENDING, GRANTED, REJECTED, EXPIRED, REVOKED = "PENDING", "GRANTED", "REJECTED", "EXPIRED", "REVOKED"

ALLOWED = {
    PENDING: {GRANTED, REJECTED, EXPIRED},
    GRANTED: {REVOKED, EXPIRED},
    REJECTED: set(),
    EXPIRED: set(),
    REVOKED: set(),
}
DEFAULT_SCOPE = ("institution", "programme", "academic_year", "status")
FORBIDDEN_SCOPE = {"aadhaar", "apaar_id_full", "address", "parent_details", "marks"}


class ConsentError(ValueError):
    pass


@dataclass
class Consent:
    id: str
    student_id: str
    requester_id: str
    record_id: str
    status: str = PENDING
    scope: tuple = DEFAULT_SCOPE
    expires_at: datetime | None = None
    decided_at: datetime | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_request(id: str, student_id: str, requester_id: str, record_id: str,
                   scope=DEFAULT_SCOPE, ttl_days: int = 30, now: datetime | None = None) -> Consent:
    now = now or _now()
    if set(scope) & FORBIDDEN_SCOPE:
        raise ConsentError("Scope requests sensitive fields that are never shared via this flow")
    return Consent(id, student_id, requester_id, record_id, PENDING, tuple(scope), now + timedelta(days=ttl_days))


def effective_status(c: Consent, now: datetime | None = None) -> str:
    now = now or _now()
    if c.status in (PENDING, GRANTED) and c.expires_at and now >= c.expires_at:
        return EXPIRED
    return c.status


def transition(c: Consent, new_status: str, actor_id: str, now: datetime | None = None) -> Consent:
    now = now or _now()
    current = effective_status(c, now)
    if current != c.status:                       # lazily persist expiry
        c.status = current
    if new_status not in ALLOWED[c.status]:
        raise ConsentError(f"Cannot move consent from {c.status} to {new_status}")
    if new_status in (GRANTED, REJECTED, REVOKED) and actor_id != c.student_id:
        raise ConsentError("Only the student can grant, reject or revoke consent")
    c.status, c.decided_at = new_status, now
    return c


def is_verification_allowed(c: Consent, requester_id: str, now: datetime | None = None) -> bool:
    return effective_status(c, now) == GRANTED and c.requester_id == requester_id
