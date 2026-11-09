# Medora HMS

Production-oriented Hospital Management System starter with:

- React + TypeScript frontend
- Node.js + TypeScript (tsx) backend
- MySQL database
- Clean module architecture (controllers → services → repositories)
- TypeORM + MySQL entities/relations
- Migration-based DB workflow (`synchronize: false`)
- JWT auth + permission middleware (RBAC, no hardcoded access checks)
- Seeded super admin from `.env`
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

### Run both apps

```bash
npm run dev
```

- API: `http://localhost:4000`
- UI: `http://localhost:5173`

Optional single-app scripts: `npm run dev:backend`, `npm run dev:frontend`

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

## Theme

Primary brand color from PDF: `#015b2d`  
Supporting palette tokens live in `frontend/src/styles/theme.css`.

Logo assets extracted from the PDF are under `frontend/public/assets/logos/`.

## First modules

1. Login (username + password)
2. User Management
3. Role Management (permission mapping from DB)

Access is enforced by permission codes such as `users.view`, `roles.update`. Super admin bypasses checks via `is_super_admin`.
