from app.core.config import get_settings
settings = get_settings()

def verify_apaar_with_registry(apaar_id: str) -> str:
    if not apaar_id or len(apaar_id) != 12:
        return "INVALID"
    if settings.USE_FAKE_REGISTRY:
        if apaar_id.endswith("9999"): return "NOT_FOUND"
        if apaar_id.endswith("0000"): return "INVALID"
        return "VALID"
    return "VALID"
