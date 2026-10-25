import re
from datetime import date, datetime
from app.services.validation.entities import Finding, FindingSeverity
from app.services.validation.context import ValidationContext

VALID_CATEGORIES = {"general", "obc", "sc", "st", "ews", "management", "nri", "oci", "foreign_national"}

def rule_01_apaar_format(row: dict, row_num: int) -> list[Finding]:
    apaar_id = str(row.get("apaar_id") or "").strip()
    if not apaar_id:
        return [Finding("INCOMPLETE_RECORD", FindingSeverity.ERROR, "APAAR ID is missing", row_num)]
    if not re.fullmatch(r"^\d{12}$", apaar_id):
        return [Finding("R01_APAAR_INVALID_FORMAT", FindingSeverity.ERROR, f"APAAR ID '{apaar_id}' must be exactly 12 numeric digits", row_num, {"value": apaar_id})]
    return []

def rule_02_dob_and_age(row: dict, row_num: int) -> list[Finding]:
    dob_val = row.get("dob")
    if not dob_val:
        return [Finding("INCOMPLETE_RECORD", FindingSeverity.ERROR, "Date of Birth is missing", row_num)]
    if isinstance(dob_val, str):
        try:
            dob_val = datetime.strptime(dob_val.strip(), "%Y-%m-%d").date()
        except ValueError:
            return [Finding("DATE_INVALID", FindingSeverity.ERROR, f"DOB '{dob_val}' must be in YYYY-MM-DD format", row_num)]
    today = date.today()
    age = today.year - dob_val.year - ((today.month, today.day) < (dob_val.month, dob_val.day))
    if age < 15 or age > 60:
        return [Finding("R02_AGE_OUT_OF_BOUNDS", FindingSeverity.ERROR, f"Student age {age} is outside eligible admission bounds (15-60)", row_num, {"age": age})]
    return []

def rule_03_admission_date(row: dict, row_num: int) -> list[Finding]:
    adm_val = row.get("admission_date")
    dob_val = row.get("dob")
    if not adm_val:
        return [Finding("INCOMPLETE_RECORD", FindingSeverity.ERROR, "Admission date is missing", row_num)]
    try:
        adm_date = datetime.strptime(adm_val.strip(), "%Y-%m-%d").date() if isinstance(adm_val, str) else adm_val
        dob_date = datetime.strptime(dob_val.strip(), "%Y-%m-%d").date() if isinstance(dob_val, str) else dob_val
        if dob_date and adm_date <= dob_date:
            return [Finding("DATE_INVALID", FindingSeverity.ERROR, "Admission date cannot be earlier than or same as Date of Birth", row_num)]
    except Exception:
        pass
    return []

def rule_04_category_valid(row: dict, row_num: int) -> list[Finding]:
    cat = str(row.get("category") or "general").strip().lower()
    if cat not in VALID_CATEGORIES:
        return [Finding("R04_CATEGORY_UNKNOWN", FindingSeverity.ERROR, f"Invalid admission category '{cat}'", row_num, {"category": cat})]
    return []

def rule_05_quota_consistency(row: dict, row_num: int) -> list[Finding]:
    cat = str(row.get("category") or "").strip().lower()
    is_nri = bool(row.get("is_nri"))
    is_oci = bool(row.get("is_oci"))
    is_fn = bool(row.get("is_foreign_national"))
    if is_nri and cat != "nri":
        return [Finding("CATEGORY_CONFLICT", FindingSeverity.WARNING, "Record marked as NRI but category is not 'nri'", row_num)]
    if (is_oci or is_fn) and cat not in ["oci", "foreign_national"]:
        return [Finding("CATEGORY_CONFLICT", FindingSeverity.WARNING, "International quota flag marked without corresponding category", row_num)]
    return []

def rule_06_batch_duplicate_roll(row: dict, row_num: int, seen_rolls: dict[str, int]) -> list[Finding]:
    roll = str(row.get("student_institution_id") or "").strip()
    if not roll:
        return [Finding("INCOMPLETE_RECORD", FindingSeverity.ERROR, "Student roll number is missing", row_num)]
    if roll in seen_rolls:
        return [Finding("R06_DUPLICATE_ROLL_BATCH", FindingSeverity.ERROR, f"Duplicate roll number '{roll}' found in row {seen_rolls[roll]} and {row_num}", row_num, {"roll": roll})]
    seen_rolls[roll] = row_num
    return []

def rule_07_batch_duplicate_apaar(row: dict, row_num: int, seen_apaar: dict[str, int]) -> list[Finding]:
    apaar = str(row.get("apaar_id") or "").strip()
    if apaar:
        if apaar in seen_apaar:
            return [Finding("R07_DUPLICATE_APAAR_BATCH", FindingSeverity.ERROR, f"Duplicate APAAR ID '{apaar}' found in row {seen_apaar[apaar]} and {row_num}", row_num, {"apaar_id": apaar})]
        seen_apaar[apaar] = row_num
    return []

def rule_08_database_duplicates(row: dict, row_num: int, ctx: ValidationContext) -> list[Finding]:
    findings = []
    roll = str(row.get("student_institution_id") or "").strip()
    apaar = str(row.get("apaar_id") or "").strip()
    if roll and roll in ctx.existing_roll_numbers:
        findings.append(Finding("R08_ROLL_ALREADY_EXISTS", FindingSeverity.ERROR, f"Roll number '{roll}' is already registered in this programme and year", row_num))
    if apaar and apaar in ctx.existing_apaar_ids:
        findings.append(Finding("DUPLICATE_ACROSS_INSTITUTIONS", FindingSeverity.ERROR, f"APAAR ID '{apaar}' is already actively enrolled in an AICTE institution", row_num, {"apaar_id": apaar}))
    return findings
