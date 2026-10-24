import csv
import io
from app.core.config import get_settings
from app.core.errors import UnprocessableError, PayloadTooLargeError

settings = get_settings()

def parse_csv_stream(content: bytes) -> list[dict]:
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = content.decode("latin-1")
        except Exception:
            raise UnprocessableError("Unable to decode file. Please upload a UTF-8 encoded CSV.")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise UnprocessableError("CSV file is empty or missing headers")

    rows = []
    for idx, raw_row in enumerate(reader, start=1):
        if idx > settings.MAX_UPLOAD_ROWS:
            raise PayloadTooLargeError(f"Upload exceeds maximum permitted rows ({settings.MAX_UPLOAD_ROWS})")
        clean_row = {
            k.strip().lower().replace(" ", "_"): (v.strip() if v else None)
            for k, v in raw_row.items() if k
        }
        rows.append(clean_row)
    return rows
