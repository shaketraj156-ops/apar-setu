import json
from pathlib import Path

DATA_FILE = Path(__file__).parent / "data" / "synthetic_apaar_records.json"


def verify_apaar_id(apaar_id: str) -> str:
    records = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    record = records.get(apaar_id)
    return record["status"] if record else "NOT_FOUND"
