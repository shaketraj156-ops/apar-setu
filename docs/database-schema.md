# Database Schema

Supabase (PostgreSQL). Synthetic data only — never store Aadhaar or real APAAR data.

## Run order (Supabase SQL editor)
| # | File | Purpose |
|---|---|---|
| 1 | `database/migrations/001_schema.sql` | Enums, 9 tables, FKs, indexes, `updated_at` triggers, append-only `audit_logs` |
| 2 | `database/migrations/002_rls.sql` | Role helper functions, Row Level Security, auto-create profile on signup |
| 3 | `database/views/003_reports_views.sql` | Analytics views for report APIs and dashboards |
| 4 | `database/seed/seed_data.sql` | Synthetic institutions, programmes, 89 students, findings (dev/demo projects only) |

Regenerate seed + registry JSON + sample CSVs: `python database/seed/generate_seed.py`.

## Tables
- **institutions** — AICTE code, name, state, district.
- **profiles** — 1:1 with `auth.users`; `role`, `institution_id`, `apaar_id_hash` (links a student user to their records).
- **programmes** — approved intake, supernumerary, NRI/OCI/FN quotas, session dates, per academic year.
- **upload_batches** — one CSV upload; row/valid/error/warning counts and status.
- **student_records** — one admission; `apaar_id`, generated `apaar_id_hash`, category flags, `record_status`, `registry_status`.
- **validation_findings** — `rule_code`, `severity` (error/warning/review), `message`, `evidence` (jsonb), `recommended_action`, `is_resolved`.
- **verification_requests** — verification log (`verification_ref` = `VER-YYYY-NNNNNN`).
- **consent_records** — `PENDING/GRANTED/REJECTED/EXPIRED/REVOKED`, scope, expiry.
- **audit_logs** — append-only; update/delete blocked by trigger. Backend writes with the service role.

The mock APAAR registry is **not** a table: it is the separate `mock_apaar_registry/` service (port 8001).

## Roles (`user_role`)
`student`, `institution_staff`, `institution_admin`, `aicte_officer`, `verifier`, `auditor`, `system_admin`

## Who can see what (RLS)
| Role | Own institution data | All institutions | Notes |
|---|---|---|---|
| student | – | – | own records only (via `apaar_id_hash`), can decide own consents |
| institution_staff / admin | read + write | – | scoped by `institution_id` |
| aicte_officer / auditor | – | read | auditors/AICTE also read `audit_logs` |
| verifier | – | – | no direct table access; uses backend verification API |
| system_admin | – | full | |

Users cannot change their own `role`. The backend service role bypasses RLS, so the backend **must** enforce RBAC and `institution_id` isolation itself.

## Views
`v_intake_utilization` (`alert_level`: safe = green, near_limit = orange, review = purple, exceeded = red), `v_duplicate_enrolments`, `v_data_quality`, `v_category_report`, `v_compliance_report`, `v_national_kpis`, `v_state_summary`. All use `security_invoker = on`, so RLS applies to the caller.

## Demo users
Create users in Supabase Auth, then promote them with the commands at the bottom of `database/seed/seed_data.sql`. For a student, set `apaar_id_hash` to the sha256 of a seeded synthetic APAAR ID.

## Demo anomalies in the seed
- EIT Mechanical 15 admitted vs 10 approved (+1 supernumerary) → exceeded; CTI Electrical 13 vs 10 → exceeded
- VIE Computer Science 12/12 and SCE Electronics 10/10 → near limit; EIT Computer Science 14/12 → review
- Two APAAR IDs enrolled in two institutions each → cross-institution duplicates
- Registry INVALID / NOT_FOUND / PENDING records, one NRI-vs-general conflict, one out-of-session admission date
