from datetime import date

from app.services.registry_client import RegistryStatus
from app.services.revalidation_service import next_record_status, revalidate_record

PROG = {"approved_intake": 10, "supernumerary_quota": 1, "session_start": "2026-07-01", "session_end": "2026-10-31"}
GOOD = {"apaar_id": "900000000555", "student_institution_id": "S1", "full_name": "A B", "dob": "2008-01-01",
        "admission_date": "2026-08-01", "programme_id": "p", "academic_year": "2026-30", "category": "general"}


class FakeRegistry:
    def lookup(self, apaar_id):
        if not apaar_id or len(apaar_id) != 12:
            return RegistryStatus.INVALID
        return RegistryStatus.PENDING if apaar_id.endswith("000") else RegistryStatus.VALID


REG = FakeRegistry()


def codes(f):
    return {x["rule_code"] for x in f}


def test_clean_record_validated():
    f = revalidate_record(GOOD, PROG, REG, enrolled_count=5)
    assert f == [] and next_record_status(f) == "validated"


def test_correction_clears_findings():
    bad = {**GOOD, "apaar_id": "123", "admission_date": date(2025, 1, 1)}
    assert {"APAAR_FORMAT_INVALID", "DATE_INVALID"} <= codes(revalidate_record(bad, PROG, REG))
    fixed = {**bad, "apaar_id": "900000000555", "admission_date": "2026-08-02"}
    assert revalidate_record(fixed, PROG, REG) == []


def test_duplicate_is_review_and_flags():
    f = revalidate_record(GOOD, PROG, REG, other_active_institution_ids={"inst-2"})
    assert codes(f) == {"DUPLICATE_ACROSS_INSTITUTIONS"} and next_record_status(f) == "flagged"


def test_intake_category_incomplete_missing():
    f = revalidate_record({**GOOD, "is_nri": True, "full_name": "", "apaar_id": None}, PROG, REG,
                          enrolled_count=12, supernumerary_count=2)
    assert {"APAAR_MISSING", "INCOMPLETE_RECORD", "CATEGORY_CONFLICT", "INTAKE_EXCEEDED",
            "SUPERNUMERARY_EXCEEDED"} <= codes(f)


def test_pending_registry_is_warning_only():
    f = revalidate_record({**GOOD, "apaar_id": "900000000000"}, PROG, REG)
    assert f[0]["severity"] == "warning" and next_record_status(f) == "validated"
