from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/programmes", tags=["Programmes"])

@router.get("")
def list_programmes(
    institution_id: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None)
):
    client = get_supabase_admin_client()
    query = client.table("programmes").select("*, institutions(name, aicte_code)")
    if institution_id:
        query = query.eq("institution_id", institution_id)
    if academic_year:
        query = query.eq("academic_year", academic_year)
    res = query.order("name").execute()
    return res.data
