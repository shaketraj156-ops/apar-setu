# File: backend/scripts/get_token.py
import sys
import httpx
from app.core.config import get_settings

settings = get_settings()


def fetch_token(email: str, password: str):
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json"
    }
    data = {"email": email, "password": password}
    
    resp = httpx.post(url, headers=headers, json=data)
    if resp.status_code != 200:
        print(f"Failed to get token: {resp.status_code} - {resp.text}")
        return
    tokens = resp.json()
    print("\n--- ACCESS TOKEN ---")
    print(tokens.get("access_token"))
    print("--------------------\n")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/get_token.py <email> <password>")
    else:
        fetch_token(sys.argv[1], sys.argv[2])
