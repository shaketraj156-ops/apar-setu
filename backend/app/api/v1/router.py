from fastapi import APIRouter
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.institutions import router as institutions_router
from app.api.v1.routes.programmes import router as programmes_router
from app.api.v1.routes.students import router as students_router
from app.api.v1.routes.uploads import router as uploads_router
from app.api.v1.routes.batches import router as batches_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth")
api_router.include_router(institutions_router, prefix="/institutions", tags=["institutions"])
api_router.include_router(programmes_router, prefix="/programmes", tags=["programmes"])
api_router.include_router(students_router, prefix="/students", tags=["students"])
api_router.include_router(uploads_router, prefix="/uploads", tags=["uploads"])
api_router.include_router(batches_router, prefix="/batches", tags=["batches"])
