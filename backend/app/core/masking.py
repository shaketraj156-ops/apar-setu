# File: backend/app/core/masking.py
import hashlib
import hmac


def mask_apaar_id(apaar_id: str | None) -> str:
    """
    Masks the 12-digit APAAR ID showing only the last 4 digits:
    Example: 123456784821 -> ********4821
    """
    if not apaar_id:
        return "************"
    clean_id = str(apaar_id).strip()
    if len(clean_id) <= 4:
        return "****"
    masked_length = len(clean_id) - 4
    return ("*" * masked_length) + clean_id[-4:]


def hash_apaar_id(apaar_id: str | None, secret: str | None = None) -> str | None:
    """
    Cryptographic HMAC-SHA256 hash of APAAR ID for zero-knowledge privacy lookups.
    Using HMAC with a server secret prevents rainbow-table / brute-force reversal
    of 12-digit numbers (10^12 space).
    """
    if not apaar_id:
        return None
    clean = str(apaar_id).strip()
    
    key = secret
    if not key:
        try:
            from app.core.config import get_settings
            key = get_settings().SIGNING_SECRET
        except Exception:
            key = "apaarsetu-default-hmac-key-2026"

    return hmac.new(key.encode("utf-8"), clean.encode("utf-8"), hashlib.sha256).hexdigest()
