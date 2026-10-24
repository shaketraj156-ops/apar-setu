from app.core.masking import mask_apaar_id, hash_apaar_id
from app.core.signing import sign_payload, verify_signature

def test_mask_apaar_id_standard():
    masked = mask_apaar_id("123456784821")
    assert masked == "********4821"
    assert len(masked) == 12

def test_mask_apaar_id_empty():
    assert mask_apaar_id(None) == "************"
    assert mask_apaar_id("") == "************"

def test_hash_apaar_id_deterministic():
    h1 = hash_apaar_id("123456784821")
    h2 = hash_apaar_id("123456784821")
    assert h1 == h2
    assert len(h1) == 64

def test_signature_verification_success():
    data = {"status": "ACTIVE", "student_id": "STU-01", "academic_year": "2026-30"}
    sig = sign_payload(data)
    assert sig.startswith("sha256:")
    assert verify_signature(data, sig) is True

def test_signature_tamper_detection():
    data = {"status": "ACTIVE", "student_id": "STU-01"}
    sig = sign_payload(data)
    tampered_data = {"status": "ACTIVE", "student_id": "STU-01", "hacked": True}
    assert verify_signature(tampered_data, sig) is False
