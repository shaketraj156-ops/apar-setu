import uuid
from app.services.csv_parser import parse_csv_stream
from app.services.validation.context import ValidationContext
from app.services.validation.engine import validate_batch

def test_csv_parser_valid_stream():
    csv_bytes = b"full_name,student_institution_id,dob,admission_date,apaar_id,category\nAnkit Patel,CS-101,2004-06-12,2026-08-01,123456789012,general"
    rows = parse_csv_stream(csv_bytes)
    assert len(rows) == 1
    assert rows[0]["full_name"] == "Ankit Patel"
    assert rows[0]["student_institution_id"] == "CS-101"

def test_validation_engine_full_run():
    rows = [
        {"full_name": "Valid Student", "student_institution_id": "R-1", "dob": "2004-01-01", "admission_date": "2026-08-01", "apaar_id": "111122223333", "category": "general"},
        {"full_name": "Invalid Student", "student_institution_id": "R-2", "dob": "2022-01-01", "admission_date": "2026-08-01", "apaar_id": "000", "category": "invalid"}
    ]
    ctx = ValidationContext(
        institution_id=uuid.uuid4(),
        programme_id=uuid.uuid4(),
        academic_year="2026-30",
        approved_intake=60,
        supernumerary_quota=6,
        nri_quota=3,
        oci_quota=0,
        fn_quota=0
    )
    result = validate_batch(rows, ctx)
    assert result.total_rows == 2
    assert result.valid_rows == 1
    assert result.error_rows == 1
    assert len(result.findings) >= 2
