"""Application configuration placeholder."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    APP_NAME: str = 'APAARSetu API'
    ENV: str = 'dev'
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_JWT_SECRET: str | None = None
    SUPABASE_JWT_AUDIENCE: str = 'authenticated'
    CORS_ORIGINS: str = 'http://localhost:5173'
    MAX_UPLOAD_MB: int = 5
    MAX_UPLOAD_ROWS: int = 20000
    USE_FAKE_REGISTRY: bool = True
    ALLOW_INSTITUTION_INTAKE_EDIT: bool = True
    SIGNING_SECRET: str = 'change-me'
    VERIFY_RATE_LIMIT_PER_MIN: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(',') if o.strip()]

    @property
    def supabase_issuer(self) -> str:
        return self.SUPABASE_URL.rstrip('/') + '/auth/v1'


@lru_cache
def get_settings() -> Settings:
    return Settings()
