"""Security helpers placeholder."""
# File: backend/app/core/security.py
import logging
from typing import Any
import jwt
from jwt import PyJWKClient, PyJWKClientError

from app.core.config import get_settings
from app.core.errors import AuthError

log = logging.getLogger('apaarsetu')
settings = get_settings()

_jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
_jwks_client: PyJWKClient | None = None


def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(_jwks_url)
    return _jwks_client


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodes Supabase JWT token:
    1. Checks via JWKS endpoint (asymmetric keys RS256/ES256)
    2. Falls back to HS256 with SUPABASE_JWT_SECRET for local dev/legacy tokens
    """
    token = token.strip()
    if token.startswith("Bearer "):
        token = token[7:].strip()

    # Strategy 1: JWKS asymmetric validation (retry once: a cold or flaky JWKS fetch must not log users out)
    global _jwks_client
    for attempt in range(2):
        try:
            jwks = get_jwks_client()
            signing_key = jwks.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                audience=settings.SUPABASE_JWT_AUDIENCE,
                leeway=60,  # tolerate small clock skew between this machine and Supabase
                options={"verify_exp": True, "verify_iss": False}
            )
            return payload
        except PyJWKClientError as e:
            log.warning(f"JWKS lookup failed (attempt {attempt + 1}): {e}")
            _jwks_client = None  # rebuild the client (drops a bad cache) and retry
        except jwt.InvalidTokenError as e:
            log.warning(f"JWT rejected: {type(e).__name__}: {e}")
            break

    # Strategy 2: HS256 secret fallback
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=settings.SUPABASE_JWT_AUDIENCE,
                leeway=60,
                options={"verify_exp": True, "verify_iss": False}
            )
            return payload
        except jwt.PyJWTError as e:
            log.warning(f"HS256 decode failed: {e}")

    raise AuthError("Invalid or expired token", code="UNAUTHENTICATED")
