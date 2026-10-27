# File: backend/app/api/v1/routes/auth.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
import httpx
from app.api.deps import CurrentUser, get_current_user
from app.core.config import get_settings
from app.core.errors import AuthError

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login", tags=["auth"])
def login(payload: LoginRequest):
    """
    Authenticate against Supabase and return JWT access token.
    Compatible with scripts/get_token.py and API client logins.
    """
    settings = get_settings()
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
    anon_key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_PUBLISHABLE_KEY
    headers = {
        "apikey": anon_key,
        "Content-Type": "application/json"
    }
    data = {"email": payload.email, "password": payload.password}
    resp = httpx.post(url, headers=headers, json=data, timeout=10)
    if resp.status_code != 200:
        raise AuthError(f"Login failed: {resp.text}", code="INVALID_CREDENTIALS", status_code=401)
    
    res_data = resp.json()
    return {
        "access_token": res_data.get("access_token"),
        "token_type": "bearer",
        "expires_in": res_data.get("expires_in"),
        "user": res_data.get("user")
    }


@router.get("/me", tags=["auth"])
def get_me(user: CurrentUser = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "institution_id": str(user.institution_id) if user.institution_id else None,
        "full_name": user.full_name,
    }
