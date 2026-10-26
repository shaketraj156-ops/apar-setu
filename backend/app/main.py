# File: backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.api.v1.router import api_router
from app.api.v1 import reports, consent, verification, audit

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="APAAR ID-Based Student Data Management and Verification Platform for AICTE",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list if settings.cors_origin_list else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

# Core Dev 2 REST API (Auth, Institutions, Programmes, Students, Uploads, Batches, Verify)
app.include_router(api_router, prefix="/api/v1")

# Additional reporting, consent, verification, and audit routes (Supabase-direct path)
app.include_router(reports.router, prefix="/api/v1")
app.include_router(consent.router, prefix="/api/v1")
app.include_router(verification.router, prefix="/api/v1")
# T5: Audit logs route — exposes append-only audit trail to AICTE officers and auditors
app.include_router(audit.router, prefix="/api/v1")


@app.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "env": settings.ENV,
        "version": "1.0.0"
    }
