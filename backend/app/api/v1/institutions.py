from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("")
def list_institutions(state: Optional[str] = Query(None)):
    client = get_supabase_admin_client()
    query = client.table("institutions").select("*")
    if state:
        query = query.eq("state", state)
    res = query.order("name").execute()
    return res.data

@router.get("/{institution_id}")
def get_institution(institution_id: str):
    client = get_supabase_admin_client()
    res = client.table("institutions").select("*, programmes(*)").eq("id", institution_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Institution not found")
    return res.data[0]
