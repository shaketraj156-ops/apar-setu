from supabase import create_client, Client
from app.core.config import settings

_admin_client: Client | None = None

def get_supabase_admin_client() -> Client:
    """Returns a singleton Supabase client authenticated with service_role key."""
    global _admin_client
    if _admin_client is None:
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY or settings.SUPABASE_PUBLISHABLE_KEY or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key"
        _admin_client = create_client(settings.SUPABASE_URL, key)
    return _admin_client

def get_supabase_client(access_token: str | None = None) -> Client:
    """Returns a client for authenticated or anonymous requests."""
    key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_PUBLISHABLE_KEY or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key"
    client = create_client(settings.SUPABASE_URL, key)
    if access_token:
        client.postgrest.auth(access_token)
    return client
