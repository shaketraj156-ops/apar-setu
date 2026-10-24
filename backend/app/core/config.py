import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Load .env file explicitly if not loaded
env_path = Path(__file__).resolve().parents[2] / ".env"
root_env_path = Path(__file__).resolve().parents[3] / ".env"

class Settings(BaseSettings):
    SUPABASE_URL: str = "https://bxsiwlxjjgjnoxuxegah.supabase.co"
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    FASTAPI_PORT: int = 8000
    JWT_SECRET: str = "apar_setu_secret_jwt_key_2026_dev"
    MOCK_APAAR_REGISTRY_URL: str = "http://localhost:8001"
    QR_PRIVATE_KEY_PEM: str = ""
    QR_PUBLIC_KEY_PEM: str = ""
    QR_BASE_URL: str = "http://localhost:5173/verify?t="

    class Config:
        env_file = (str(env_path), str(root_env_path))
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

# Clean up escaped newlines in PEM keys if needed
if settings.QR_PRIVATE_KEY_PEM and "\\n" in settings.QR_PRIVATE_KEY_PEM:
    settings.QR_PRIVATE_KEY_PEM = settings.QR_PRIVATE_KEY_PEM.replace("\\n", "\n").strip('"')
if settings.QR_PUBLIC_KEY_PEM and "\\n" in settings.QR_PUBLIC_KEY_PEM:
    settings.QR_PUBLIC_KEY_PEM = settings.QR_PUBLIC_KEY_PEM.replace("\\n", "\n").strip('"')
