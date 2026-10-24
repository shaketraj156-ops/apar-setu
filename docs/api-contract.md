# API Contract

Base path `/api/v1` · Auth: `Authorization: Bearer <Supabase JWT>` · JSON · errors: `{ "detail": "...", "code": "..." }`
Roles: STU = student, INST = institution_staff/admin, AICTE = aicte_officer, VER = verifier, AUD = auditor, SYS = system_admin.

Dev 3 owns the database, views and the services in `backend/app/services/`; Dev 2 wires them into the route modules in `backend/app/api/v1/`.

| Route module | Dev 3 service it calls |
|---|---|
| `reports.py` | SQL views (`database/views/003_reports_views.sql`), `risk_scoring.py`, `export_service.py` |
| `consent.py` | `consent_service.py` |
| `verification.py` | `consent_service.py`, `qr_credentials.py` |
| `students.py` (PATCH, batch resubmit) | `revalidation_service.py`, `registry_client.py` |

## Reports — roles AICTE, AUD, SYS (INST sees own institution only, enforced by RLS or `institution_id` filter)
| Method | Path | Source | Notes |
|---|---|---|---|
| GET | `/reports/kpis` | `v_national_kpis` | |
| GET | `/reports/intake` | `v_intake_utilization` | filters `state`, `institution_id`, `alert_level` |
| GET | `/reports/duplicates` | `v_duplicate_enrolments` | |
| GET | `/reports/data-quality` | `v_data_quality` | |
| GET | `/reports/category` | `v_category_report` | |
| GET | `/reports/compliance` | `v_compliance_report` | |
| GET | `/reports/risk` | `risk_scoring.compute_risk` per institution | `{entity, score, level, components, explanations[]}` |
| GET | `/reports/{name}/export?format=csv\|xlsx\|pdf` | `export_service` | optional `date_from`, `date_to` + filters; 400 on bad format |

Alert colours: safe = green, near_limit = orange, review = purple, exceeded = red.

## Mock APAAR registry (separate service, port 8001)
`GET /verify/{apaar_id}` → `{ "apaar_id": "...", "status": "VALID|INVALID|NOT_FOUND|PENDING" }`.
Backend uses `RegistryClient` (env `MOCK_APAAR_REGISTRY_URL`); if the registry is unreachable the client returns `PENDING` (warning, not error).

## Re-validation after correction
`PATCH /students/{record_id}` and the batch resubmit endpoint call `revalidate_record(...)` then `apply_findings(...)`. This replaces the record's unresolved findings and sets `record_status` to `validated` (no error/review left) or `flagged`.

## Consent — roles STU (decide), VER/AICTE (request)
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/consents` | `{record_id, scope?[], ttl_days?}` | 201 PENDING; 422 if scope asks for aadhaar / full APAAR / address / parent details / marks |
| GET | `/consents` | – | own (student) or created (requester) |
| POST | `/consents/{id}/grant` · `/reject` · `/revoke` | – | 200; 403 if caller is not the student; 409 invalid transition |

`PENDING → GRANTED | REJECTED | EXPIRED`, `GRANTED → REVOKED | EXPIRED`. Expiry is evaluated on read (`effective_status`).

## Verification & QR — roles VER, AICTE (STU for own QR)
`POST /verify/student` `{ record_id }` → 200
```json
{ "verification_id": "VER-2026-000982", "apaar_id_masked": "********4821",
  "student_institution_id": "CSE2026001", "institution": "...", "programme": "...",
  "academic_year": "2026-30", "status": "ACTIVE", "consent": "GRANTED", "credential": "<signed jwt>" }
```
403 no GRANTED consent for this requester · 404 record not found · 429 rate limit.

`POST /credentials/qr` (STU, own record) → QR PNG + `token`. `GET /verify/qr?t=<token>` (public) → `{valid, reason, payload}`, `reason ∈ ok | expired | invalid_signature_or_format`.
Signed claims are limited to: `verification_id, apaar_id_masked, student_institution_id, institution, programme, academic_year, status, consent, iss, iat, exp`. Keys: `QR_PRIVATE_KEY_PEM` / `QR_PUBLIC_KEY_PEM`.

## CSV upload columns (`samples/full_upload_template.csv`)
`student_name, programme, academic_year, apaar_id` (same first four as `samples/student_upload_template.csv`) plus
`student_institution_id, gender, dob, admission_date, category, is_supernumerary, is_nri, is_oci, is_foreign_national, enrollment_status`.
The institution is taken from the logged-in user, not from the CSV. `samples/validation_demo.csv` triggers: missing/short APAAR, duplicate in batch, cross-institution duplicate, out-of-session date, NRI/category conflict, incomplete row.

## Validation finding shape (`validation_findings`)
`{ row_number, rule_code, severity: error|warning|review, message, evidence{}, recommended_action }`
