from app.services.validation.entities import BatchResult, FindingSeverity
from app.services.validation.context import ValidationContext
from app.services.validation.row_rules import (
    rule_01_apaar_format, rule_02_dob_and_age, rule_03_admission_date,
    rule_04_category_valid, rule_05_quota_consistency,
    rule_06_batch_duplicate_roll, rule_07_batch_duplicate_apaar, rule_08_database_duplicates
)
from app.services.validation.batch_rules import evaluate_batch_quotas

def validate_batch(rows: list[dict], ctx: ValidationContext) -> BatchResult:
    all_findings = []
    seen_rolls = {}
    seen_apaar = {}
    valid_rows_count = 0
    error_rows_set = set()
    warning_rows_set = set()
    review_rows_set = set()

    for idx, row in enumerate(rows, start=1):
        row_findings = []
        row_findings.extend(rule_01_apaar_format(row, idx))
        row_findings.extend(rule_02_dob_and_age(row, idx))
        row_findings.extend(rule_03_admission_date(row, idx))
        row_findings.extend(rule_04_category_valid(row, idx))
        row_findings.extend(rule_05_quota_consistency(row, idx))
        row_findings.extend(rule_06_batch_duplicate_roll(row, idx, seen_rolls))
        row_findings.extend(rule_07_batch_duplicate_apaar(row, idx, seen_apaar))
        row_findings.extend(rule_08_database_duplicates(row, idx, ctx))

        if row_findings:
            has_error = any(f.severity == FindingSeverity.ERROR for f in row_findings)
            has_warning = any(f.severity == FindingSeverity.WARNING for f in row_findings)
            has_review = any(f.severity == FindingSeverity.REVIEW for f in row_findings)
            if has_error: error_rows_set.add(idx)
            if has_warning: warning_rows_set.add(idx)
            if has_review: review_rows_set.add(idx)
            all_findings.extend(row_findings)
        else:
            valid_rows_count += 1

    batch_findings = evaluate_batch_quotas(ctx, rows)
    all_findings.extend(batch_findings)

    return BatchResult(
        total_rows=len(rows),
        valid_rows=valid_rows_count,
        error_rows=len(error_rows_set),
        warning_rows=len(warning_rows_set),
        review_rows=len(review_rows_set),
        findings=all_findings
    )
