import uuid
from dataclasses import dataclass
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.errors import AuthError, ForbiddenError
from app.core.security import decode_access_token
from app.db.models import Profile
from app.db.session import SessionLocal


@dataclass
class CurrentUser:
    id: uuid.UUID
    email: str
    role: str
    institution_id: uuid.UUID | None
    full_name: str | None = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db)
) -> CurrentUser:
    if not authorization:
        raise AuthError("Missing authorization header", code="UNAUTHENTICATED")

    if not authorization.startswith("Bearer "):
        raise AuthError("Invalid authorization header format", code="UNAUTHENTICATED")

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)

    user_sub = payload.get("sub")
    if not user_sub:
        raise AuthError("Token subject (sub) missing", code="UNAUTHENTICATED")

    try:
        user_uuid = uuid.UUID(user_sub)
    except ValueError:
        raise AuthError("Invalid user UUID in token", code="UNAUTHENTICATED")

    # Read role and institution from profiles table (NEVER from JWT user_metadata)
    profile = db.get(Profile, user_uuid)
    if not profile:
        raise AuthError("User profile does not exist in database", code="UNAUTHENTICATED")

    return CurrentUser(
        id=profile.id,
        email=profile.email,
        role=profile.role,
        institution_id=profile.institution_id,
        full_name=profile.full_name
    )


def get_optional_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db)
) -> CurrentUser | None:
    """
    Optional authentication for public/hybrid endpoints (e.g. registration dropdowns).
    Returns CurrentUser if valid token is provided, None otherwise without raising 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ", 1)[1].strip()
        payload = decode_access_token(token)
        user_sub = payload.get("sub")
        if not user_sub:
            return None
        user_uuid = uuid.UUID(user_sub)
        profile = db.get(Profile, user_uuid)
        if not profile:
            return None
        return CurrentUser(
            id=profile.id,
            email=profile.email,
            role=profile.role,
            institution_id=profile.institution_id,
            full_name=profile.full_name
        )
    except Exception:
        return None


def require_role(allowed_roles: list[str]):
    def role_checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise ForbiddenError(f"Role '{user.role}' is not authorized for this resource", code="FORBIDDEN")
        return user
    return role_checker


def check_institution_access(user: CurrentUser, target_institution_id: uuid.UUID | None) -> None:
    """
    Enforces multi-tenant data isolation.
    AICTE Officers, Auditors, and System Admins have national oversight.
    Institution users can only access resources belonging to their institution.
    """
    if user.role in ["aicte_officer", "system_admin", "auditor"]:
        return

    if user.role in ["institution_admin", "institution_staff"]:
        if not user.institution_id or not target_institution_id:
            raise ForbiddenError("Tenant access denied", code="FORBIDDEN")
        if user.institution_id != target_institution_id:
            raise ForbiddenError("Cross-institution access denied", code="FORBIDDEN")
        return

    raise ForbiddenError("Unauthorized access", code="FORBIDDEN")
