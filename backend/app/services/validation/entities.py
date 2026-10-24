from dataclasses import dataclass, field
from typing import Any

class FindingSeverity:
    ERROR = "error"
    WARNING = "warning"
    REVIEW = "review"

@dataclass
class Finding:
    rule_code: str
    severity: str
    message: str
    row_number: int | None = None
    evidence: dict[str, Any] = field(default_factory=dict)
    recommended_action: str | None = None

@dataclass
class RowResult:
    row_number: int
    is_valid: bool
    findings: list[Finding] = field(default_factory=list)

@dataclass
class BatchResult:
    total_rows: int
    valid_rows: int
    error_rows: int
    warning_rows: int
    review_rows: int
    findings: list[Finding] = field(default_factory=list)
