from app.services.validation.entities import Finding, FindingSeverity
from app.services.validation.context import ValidationContext

def evaluate_batch_quotas(ctx: ValidationContext, rows: list[dict]) -> list[Finding]:
    findings = []
    regular_count = 0
    supernumerary_count = 0
    nri_count = 0
    for r in rows:
        if r.get("is_supernumerary"):
            supernumerary_count += 1
        elif r.get("is_nri"):
            nri_count += 1
        else:
            regular_count += 1

    total_regular = ctx.enrolled_count + regular_count
    if total_regular > ctx.approved_intake:
        excess = total_regular - ctx.approved_intake
        findings.append(Finding(
            rule_code="B01_APPROVED_INTAKE_EXCEEDED",
            severity=FindingSeverity.ERROR,
            message=f"Total regular admissions ({total_regular}) exceeds approved AICTE intake ({ctx.approved_intake}) by {excess} seats",
            evidence={"approved_intake": ctx.approved_intake, "total": total_regular, "excess": excess},
            recommended_action="Reduce admissions or request intake expansion from AICTE"
        ))
    if (ctx.supernumerary_count + supernumerary_count) > ctx.supernumerary_quota:
        findings.append(Finding(
            rule_code="B02_SUPERNUMERARY_EXCEEDED",
            severity=FindingSeverity.ERROR,
            message=f"Supernumerary quota ({ctx.supernumerary_quota}) exceeded by {supernumerary_count} seats",
            evidence={"quota": ctx.supernumerary_quota, "actual": supernumerary_count}
        ))
    if (ctx.nri_count + nri_count) > ctx.nri_quota:
        findings.append(Finding(
            rule_code="B03_NRI_QUOTA_EXCEEDED",
            severity=FindingSeverity.WARNING,
            message=f"NRI quota ceiling ({ctx.nri_quota}) exceeded",
            evidence={"quota": ctx.nri_quota, "actual": nri_count}
        ))
    return findings
