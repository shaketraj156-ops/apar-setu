from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import (
    reports,
    students,
    batches,
    consent,
    verification,
    institutions,
    programmes
)

app = FastAPI(
    title="APAARSetu API",
    description="APAAR ID-Based Student Data Management and Verification Platform for AICTE",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(reports.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(batches.router, prefix="/api/v1")
app.include_router(consent.router, prefix="/api/v1")
app.include_router(verification.router, prefix="/api/v1")
app.include_router(institutions.router, prefix="/api/v1")
app.include_router(programmes.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "APAARSetu Backend",
        "version": "1.0.0"
    }
