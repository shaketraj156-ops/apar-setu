"""Authentication API placeholder."""
# File: backend/app/api/v1/routes/auth.py
from fastapi import APIRouter, Depends
from app.api.deps import CurrentUser, get_current_user

router = APIRouter()


@router.get("/me", tags=["auth"])
def get_me(user: CurrentUser = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "institution_id": str(user.institution_id) if user.institution_id else None,
        "full_name": user.full_name,
    }
