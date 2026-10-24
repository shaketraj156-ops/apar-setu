from datetime import datetime, timedelta, timezone

import pytest

from app.services import consent_service as cs
from app.services.export_service import export_csv, export_excel, export_pdf
from app.services.qr_credentials import (build_payload, generate_keypair, mask_apaar, qr_png,
                                          sign_credential, verify_credential)
from app.services.risk_scoring import RiskInput, compute_risk


# ── risk ──
def test_risk_clean_is_low():
    res = compute_risk(RiskInput("A", total_records=100, approved_intake=100, total_enrolled=90))
    assert res.score == 0 and res.level == "LOW" and res.explanations == []


def test_risk_bad_institution_is_explained():
    res = compute_risk(RiskInput("B", total_records=100, duplicate_records=10, approved_intake=80,
                                 supernumerary_quota=5, total_enrolled=100, error_records=30,
                                 category_conflicts=8, resubmissions=3, late_admissions=5))
    assert res.level in ("HIGH", "CRITICAL")
    assert {e["component"] for e in res.explanations} >= {"duplicate", "intake", "data_quality"}
    assert all({"what", "why", "evidence", "action"} <= set(e) for e in res.explanations)
    assert 0 <= res.score <= 100


# ── consent ──
def _consent():
    now = datetime(2026, 10, 24, tzinfo=timezone.utc)
    return cs.create_request("c1", "stu", "ver", "rec", now=now), now


def test_consent_happy_and_revoke():
    c, now = _consent()
    cs.transition(c, cs.GRANTED, "stu", now)
    assert cs.is_verification_allowed(c, "ver", now)
    cs.transition(c, cs.REVOKED, "stu", now)
    assert not cs.is_verification_allowed(c, "ver", now)


def test_consent_only_student_decides_and_no_reuse():
    c, now = _consent()
    with pytest.raises(cs.ConsentError):
        cs.transition(c, cs.GRANTED, "ver", now)
    cs.transition(c, cs.REJECTED, "stu", now)
    with pytest.raises(cs.ConsentError):
        cs.transition(c, cs.GRANTED, "stu", now)


def test_consent_expiry():
    c, now = _consent()
    cs.transition(c, cs.GRANTED, "stu", now)
    later = now + timedelta(days=31)
    assert cs.effective_status(c, later) == cs.EXPIRED
    assert not cs.is_verification_allowed(c, "ver", later)


def test_consent_rejects_sensitive_scope():
    with pytest.raises(cs.ConsentError):
        cs.create_request("c", "s", "v", "r", scope=("institution", "marks"))


# ── QR ──
REC = {"apaar_id": "900000004821", "student_institution_id": "CSE2026001", "institution": "Example Institute",
       "programme": "B.Tech CS", "academic_year": "2026-30", "status": "ACTIVE"}


def test_mask():
    assert mask_apaar("900000004821") == "********4821"


def test_qr_sign_verify_and_tamper():
    priv, pub = generate_keypair()
    token = sign_credential(build_payload(REC), priv)
    out = verify_credential(token, pub)
    assert out["valid"] and out["payload"]["apaar_id_masked"] == "********4821"
    assert "900000004821" not in token and "900000004821" not in str(out["payload"])
    h, b, s = token.split(".")
    assert not verify_credential(f"{h}.{b[:-2]}xx.{s}", pub)["valid"]
    _, other_pub = generate_keypair()
    assert not verify_credential(token, other_pub)["valid"]


def test_qr_expiry_and_minimal_payload():
    priv, pub = generate_keypair()
    token = sign_credential(build_payload(REC, ttl_seconds=10), priv)
    assert verify_credential(token, pub, now=10**11)["reason"] == "expired"
    bad = build_payload(REC); bad["marks"] = 99
    with pytest.raises(ValueError):
        sign_credential(bad, priv)


def test_qr_png_bytes():
    priv, _ = generate_keypair()
    assert qr_png(sign_credential(build_payload(REC), priv))[:4] == b"\x89PNG"


# ── exports ──
ROWS = [{"institution": "A", "state": "MP", "enrolled": 10, "institutions": ["x", "y"], "created": "2026-08-01"},
        {"institution": "B", "state": "MH", "enrolled": 5, "institutions": ["z"], "created": "2026-10-01"}]


def test_exports():
    assert b"institution" in export_csv(ROWS)
    assert b"MH" not in export_csv(ROWS, filters={"state": "MP"})
    assert b"B" not in export_csv(ROWS, date_field="created", date_to=datetime(2026, 9, 1).date()).split(b"\n", 1)[1]
    assert export_excel(ROWS)[:2] == b"PK"
    assert export_pdf(ROWS)[:4] == b"%PDF"
    assert export_pdf([])[:4] == b"%PDF"
