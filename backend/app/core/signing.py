import json
import hmac
import hashlib
from app.core.config import get_settings

settings = get_settings()

def sign_payload(data: dict) -> str:
    """Creates a cryptographic HMAC-SHA256 signature for tamper-evident credentials."""
    canonical_json = json.dumps(data, sort_keys=True, separators=(',', ':'))
    key = settings.SIGNING_SECRET.encode("utf-8")
    sig = hmac.new(key, canonical_json.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"sha256:{sig}"

def verify_signature(data: dict, signature: str) -> bool:
    expected = sign_payload(data)
    return hmac.compare_digest(expected, signature)
