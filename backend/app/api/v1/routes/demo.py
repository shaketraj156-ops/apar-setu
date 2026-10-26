"""Demo login proxy – signs in a demo account on the server side and returns the session.

This endpoint exists purely to work around browser-level ad-blockers (Brave Shields,
uBlock Origin, McAfee WebAdvisor, etc.) that block direct browser → supabase.co network
calls.  The browser calls our backend (which it already trusts), the backend calls
Supabase via a plain HTTP POST, and the session tokens are returned to the browser.

Security notes:
- Only the four hard-coded demo emails can be authenticated via this endpoint.
- The Supabase ANON key (publicly visible in the frontend bundle anyway) is used.
- This does NOT expose any admin / service-role capability.
"""
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.config import get_settings

log = logging.getLogger("apaarsetu")
router = APIRouter()
settings = get_settings()

# Exact demo email addresses – only these are ever accepted
DEMO_EMAILS = {
    "eit.admin@demo.test",
    "aicte@demo.test",
    "student@demo.test",
    "verifier@demo.test",
}

DEMO_PASSWORD = "password123"


class DemoLoginRequest(BaseModel):
    email: str


class DemoLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    expires_at: int


@router.post("/demo-login", tags=["auth"], response_model=DemoLoginResponse)
async def demo_login(body: DemoLoginRequest):
    """
    Server-side proxy that authenticates one of the four demo accounts against
    Supabase and returns the session.  Allows the browser to authenticate even
    when ad-blockers prevent direct calls to supabase.co.
    """
    email = body.email.strip().lower()
    if email not in DEMO_EMAILS:
        raise HTTPException(status_code=403, detail="Not a recognised demo account.")

    supabase_url = settings.SUPABASE_URL.rstrip("/")
    anon_key = settings.SUPABASE_ANON_KEY or "sb_publishable_OT2EF5bUxacRmQu1ACs2pw_2P78W1Y6"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{supabase_url}/auth/v1/token?grant_type=password",
                headers={
                    "apikey": anon_key,
                    "Content-Type": "application/json",
                },
                json={"email": email, "password": DEMO_PASSWORD},
            )
    except httpx.RequestError as exc:
        log.error("Demo login proxy: network error calling Supabase: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach authentication server.")

    if resp.status_code != 200:
        log.warning("Demo login proxy: Supabase returned %s – %s", resp.status_code, resp.text)
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {resp.json().get('error_description', resp.text)}",
        )

    data = resp.json()
    return DemoLoginResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        token_type=data.get("token_type", "bearer"),
        expires_in=data["expires_in"],
        expires_at=data["expires_at"],
    )
