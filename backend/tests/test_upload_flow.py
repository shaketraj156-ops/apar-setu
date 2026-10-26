import uuid
import pytest
from app.services.csv_parser import parse_csv_stream
from app.services.validation.context import ValidationContext
from app.services.validation.engine import validate_batch
from app.api.deps import CurrentUser, check_institution_access
from app.core.errors import ForbiddenError

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

def test_college_isolation_forbidden():
    college_a_id = uuid.uuid4()
    college_b_id = uuid.uuid4()

    user_college_b = CurrentUser(
        id=uuid.uuid4(),
        email="admin@collegeb.edu",
        full_name="College Admin B",
        role="institution_admin",
        institution_id=college_b_id
    )

    # College B admin attempting to access College A resource must be blocked
    with pytest.raises(ForbiddenError):
        check_institution_access(user_college_b, college_a_id)

    # College B admin accessing College B resource must pass without error
    check_institution_access(user_college_b, college_b_id)

def test_aicte_officer_pan_india_access():
    college_a_id = uuid.uuid4()

    aicte_user = CurrentUser(
        id=uuid.uuid4(),
        email="officer@aicte.gov.in",
        full_name="AICTE Officer",
        role="aicte_officer",
        institution_id=None
    )

    # AICTE officer can access any college without error
    check_institution_access(aicte_user, college_a_id)
