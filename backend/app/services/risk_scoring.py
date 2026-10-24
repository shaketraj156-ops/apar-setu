"""Explainable risk / anomaly score.

Risk = 0.30*duplicate + 0.25*intake + 0.20*data_quality + 0.15*category + 0.10*behavioural
Each component is 0..100. Every result carries an explanation (what, why, evidence, action).
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict

WEIGHTS = {"duplicate": 0.30, "intake": 0.25, "data_quality": 0.20, "category": 0.15, "behavioural": 0.10}


@dataclass
class RiskInput:
    entity: str                       # institution name / record id
    total_records: int = 0
    duplicate_records: int = 0        # records whose APAAR is active elsewhere / repeated
    approved_intake: int = 0
    supernumerary_quota: int = 0
    total_enrolled: int = 0
    error_records: int = 0
    warning_records: int = 0
    category_conflicts: int = 0       # NRI/OCI/FN vs category conflicts + quota overshoots
    resubmissions: int = 0            # batches re-uploaded after correction
    late_admissions: int = 0          # admissions outside session / backdated


@dataclass
class RiskResult:
    entity: str
    score: float
    level: str
    components: dict[str, float]
    explanations: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def _pct(n: float, d: float) -> float:
    return 0.0 if d <= 0 else min(100.0, 100.0 * n / d)


def level_for(score: float) -> str:
    if score >= 70:
        return "CRITICAL"
    if score >= 45:
        return "HIGH"
    if score >= 20:
        return "MEDIUM"
    return "LOW"


def compute_risk(x: RiskInput) -> RiskResult:
    cap = x.approved_intake + x.supernumerary_quota
    over = max(0, x.total_enrolled - cap)
    comps = {
        "duplicate": _pct(x.duplicate_records, x.total_records) * 4,            # amplified: duplicates are serious
        "intake": _pct(over, cap) * 5 if cap else 0.0,                           # 20% over cap => 100
        "data_quality": _pct(x.error_records + 0.5 * x.warning_records, x.total_records),
        "category": _pct(x.category_conflicts, x.total_records) * 3,
        "behavioural": min(100.0, x.resubmissions * 20 + _pct(x.late_admissions, x.total_records) * 2),
    }
    comps = {k: round(min(100.0, v), 1) for k, v in comps.items()}
    score = round(sum(WEIGHTS[k] * v for k, v in comps.items()), 1)

    ex = []
    if comps["duplicate"] > 0:
        ex.append({"component": "duplicate", "what": f"{x.duplicate_records} duplicate-enrolment record(s)",
                   "why": "Same APAAR ID appears more than once or in multiple institutions",
                   "evidence": {"duplicate_records": x.duplicate_records, "total_records": x.total_records},
                   "action": "Open the duplicate investigation queue and confirm the genuine enrolment"})
    if over > 0:
        ex.append({"component": "intake", "what": f"{over} admission(s) above permitted capacity",
                   "why": "Actual enrolment exceeds approved intake plus supernumerary quota",
                   "evidence": {"approved_intake": x.approved_intake, "supernumerary_quota": x.supernumerary_quota,
                                "total_enrolled": x.total_enrolled},
                   "action": "Request justification from the institution and review sanctioned intake"})
    if comps["data_quality"] > 0:
        ex.append({"component": "data_quality", "what": f"{x.error_records} error and {x.warning_records} warning record(s)",
                   "why": "Validation rules failed on submitted records",
                   "evidence": {"error_records": x.error_records, "warning_records": x.warning_records},
                   "action": "Ask the institution to correct and resubmit flagged rows"})
    if comps["category"] > 0:
        ex.append({"component": "category", "what": f"{x.category_conflicts} category/quota conflict(s)",
                   "why": "NRI/OCI/FN status conflicts with admission category or quota",
                   "evidence": {"category_conflicts": x.category_conflicts},
                   "action": "Verify supporting documents for the flagged admissions"})
    if comps["behavioural"] > 0:
        ex.append({"component": "behavioural", "what": "Unusual submission behaviour",
                   "why": "Repeated resubmissions and/or backdated admissions",
                   "evidence": {"resubmissions": x.resubmissions, "late_admissions": x.late_admissions},
                   "action": "Review the batch history and audit trail for this institution"})
    return RiskResult(x.entity, score, level_for(score), comps, ex)
