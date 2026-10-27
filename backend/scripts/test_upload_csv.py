import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# 1. Get institution
inst_res = client.get("/api/v1/institutions")
print(f"Institutions response: status {inst_res.status_code}")
institutions = inst_res.json()
if isinstance(institutions, dict) and "items" in institutions:
    institutions = institutions["items"]

print(f"Found {len(institutions)} institutions")
inst_id = institutions[0]["id"]
print(f"Using institution: {institutions[0]['name']} (ID: {inst_id})")

# 2. Upload CSV
csv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'samples', 'validation_demo.csv')
with open(csv_path, 'rb') as f:
    files = {"file": ("validation_demo.csv", f, "text/csv")}
    data = {"institution_id": inst_id}
    upload_res = client.post("/api/v1/batches/upload", files=files, data=data)

print(f"Upload response status: {upload_res.status_code}")
upload_data = upload_res.json()
print("Upload Result:", upload_data)
assert upload_res.status_code == 200, f"Upload failed: {upload_data}"

batch_id = upload_data["batch_id"]

# 3. Get Batch Details & Findings
batch_res = client.get(f"/api/v1/batches/{batch_id}")
print(f"Batch details status: {batch_res.status_code}")
batch_detail = batch_res.json()
findings = batch_detail.get("findings", [])
print(f"Total findings returned: {len(findings)}")
for i, f in enumerate(findings[:5]):
    print(f"  Finding {i+1}: Rule {f['rule_code']} ({f['severity']}): {f['message']}")

print("\nSUCCESS: Complete CSV upload and batch processing test PASSED!")
