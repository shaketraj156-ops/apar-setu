# File: backend/app/core/masking.py
import hashlib


def mask_apaar_id(apaar_id: str | None) -> str:
    """
    Strictly follows Doc Page 8:
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


def hash_apaar_id(apaar_id: str | None) -> str | None:
    """Returns SHA-256 hash of APAAR ID for zero-knowledge privacy lookups."""
    if not apaar_id:
        return None
    return hashlib.sha256(str(apaar_id).strip().encode("utf-8")).hexdigest()
