/**
 * Demo accounts for one-click exploration. They must exist in Supabase:
 * create them with `python database/seed/create_demo_users.py`.
 *
 * Enable with VITE_ENABLE_DEMO=true and VITE_DEMO_PASSWORD=<same password used by the script>.
 * Note: Vite inlines VITE_* values into the browser bundle, so the demo password is public by design.
 * Use a password reserved for these synthetic-data accounts.
 */
export const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO !== 'false'
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'password123'
export const DEMO_EMAIL_DOMAIN = '@demo.test'

export const DEMO_ACCOUNTS = [
  {
    key: 'institution',
    role: 'institution_admin',
    email: 'eit.admin@demo.test',
    title: 'Institution Admin',
    subtitle: 'Example Institute of Technology',
    home: '/institution',
    highlights: ['Upload admission CSVs', 'Review validation findings', 'Correct records and submit batches'],
  },
  {
    key: 'aicte',
    role: 'aicte_officer',
    email: 'aicte@demo.test',
    title: 'AICTE Officer',
    subtitle: 'National oversight',
    home: '/aicte',
    highlights: ['National KPIs and intake reports', 'Duplicate and risk analytics', 'Audit log viewer and exports'],
  },
  {
    key: 'student',
    role: 'student',
    email: 'student@demo.test',
    title: 'Student',
    subtitle: 'Identity and consent',
    home: '/student',
    highlights: ['See your verified record', 'Approve or revoke consent', 'Generate a signed QR credential'],
  },
  {
    key: 'verifier',
    role: 'verifier',
    email: 'verifier@demo.test',
    title: 'Verifier',
    subtitle: 'Employers and agencies',
    home: '/verifier',
    highlights: ['Scan or paste a QR credential', 'Consent-gated verification', 'Zero-disclosure results'],
  },
]

export const isDemoEmail = (email) => Boolean(email) && email.toLowerCase().endsWith(DEMO_EMAIL_DOMAIN)
