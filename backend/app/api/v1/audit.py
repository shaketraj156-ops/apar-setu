"""
Audit Logs API — SNAP
===========================
Exposes the append-only audit_logs table for AICTE officers and auditors.

Endpoints:
  GET /api/v1/audit/logs   — Paginated list with filters (actor, action, entity, date range)

Security:
  - Only aicte_officer, auditor, and system_admin roles can access audit logs
  - Audit logs are read-only (INSERT-only table enforced by DB trigger)
  - Supabase admin client is used to bypass RLS for full log visibility

Note:
  The underlying audit_logs table has a PostgreSQL trigger that blocks
  UPDATE and DELETE, making this an immutable append-only audit trail.
  This satisfies DPDP and AICTE compliance requirements.
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.supabase_client import get_supabase_admin_client

# Route is mounted at /api/v1/audit in main.py
router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("/logs")
def list_audit_logs(
    actor_email: Optional[str] = Query(None, description="Filter by actor email (partial match)"),
    action: Optional[str] = Query(None, description="Filter by action type (e.g. CREATE_STUDENT_RECORD)"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. student_record, upload_batch)"),
    entity_id: Optional[str] = Query(None, description="Filter by specific entity UUID"),
    date_from: Optional[date] = Query(None, description="Log entries from this date (ISO 8601)"),
    date_to: Optional[date] = Query(None, description="Log entries up to this date (ISO 8601)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=200, description="Results per page"),
):
    """
    Retrieve paginated audit log entries for AICTE officers and auditors.

    All log entries are immutable — the underlying table has a DB-level
    trigger that blocks UPDATE and DELETE operations.

    Returns entries in descending chronological order (newest first).
    """
    client = get_supabase_admin_client()

    # Build query with optional filters
    query = client.table("audit_logs").select(
        "id, actor_id, actor_email, action, entity_type, entity_id, old_value, new_value, ip_address, created_at",
        count="exact"
    )

    # Apply filters
    if actor_email:
        # Supabase ilike for case-insensitive partial match
        query = query.ilike("actor_email", f"%{actor_email}%")
    if action:
        query = query.eq("action", action)
    if entity_type:
        query = query.eq("entity_type", entity_type)
    if entity_id:
        query = query.eq("entity_id", entity_id)
    if date_from:
        query = query.gte("created_at", date_from.isoformat())
    if date_to:
        # Include full day by using next day boundary
        query = query.lte("created_at", f"{date_to.isoformat()}T23:59:59Z")

    # Paginate: newest first
    offset = (page - 1) * page_size
    result = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

    return {
        "total": result.count or 0,
        "page": page,
        "page_size": page_size,
        "items": result.data or []
    }


@router.get("/logs/actions")
def list_audit_action_types():
    """
    Return distinct action types present in the audit log.
    Useful for frontend filter dropdowns.
    """
    client = get_supabase_admin_client()
    # Fetch distinct action values
    result = client.table("audit_logs").select("action").execute()
    if not result.data:
        return {"actions": []}
    distinct_actions = sorted(set(row["action"] for row in result.data if row.get("action")))
    return {"actions": distinct_actions}
