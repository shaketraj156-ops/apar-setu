"""Signed, tamper-evident QR credentials (Ed25519 JWT, minimum disclosure).

Payload carries ONLY: verification_id, masked APAAR, student institution id, institution, programme,
academic year, status, consent. Never Aadhaar / full APAAR / address / parent details / marks.
"""
from __future__ import annotations

import base64
import io
import json
import time
import uuid

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.exceptions import InvalidSignature

ALLOWED_CLAIMS = {"verification_id", "apaar_id_masked", "student_institution_id", "institution",
                  "programme", "academic_year", "status", "consent", "iat", "exp", "iss"}


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def mask_apaar(apaar_id: str) -> str:
    return "*" * 8 + apaar_id[-4:] if apaar_id else "************"


def generate_keypair() -> tuple[str, str]:
    """Returns (private_pem, public_pem). Store private key in backend env only."""
    sk = Ed25519PrivateKey.generate()
    priv = sk.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                            serialization.NoEncryption()).decode()
    pub = sk.public_key().public_bytes(serialization.Encoding.PEM,
                                       serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    return priv, pub


def build_payload(record: dict, consent: str = "GRANTED", ttl_seconds: int = 7 * 24 * 3600) -> dict:
    now = int(time.time())
    return {
        "verification_id": f"VER-{time.strftime('%Y')}-{uuid.uuid4().int % 1_000_000:06d}",
        "apaar_id_masked": mask_apaar(record.get("apaar_id", "")),
        "student_institution_id": record["student_institution_id"],
        "institution": record["institution"],
        "programme": record["programme"],
        "academic_year": record["academic_year"],
        "status": record["status"],
        "consent": consent,
        "iss": "apaarsetu", "iat": now, "exp": now + ttl_seconds,
    }


def sign_credential(payload: dict, private_pem: str) -> str:
    extra = set(payload) - ALLOWED_CLAIMS
    if extra:
        raise ValueError(f"Refusing to sign non-minimal payload, unexpected claims: {sorted(extra)}")
    sk = serialization.load_pem_private_key(private_pem.encode(), password=None)
    head = _b64(json.dumps({"alg": "EdDSA", "typ": "JWT"}, separators=(",", ":")).encode())
    body = _b64(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    sig = sk.sign(f"{head}.{body}".encode())
    return f"{head}.{body}.{_b64(sig)}"


def verify_credential(token: str, public_pem: str, now: int | None = None) -> dict:
    """Returns {'valid': bool, 'reason': str, 'payload': dict|None}."""
    try:
        head, body, sig = token.split(".")
        pk = serialization.load_pem_public_key(public_pem.encode())
        assert isinstance(pk, Ed25519PublicKey)
        pk.verify(_unb64(sig), f"{head}.{body}".encode())
    except (ValueError, InvalidSignature, AssertionError):
        return {"valid": False, "reason": "invalid_signature_or_format", "payload": None}
    payload = json.loads(_unb64(body))
    if (now or int(time.time())) >= payload.get("exp", 0):
        return {"valid": False, "reason": "expired", "payload": None}
    return {"valid": True, "reason": "ok", "payload": payload}


def qr_png(token: str, base_url: str = "https://apaarsetu.example/verify?t=") -> bytes:
    import qrcode
    img = qrcode.make(base_url + token)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
