# Database setup

1. Create a Supabase project from the Supabase dashboard and keep credentials in local environment files.
2. Run SQL migration files from `database/migrations/` in the Supabase SQL Editor, in order (or through your chosen migration workflow).
3. Add development seed data under `database/seed/` and apply it only to non-production projects.
4. Add Row Level Security policies in migration files and review them before applying.

**Warning:** Never store Aadhaar numbers or real APAAR/Aadhaar data in this repository, sample data, logs, or development databases. Use synthetic data only.
