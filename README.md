# Medora HMS

Hospital Management System under active development with:

- React + TypeScript frontend
- Node.js + TypeScript (tsx) backend
- MySQL database
- Clean module architecture (controllers → services → repositories)
- TypeORM + MySQL entities/relations
- Migration-based DB workflow (`synchronize: false`)
- JWT auth + permission middleware (RBAC, no hardcoded access checks)
- Seeded super admin from `.env`
- Patient registration, OPD/IPD, emergency, surgery, nursing, billing, pharmacy, laboratory, radiology, roster, and ambulance workflows
- Theme/logo aligned to `Medora Software CC.pdf`

## Project structure

```text
medora/
├── backend/
│   └── src/
│       ├── config/              # env + TypeORM DataSource
│       ├── database/entities|migrations|ensure-db|seed
│       ├── middleware/          # authenticate, authorize, validate, errors
│       ├── modules/auth|users|roles|permissions
│       └── shared/
└── frontend/
    └── src/
        ├── components/ui|layout
        ├── features/auth|users|roles|dashboard
        ├── lib/
        ├── routes/
        └── styles/theme.css     # PDF color tokens
```

## Prerequisites

- Node.js 20+
- MySQL (XAMPP MySQL is fine)
- npm

## Setup

### Install + setup

```bash
# from project root
cp backend/.env.example backend/.env
npm run install:all
npm run db:setup
```

### Run the API and both frontends

```bash
npm run dev
```

- API: `http://localhost:5163`
- Admin: `http://localhost:5164`
- Doctor: `http://127.0.0.1:5165/doctor`

Optional single-app scripts: `npm run dev:backend`, `npm run dev:frontend`, `npm run dev:doctor`. The different local hostnames keep the admin and doctor login cookies separate.

## Verification

Run the same build and database checks as the GitHub Actions workflow:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix backend ci
npm --prefix backend run build
npm --prefix backend run test:integration
```

The integration command requires a reachable MySQL server and credentials in `backend/.env` or environment variables. It creates a uniquely named temporary database, applies all migrations, checks the API workflows, and removes that database when finished. The CI workflow is in `.github/workflows/ci.yml` and uses a disposable MySQL service; its fixture credentials must never be reused for a real deployment.

## Super admin

Set `SUPER_ADMIN_*` values in `backend/.env` (see `.env.example`). They are seeded by `npm run db:seed`. Do not commit real credentials.

## Database migrations (production approach)

Schema changes are versioned TypeORM CLI migrations. Runtime `synchronize` is disabled. Production databases are provisioned externally; local first-run uses `db:ensure`.

```bash
cd backend

# After editing entities: generate + apply automatically
npm run migration:generate

# Optional custom name
npm run migration:generate -- AddUserPhone

# Fresh local setup (create DB + migrate + seed)
npm run db:setup

# Apply pending only (new machine / deploy — no generate)
npm run migration:run

# Optional
npm run migration:revert
npm run migration:show
npm run db:ensure
npm run db:seed
```

Workflow:
1. Update entities (the design)
2. `npm run migration:generate` — auto-names if omitted, then auto-runs
3. Commit the new file under `src/database/migrations/`
4. Others / deploy only need `npm run migration:run` or `npm run db:setup`

## Backup and recovery

From `backend/`, run `npm run db:backup -- <backup.sql>` to create a SQL dump and checksum manifest. Run `npm run db:restore -- <backup.sql> <medora_restore_new_database>` to restore into a new database. `npm run db:backup-check` verifies a synthetic round trip. See [database backup and restore](docs/DB-BACKUP-RESTORE.md) for requirements and recovery steps.

## Deployment health checks

`GET /health` confirms the API process is alive. `GET /health/ready` also runs a minimal database probe and returns `503` when the database is unavailable. Docker Compose uses the readiness endpoint for backend health; do not expose its output as a substitute for monitoring, backups, or alerting.

For release, recovery, first-line support, and sign-off procedures, use the [operator runbook](docs/OPERATOR-RUNBOOK.md).

For the read-only released laboratory-report export contract and interoperability limits, see [FHIR R4 Laboratory DiagnosticReport export](docs/FHIR-R4-LABORATORY-DIAGNOSTIC-REPORT.md).

## Theme

Primary brand color from PDF: `#015b2d`  
Supporting palette tokens live in `frontend/src/styles/theme.css`.

Logo assets extracted from the PDF are under `frontend/public/assets/logos/`.

## First modules

1. Login (username + password)
2. User Management
3. Role Management (permission mapping from DB)

Access is enforced by permission codes such as `users.view`, `roles.update`. Super admin bypasses checks via `is_super_admin`.
