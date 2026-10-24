from fastapi import FastAPI

from app.registry import verify_apaar_id

app = FastAPI(title="Synthetic APAAR Registry", version="0.1.0")


@app.get("/verify/{apaar_id}")
def verify(apaar_id: str):
    return {"apaar_id": apaar_id, "status": verify_apaar_id(apaar_id)}
