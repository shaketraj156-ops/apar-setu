"""Print the production secrets to paste into the Render dashboard.

Run from the backend folder with the venv active:
    python scripts/generate_prod_keys.py

Nothing is written to disk. Keep the output private (do NOT commit it).
"""
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.qr_credentials import generate_keypair  # noqa: E402

priv, pub = generate_keypair()
one_line = lambda pem: pem.strip().replace("\n", "\n")

print("# Paste these into Render -> Environment (QR keys use literal \n, which the app converts back)\n")
print("QR_PRIVATE_KEY_PEM=" + one_line(priv))
print("QR_PUBLIC_KEY_PEM=" + one_line(pub))
print()
print("# Optional: Render generates JWT_SECRET / SIGNING_SECRET for you; use these if setting manually")
print("JWT_SECRET=" + secrets.token_urlsafe(48))
print("SIGNING_SECRET=" + secrets.token_urlsafe(48))
