# File: backend/app/core/config.py
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = Path(__file__).resolve().parents[2] / ".env"
root_env_path = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(env_path), str(root_env_path), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "SNAP API"
    ENV: str = "dev"
    DATABASE_URL: str = ""
    SUPABASE_URL: str = "https://bxsiwlxjjgjnoxuxegah.supabase.co"
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str | None = None
    SUPABASE_JWT_AUDIENCE: str = "authenticated"
    JWT_SECRET: str = "apar_setu_secret_jwt_key_2026_dev"
    FASTAPI_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173"
    MAX_UPLOAD_MB: int = 5
    MAX_UPLOAD_ROWS: int = 20000
    USE_FAKE_REGISTRY: bool = True
    MOCK_APAAR_REGISTRY_URL: str = "http://localhost:8001"
    ALLOW_INSTITUTION_INTAKE_EDIT: bool = True
    REQUIRE_CONSENT_FOR_VERIFIER: bool = True
    SIGNING_SECRET: str = "change-me"
    VERIFY_RATE_LIMIT_PER_MIN: int = 30
    QR_PRIVATE_KEY_PEM: str = ""
    QR_PUBLIC_KEY_PEM: str = ""
    QR_BASE_URL: str = "http://localhost:5173/verify?t="

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def supabase_issuer(self) -> str:
        return self.SUPABASE_URL.rstrip("/") + "/auth/v1"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.QR_PRIVATE_KEY_PEM and "\\n" in s.QR_PRIVATE_KEY_PEM:
        s.QR_PRIVATE_KEY_PEM = s.QR_PRIVATE_KEY_PEM.replace("\\n", "\n").strip('"')
    if s.QR_PUBLIC_KEY_PEM and "\\n" in s.QR_PUBLIC_KEY_PEM:
        s.QR_PUBLIC_KEY_PEM = s.QR_PUBLIC_KEY_PEM.replace("\\n", "\n").strip('"')
    return s


settings = get_settings()
