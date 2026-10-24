import uuid
from app.services.validation.context import ValidationContext
from app.services.validation.row_rules import (
    rule_01_apaar_format,
    rule_02_dob_and_age,
    rule_04_category_valid,
    rule_06_batch_duplicate_roll,
    rule_07_batch_duplicate_apaar
)
from app.services.validation.batch_rules import evaluate_batch_quotas

def test_rule_01_valid_apaar():
    findings = rule_01_apaar_format({"apaar_id": "123456789012"}, 1)
    assert len(findings) == 0

def test_rule_01_invalid_apaar():
    findings = rule_01_apaar_format({"apaar_id": "12345"}, 1)
    assert len(findings) == 1
    assert findings[0].rule_code == "R01_APAAR_INVALID_FORMAT"

def test_rule_02_valid_age():
    findings = rule_02_dob_and_age({"dob": "2004-05-15"}, 1)
    assert len(findings) == 0

def test_rule_02_underage():
    findings = rule_02_dob_and_age({"dob": "2020-01-01"}, 1)
    assert len(findings) == 1
    assert findings[0].rule_code == "R02_AGE_OUT_OF_BOUNDS"

def test_rule_04_valid_category():
    findings = rule_04_category_valid({"category": "general"}, 1)
    assert len(findings) == 0

def test_rule_04_invalid_category():
    findings = rule_04_category_valid({"category": "unknown_cat"}, 1)
    assert len(findings) == 1
    assert findings[0].rule_code == "R04_CATEGORY_UNKNOWN"

def test_rule_06_duplicate_roll():
    seen = {}
    f1 = rule_06_batch_duplicate_roll({"student_institution_id": "ROLL-1"}, 1, seen)
    f2 = rule_06_batch_duplicate_roll({"student_institution_id": "ROLL-1"}, 2, seen)
    assert len(f1) == 0
    assert len(f2) == 1
    assert f2[0].rule_code == "R06_DUPLICATE_ROLL_BATCH"

def test_batch_quota_intake_exceeded():
    ctx = ValidationContext(
        institution_id=uuid.uuid4(),
        programme_id=uuid.uuid4(),
        academic_year="2026-30",
        approved_intake=2,
        supernumerary_quota=0,
        nri_quota=0,
        oci_quota=0,
        fn_quota=0,
        enrolled_count=0
    )
    rows = [{"category": "general"} for _ in range(5)]
    findings = evaluate_batch_quotas(ctx, rows)
    assert any(f.rule_code == "B01_APPROVED_INTAKE_EXCEEDED" for f in findings)
