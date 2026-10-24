# Database setup

1. Create a Supabase project from the Supabase dashboard and keep credentials in local environment files.
2. Run SQL migration files from `database/migrations/` in the Supabase SQL Editor, in order (or through your chosen migration workflow).
3. Add development seed data under `database/seed/` and apply it only to non-production projects.
4. Add Row Level Security policies in migration files and review them before applying.

**Warning:** Never store Aadhaar numbers or real APAAR/Aadhaar data in this repository, sample data, logs, or development databases. Use synthetic data only.

## Run order and seed data

1. `database/migrations/001_schema.sql`
2. `database/migrations/002_rls.sql`
3. `database/views/003_reports_views.sql`
4. `database/seed/seed_data.sql` (dev/demo projects only)

`seed_data.sql`, `mock_apaar_registry/app/data/synthetic_apaar_records.json` and the CSVs in `samples/` are generated together by `python database/seed/generate_seed.py` so the demo data stays consistent. Full schema notes: `docs/database-schema.md`.
