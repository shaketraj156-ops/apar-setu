# File: backend/app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.institutions import router as institutions_router
from app.api.v1.routes.programmes import router as programmes_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth")
api_router.include_router(institutions_router, prefix="/institutions", tags=["institutions"])
api_router.include_router(programmes_router, prefix="/programmes", tags=["programmes"])
