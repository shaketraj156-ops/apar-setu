import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import CurrentUser, get_current_user

client = TestClient(app)

# Provide mock admin auth for integration tests
mock_user = CurrentUser(
    id=uuid.UUID("67501ed1-4a83-4a27-9a45-4270b06dea4f"),
    email="aicte@demo.test",
    role="aicte_officer",
    institution_id=None,
    full_name="Demo AICTE Officer"
)
app.dependency_overrides[get_current_user] = lambda: mock_user

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_kpis_report():
    res = client.get("/api/v1/reports/kpis")
    assert res.status_code == 200
    data = res.json()
    assert "students_recorded" in data
    assert data["students_recorded"] >= 80

def test_intake_report():
    res = client.get("/api/v1/reports/intake")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_duplicates_report():
    res = client.get("/api/v1/reports/duplicates")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_list_institutions():
    res = client.get("/api/v1/institutions")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 4

def test_list_students():
    res = client.get("/api/v1/students?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) == 5

def test_qr_generation_and_verification():
    # Fetch any student
    s_res = client.get("/api/v1/students?limit=1")
    assert s_res.status_code == 200
    student = s_res.json()["items"][0]
    
    # Generate QR
    qr_res = client.post("/api/v1/credentials/qr", json={"record_id": student["id"]})
    assert qr_res.status_code == 200
    qr_data = qr_res.json()
    assert "token" in qr_data
    assert "qr_code_data_uri" in qr_data
    assert qr_data["payload"]["student_institution_id"] == student["student_institution_id"]

    # Verify Token
    verify_res = client.get(f"/api/v1/verify/qr?t={qr_data['token']}")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["valid"] is True
    assert v_data["reason"] == "ok"
    assert v_data["payload"]["student_institution_id"] == student["student_institution_id"]
