# File: backend/app/services/audit.py
import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.db.models import AuditLog


def log_action(
    db: Session,
    action: str,
    entity_type: str,
    actor_id: uuid.UUID | None = None,
    actor_email: str | None = None,
    entity_id: str | None = None,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
    ip_address: str | None = None
) -> AuditLog:
    """Creates an append-only audit log entry."""
    entry = AuditLog(
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address
    )
    db.add(entry)
    db.flush()
    return entry
