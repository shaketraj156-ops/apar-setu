# APAARSetu

APAARSetu is a starter monorepo for an APAAR ID-based student data management and verification platform for AICTE-approved institutions. This repository contains the initial app shells, health endpoints, synthetic registry data, and documentation placeholders. It does not yet implement the full product.

## Tech stack

- Frontend: React (JavaScript), Vite, Tailwind CSS, React Router, Axios, Recharts
- Backend: Python, FastAPI, SQLAlchemy, Alembic, pytest
- Database and authentication: Supabase
- Mock registry: FastAPI service on port 8001
- Package managers: npm and Python venv/pip

## Folder structure and file guide

```text
apaarsetu/
├── .github/
│   └── pull_request_template.md   # PR prompts and review checklist
├── docs/
│   ├── requirements.md            # Placeholder for product requirements
│   ├── task-list.md               # Placeholder for implementation tasks
│   ├── api-contract.md            # Placeholder for endpoint contracts
│   ├── database-schema.md         # Placeholder for schema documentation
│   └── demo-script.md             # Placeholder for a demo walkthrough
├── frontend/
│   ├── public/                    # Static assets served as-is by Vite
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosClient.js     # Shared Axios client; adds Supabase access token and handles 401s
│   │   │   └── supabaseClient.js  # Supabase browser client, configured from Vite env variables
│   │   ├── components/            # Shared UI components, grouped by common/layout/uploads
│   │   ├── context/               # Reserved for shared React context providers
│   │   ├── hooks/                 # Reserved for reusable React hooks
│   │   ├── pages/                 # Reserved for auth, institution, AICTE, student, and verifier screens
│   │   ├── routes/                # Reserved for route definitions and guards
│   │   ├── utils/                 # Reserved for frontend helper functions
│   │   ├── App.jsx                # Current starter screen: “APAARSetu is running”
│   │   ├── main.jsx               # Vite entry point; mounts React App and global CSS
│   │   └── index.css              # Tailwind import and base page styles
│   ├── .env.example               # Names of the frontend's local environment settings
│   ├── index.html                 # Vite HTML shell and React mount element
│   ├── package.json               # npm scripts and frontend dependencies
│   └── vite.config.js             # Vite, React, and Tailwind plugin configuration
├── backend/
│   ├── app/
│   │   ├── api/v1/                # Versioned endpoint module placeholders
│   │   ├── core/                  # Configuration, security, permissions, and exception placeholders
│   │   ├── models/                # Reserved for database models
│   │   ├── schemas/               # Reserved for request and response schemas
│   │   ├── services/              # Supabase, CSV, validation, and audit service placeholders
│   │   ├── validators/            # APAAR, duplicate, and intake validation placeholders
│   │   ├── utils/                 # Reserved for backend helpers
│   │   ├── tests/
│   │   │   └── test_health.py     # Checks that GET /health returns HTTP 200 and status “ok”
│   │   └── main.py                # FastAPI app, CORS setup, and GET /health
│   ├── alembic/                   # Reserved for database migration scripts
│   ├── .env.example               # Backend configuration variable names
│   ├── alembic.ini                # Alembic migration configuration starter
│   └── requirements.txt           # Python dependency list for the backend
├── database/
│   ├── migrations/                # SQL schema and policy migrations
│   ├── seed/                      # Development seed data scripts
│   ├── views/                     # SQL view definitions
│   └── README.md                  # Supabase setup, SQL locations, and synthetic-data warning
├── mock_apaar_registry/
│   ├── app/
│   │   ├── data/
│   │   │   └── synthetic_apaar_records.json # Fake IDs and their simulated verification statuses
│   │   ├── main.py                # FastAPI GET /verify/{apaar_id} endpoint on port 8001
│   │   └── registry.py            # Loads synthetic records and returns a status or NOT_FOUND
│   └── requirements.txt           # Mock registry Python dependencies
├── samples/
│   ├── student_upload_template.csv # Empty example column header for student uploads
│   ├── valid_students_demo.csv     # Example row using the synthetic VALID ID
│   ├── invalid_apaar_demo.csv     # Example row using the synthetic INVALID ID
│   └── duplicate_students_demo.csv # Repeated fake student row for duplicate-flow demos
├── .env.example                   # Root-level environment variable names for local setup
├── .gitignore                     # Excludes secrets, virtual environments, caches, and build output
├── docker-compose.yml             # Starts frontend, backend, and mock registry containers
└── README.md                      # Project overview and setup/run instructions
```

Directories with no implementation files yet contain `.gitkeep` files so Git preserves the requested structure. Most backend endpoint, core, service, and validator modules are intentionally placeholders; add product behavior there as the project develops. `frontend/src/components/` contains the requested `common/`, `layout/`, and `uploads/` areas for shared UI code.

## Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your local API URL and Supabase public project values. Never commit credentials.

## Backend setup

Windows PowerShell:

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

macOS/Linux:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Copy `backend/.env.example` to `backend/.env` for local configuration. The health check is `GET http://localhost:8000/health`.

## Supabase setup

Create a project in the Supabase dashboard. Copy its project URL and anon key to local environment files. Keep the service role key server-side only and never expose it in Vite variables or commit it. Put SQL migrations in `database/migrations/`, seed data in `database/seed/`, and RLS policies alongside migrations. See `database/README.md`.

## Run locally

Open separate terminals and run the frontend, backend, and mock registry commands listed below. The mock registry listens on port 8001. The backend listens on 8000 and the Vite frontend on 5173.

Mock registry:

```powershell
cd mock_apaar_registry
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Backend tests:

```powershell
cd backend
venv\Scripts\Activate.ps1
pytest
```

On macOS/Linux activate with `source venv/bin/activate`. Docker Compose can start all three services with `docker compose up --build` once each service's container build configuration is added.

## Git workflow for three developers

The repository owner creates and pushes `main`, then each developer clones the repository and creates a personal working branch, for example `dev/alex`, `dev/sam`, or `dev/lee`. Keep branches focused (`feature/frontend-shell`, `feature/api-health`, `docs/setup`) and open pull requests to `main`. Pull/rebase from `main` regularly, request a review, and merge only after the PR checklist is complete. Do not share branches or commit local `.env` files.

## First push

```bash
git add .
git commit -m "Initialize APAARSetu monorepo"
git branch -M main
git remote add origin <repository-url>
git push -u origin main
```

Developer clone and branch:

```bash
git clone <repository-url>
cd apaarsetu
git switch -c dev/<your-name>
```

