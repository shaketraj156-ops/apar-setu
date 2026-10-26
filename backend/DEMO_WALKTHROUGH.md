# SNAP Backend - 7-Minute Live Hackathon Demo Script

### Minute 1: System Health and Swagger Architecture
* URL: http://localhost:8000/docs
* Standardized error envelopes: {"error": {"code", "message", "details"}}
* Endpoint check: GET /health returns status ok.

### Minute 2: Multi-Tenant Role Isolation and Auth
* Demonstration of GET /api/v1/auth/me using Bearer token.
* Roles verified directly against database profiles table (never trusted from raw token metadata).
* Institution data isolation: Institution Admin cannot access other institutions student records.

### Minute 3-4: Bulk CSV Upload and 12 AICTE Compliance Rules Engine
* Execution of POST /api/v1/uploads/csv.
* Real-time finding engine output:
  - Catches invalid 12-digit APAAR format (R01_APAAR_INVALID_FORMAT).
  - Flags underage or overage admissions (R02_AGE_OUT_OF_BOUNDS).
  - Detects duplicate roll numbers in batch (R06_DUPLICATE_ROLL_BATCH).
  - Detects approved intake overflow (B01_APPROVED_INTAKE_EXCEEDED).

### Minute 5: Review Lifecycle, Inline Correction and Locking
* Call GET /api/v1/batches/{id}/findings to view granular row errors.
* Call PATCH /api/v1/batches/records/{id} to correct flagged fields.
* Call POST /api/v1/batches/{id}/revalidate to clear resolved findings.
* Call POST /api/v1/batches/{id}/submit to lock batch (immutability guaranteed).

### Minute 6: Verifier Portal and Zero-Disclosure APAAR Privacy
* Call POST /api/v1/verify/request with sliding-window rate limit check (max 30 req/min).
* If student consent is missing: returns CONSENT_REQUIRED.
* If consent is granted: returns ACTIVE with HMAC-SHA256 tamper-proof signature.
* Zero raw APAAR leaked: returns only minimum necessary credentials.

### Minute 7: Automated Test Coverage
* Execution of pytest in terminal: 15/15 tests passing.
