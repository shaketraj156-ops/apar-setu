# File: backend/scripts/get_token.py
"""Utility script to fetch a JWT token for a given user.
It contacts the local FastAPI authentication endpoint (http://localhost:8000/api/v1/auth/login).
This works for the demo users defined in the README.
"""
import sys
import os
import json
import httpx

# Base URL of the backend; can be overridden via environment variable.
BASE_URL = os.getenv("APP_BACKEND_URL", "http://localhost:8000")
LOGIN_ENDPOINT = f"{BASE_URL}/api/v1/auth/login"

def fetch_token(email: str, password: str) -> None:
    """Request a JWT token from the local backend and print it.
    Args:
        email: User email address.
        password: Plain‑text password.
    """
    payload = {"email": email, "password": password}
    try:
        resp = httpx.post(LOGIN_ENDPOINT, json=payload, timeout=10)
    except Exception as exc:
        print(f"Failed to reach {LOGIN_ENDPOINT}: {exc}")
        return
    if resp.status_code != 200:
        print(f"Login failed ({resp.status_code}): {resp.text}")
        return
    data = resp.json()
    token = data.get("access_token") or data.get("token")
    if not token:
        print("Token not found in response:", data)
        return
    print("\n--- ACCESS TOKEN ---")
    print(token)
    print("--------------------\n")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/get_token.py <email> <password>")
    else:
        fetch_token(sys.argv[1], sys.argv[2])
