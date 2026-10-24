import json
import re
from pathlib import Path

DATA_FILE = Path(__file__).parent / "data" / "synthetic_apaar_records.json"
_APAAR_RE = re.compile(r"^\d{12}$")

VALID_STATUSES = {"VALID", "INVALID", "NOT_FOUND", "PENDING"}


def _load() -> dict:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def verify_apaar_id(apaar_id: str) -> str:
    """Return VALID, INVALID, NOT_FOUND or PENDING for a synthetic APAAR ID.

    - Anything that is not exactly 12 digits is INVALID (no lookup needed).
    - IDs listed in synthetic_apaar_records.json return their recorded status.
    - Unknown 12-digit IDs return NOT_FOUND.
    """
    if not apaar_id or not _APAAR_RE.match(apaar_id):
        return "INVALID"
    record = _load().get(apaar_id)
    return record["status"] if record else "NOT_FOUND"
