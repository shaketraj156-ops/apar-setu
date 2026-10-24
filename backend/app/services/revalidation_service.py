"""Re-validation after a record is corrected (Step 6, Dev 3).

Pure rule evaluation + a persistence helper. Dev 2 calls `revalidate_record` from
PATCH /students/{id} and the batch resubmit endpoint, then `apply_findings`.
Rule codes match the project spec.
"""
from __future__ import annotations

import re
from datetime import date
from typing import Any

from .registry_client import RegistryClient, RegistryStatus

_APAAR_RE = re.compile(r"^\d{12}$")
MANDATORY = ("student_institution_id", "full_name", "dob", "admission_date", "programme_id", "academic_year")


def _f(rule, severity, message, evidence=None, action=None):
    return {"rule_code": rule, "severity": severity, "message": message,
            "evidence": evidence or {}, "recommended_action": action}


def revalidate_record(record: dict[str, Any], programme: dict[str, Any], registry: RegistryClient,
                      other_active_institution_ids: set[str] | None = None,
                      duplicate_in_institution: bool = False,
                      enrolled_count: int = 0, supernumerary_count: int = 0) -> list[dict]:
    """Return the findings that still apply to `record` after correction.

    other_active_institution_ids: institutions (other than this one) where the same APAAR is active.
    enrolled_count / supernumerary_count: current totals for the programme INCLUDING this record.
    """
    out: list[dict] = []
    apaar = record.get("apaar_id")

    if not apaar:
        out.append(_f("APAAR_MISSING", "error", "APAAR ID is not provided", action="Enter the 12-digit APAAR ID"))
    elif not _APAAR_RE.match(str(apaar)):
        out.append(_f("APAAR_FORMAT_INVALID", "error", "APAAR ID is not exactly 12 digits",
                      {"length": len(str(apaar))}, "Correct the APAAR ID"))
    else:
        st = registry.lookup(apaar)
        if st != RegistryStatus.VALID:
            out.append(_f("APAAR_NOT_VERIFIED", "warning" if st == RegistryStatus.PENDING else "error",
                          f"APAAR registry returned {st.value}", {"registry_status": st.value},
                          "Ask the student to re-check the APAAR ID in DigiLocker"))
        if other_active_institution_ids:
            out.append(_f("DUPLICATE_ACROSS_INSTITUTIONS", "review",
                          "Same APAAR ID is active in another institution",
                          {"other_institution_ids": sorted(other_active_institution_ids)},
                          "AICTE review required to confirm the genuine enrolment"))
        if duplicate_in_institution:
            out.append(_f("DUPLICATE_IN_INSTITUTION", "error",
                          "Same APAAR ID already active in this programme/year", action="Remove or merge the duplicate"))

    missing = [k for k in MANDATORY if not record.get(k)]
    if missing:
        out.append(_f("INCOMPLETE_RECORD", "error", "Mandatory fields are missing", {"missing": missing},
                      "Fill in the missing fields"))

    adm = record.get("admission_date")
    if adm:
        d = date.fromisoformat(adm) if isinstance(adm, str) else adm
        ss, se = programme["session_start"], programme["session_end"]
        ss = date.fromisoformat(ss) if isinstance(ss, str) else ss
        se = date.fromisoformat(se) if isinstance(se, str) else se
        if not (ss <= d <= se):
            out.append(_f("DATE_INVALID", "error", "Admission date is outside the academic session",
                          {"admission_date": str(d), "session": [str(ss), str(se)]}, "Correct the admission date"))

    cat = record.get("category")
    if (record.get("is_nri") and cat != "nri") or (record.get("is_oci") and cat != "oci") or \
       (record.get("is_foreign_national") and cat != "foreign_national"):
        out.append(_f("CATEGORY_CONFLICT", "warning", "NRI/OCI/FN status conflicts with admission category",
                      {"category": cat}, "Correct the category or the status flag"))

    cap = programme["approved_intake"] + programme["supernumerary_quota"]
    if enrolled_count > cap:
        out.append(_f("INTAKE_EXCEEDED", "error", "Admissions exceed approved intake plus supernumerary quota",
                      {"approved_intake": programme["approved_intake"], "supernumerary_quota": programme["supernumerary_quota"],
                       "enrolled": enrolled_count}, "Review excess admissions"))
    if supernumerary_count > programme["supernumerary_quota"]:
        out.append(_f("SUPERNUMERARY_EXCEEDED", "error", "Supernumerary admissions exceed quota",
                      {"quota": programme["supernumerary_quota"], "actual": supernumerary_count}, "Review supernumerary admissions"))
    return out


def next_record_status(findings: list[dict]) -> str:
    """flagged if any error/review remains, otherwise validated."""
    return "flagged" if any(f["severity"] in ("error", "review") for f in findings) else "validated"


def apply_findings(client, batch_id: str, record_id: str, findings: list[dict], row_number: int | None = None) -> str:
    """Replace unresolved findings for a record and update its record_status (supabase-py, service role)."""
    client.table("validation_findings").delete().eq("record_id", record_id).eq("is_resolved", False).execute()
    if findings:
        client.table("validation_findings").insert(
            [{**f, "batch_id": batch_id, "record_id": record_id, "row_number": row_number} for f in findings]).execute()
    status = next_record_status(findings)
    client.table("student_records").update({"record_status": status}).eq("id", record_id).execute()
    return status
