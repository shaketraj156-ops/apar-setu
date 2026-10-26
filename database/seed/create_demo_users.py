"""Create (or refresh) the SNAP demo accounts in Supabase.

The website's "Try the demo" buttons sign in with these accounts, so each portal
can be explored with one click and no registration.

Accounts (all share the password in DEMO_PASSWORD):
  eit.admin@demo.test   institution_admin  Example Institute of Technology (EIT)
  aicte@demo.test       aicte_officer      national dashboard, reports, audit logs
  student@demo.test     student            linked to a synthetic EIT student record
  verifier@demo.test    verifier           consent-based verification

Prerequisites:
  1. Migrations 001, 002, 003 and database/seed/seed_data.sql are already applied.
  2. backend/.env contains SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the same
     SIGNING_SECRET the API uses (the student's APAAR hash is an HMAC of it).

Run from the repository root with the backend virtualenv active:
  DEMO_PASSWORD='choose-a-password' python database/seed/create_demo_users.py

Safe to re-run: existing users get their password, role and links reset.
Uses the service-role key, so run it locally. Never ship that key to the frontend.
"""

import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "backend"))

from supabase import create_client  # noqa: E402
from app.core.config import get_settings  # noqa: E402

# Synthetic APAAR ID of "Vivaan Sharma" (EIT2026001) from seed_data.sql.
STUDENT_APAAR_ID = "901043321819"
EIT_AICTE_CODE = "AICTE-MP-0001"

DEMO_USERS = [
    {
        "email": "eit.admin@demo.test",
        "full_name": "Demo Institution Admin",
        "role": "institution_admin",
        "institution": True,
    },
    {
        "email": "aicte@demo.test",
        "full_name": "Demo AICTE Officer",
        "role": "aicte_officer",
    },
    {
        "email": "student@demo.test",
        "full_name": "Vivaan Sharma (Demo Student)",
        "role": "student",
        "student": True,
    },
    {
        "email": "verifier@demo.test",
        "full_name": "Demo Verifier",
        "role": "verifier",
    },
]


def find_user(supabase, email):
    """Find an existing Supabase Auth user by email."""
    page = 1
    while True:
        response = supabase.auth.admin.list_users(page=page, per_page=200)
        users = response if isinstance(response, list) else getattr(response, "users", [])

        for user in users:
            if (user.email or "").lower() == email.lower():
                return user

        if len(users) < 200:
            return None

        page += 1


def main():
    password = os.environ.get("DEMO_PASSWORD")
    if not password or len(password) < 8:
        sys.exit(
            "Set DEMO_PASSWORD (minimum 8 characters). It must equal "
            "VITE_DEMO_PASSWORD in the frontend environment."
        )

    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        sys.exit(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env"
        )

    supabase = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )

    institutions = (
        supabase.table("institutions")
        .select("id")
        .eq("aicte_code", EIT_AICTE_CODE)
        .execute()
        .data
    )
    if not institutions:
        sys.exit(
            f"Institution {EIT_AICTE_CODE} not found. "
            "Apply database/seed/seed_data.sql first."
        )

    institution_id = institutions[0]["id"]
    # Link the demo student to their record using the hash the DATABASE computed
    # (student_records.apaar_id_hash is a generated sha256 column). Re-hashing here
    # with the app's HMAC would never match it and the student portal would be empty.
    seeded = (
        supabase.table("student_records")
        .select("apaar_id_hash")
        .eq("apaar_id", STUDENT_APAAR_ID)
        .execute()
        .data
    )
    if not seeded or not seeded[0].get("apaar_id_hash"):
        sys.exit(
            f"No student record found for APAAR ID {STUDENT_APAAR_ID}. "
            "Apply database/seed/seed_data.sql first."
        )
    apaar_hash = seeded[0]["apaar_id_hash"]

    # Create or refresh each demo Auth user and its profile.
    for spec in DEMO_USERS:
        email = spec["email"]
        attrs = {
            "email_confirm": True,
            "user_metadata": {
                "full_name": spec["full_name"],
                "is_demo": True,
            },
        }

        existing = find_user(supabase, email)
        if existing:
            supabase.auth.admin.update_user_by_id(
                existing.id,
                {"password": password, **attrs},
            )
            user_id = existing.id
            action = "updated"
        else:
            created = supabase.auth.admin.create_user(
                {"email": email, "password": password, **attrs}
            )
            user_id = created.user.id
            action = "created"

        profile = {
            "id": user_id,
            "full_name": spec["full_name"],
            "email": email,
            "role": spec["role"],
            "institution_id": institution_id if spec.get("institution") else None,
            "apaar_id_hash": apaar_hash if spec.get("student") else None,
        }
        supabase.table("profiles").upsert(
            profile,
            on_conflict="id",
        ).execute()

        print(f"{action:8} {email:22} -> {spec['role']}")

    # Do not update student_records.apaar_id_hash directly: it is a generated
    # database column and Supabase rejects attempts to write to it.
    # Read the seeded row instead and confirm that it exists.
    linked = (
        supabase.table("student_records")
        .select("apaar_id, apaar_id_hash")
        .eq("apaar_id", STUDENT_APAAR_ID)
        .execute()
    )

    if not linked.data:
        raise RuntimeError(
            f"No student record found for APAAR ID: {STUDENT_APAAR_ID}. "
            "Check that database/seed/seed_data.sql has been applied and that "
            "the APAAR ID matches the seeded student record."
        )

    print("Confirmed the demo student's existing student record.")
    print(f"Linked student record(s) for demo student: {len(linked.data)}")
    print(
        "Done. Set VITE_ENABLE_DEMO=true and VITE_DEMO_PASSWORD in "
        "frontend/.env, then restart Vite."
    )


if __name__ == "__main__":
    main()
