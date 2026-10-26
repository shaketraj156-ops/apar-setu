# Demo Script

## One-click demo accounts

Judges and visitors can explore every portal without registering.

### One-time setup

1. Apply migrations and `database/seed/seed_data.sql` to the Supabase project.
2. Create the demo users (backend venv active, `backend/.env` filled in):
   ```bash
   DEMO_PASSWORD='choose-a-password' python database/seed/create_demo_users.py
   ```
3. In `frontend/.env` set `VITE_ENABLE_DEMO=true` and `VITE_DEMO_PASSWORD=<same password>`, then restart Vite.

### Using it

Open `/demo` (navbar: **Try Demo**) or use the buttons under the login form.

| Role | Account | Lands on | Try |
| --- | --- | --- | --- |
| Institution Admin | eit.admin@demo.test | /institution | Upload `samples/validation_demo.csv`, review findings, fix a record, submit the batch |
| AICTE Officer | aicte@demo.test | /aicte | KPIs, intake and duplicate reports, risk, `/aicte/audit` |
| Student | student@demo.test | /student | View record, approve or revoke consent, generate the QR credential |
| Verifier | verifier@demo.test | /verifier | Paste the student's QR token, see the consent-gated result |

While signed in as a demo user, an amber bar at the top lets you switch roles or exit the demo.

### Notes

- All data is synthetic. Demo accounts can write (uploads, edits, submits), so re-seed between public demos if a clean state matters.
- Set `VITE_ENABLE_DEMO=false` to hide every demo entry point. The Supabase accounts remain, so delete them (Auth dashboard) if the project goes to production.
