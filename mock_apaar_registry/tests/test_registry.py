from app.registry import VALID_STATUSES, verify_apaar_id, _load


def test_known_ids_return_recorded_status():
    assert verify_apaar_id("111111111111") == "VALID"
    assert verify_apaar_id("222222222222") == "INVALID"
    assert verify_apaar_id("333333333333") == "PENDING"


def test_unknown_12_digit_is_not_found():
    assert verify_apaar_id("999999999999") == "NOT_FOUND"


def test_malformed_ids_are_invalid():
    for bad in ("", "123", "12345678901a", "1234567890123", None):
        assert verify_apaar_id(bad) == "INVALID"


def test_data_file_is_synthetic_and_well_formed():
    data = _load()
    assert len(data) > 3
    for apaar_id, rec in data.items():
        assert len(apaar_id) == 12 and apaar_id.isdigit()
        assert rec["status"] in VALID_STATUSES
