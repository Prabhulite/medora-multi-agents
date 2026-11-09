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
│       ├── database/entities|migrations|seed
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

## Super admin credentials

Configured in `backend/.env`:

```env
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=SuperAdmin@123
```

These are seeded by `npm run db:seed`.

## Database migrations (production approach)

Schema changes are versioned TypeORM migrations. Runtime `synchronize` is disabled.

```bash
cd backend

# After editing entities, create a migration
npm run makemigration -- AddSomethingUseful

# Apply pending migrations
npm run migrate

# Fresh local setup (migrate + seed)
npm run db:setup

# Optional
npm run migrate:revert
npm run migrate:show
npm run db:seed
```

Workflow:
1. Update entities
2. `npm run makemigration -- Name`
3. Review SQL
4. `npm run migrate`
5. Seed only when needed

## Theme

Primary brand color from PDF: `#015b2d`  
Supporting palette tokens live in `frontend/src/styles/theme.css`.

Logo assets extracted from the PDF are under `frontend/public/assets/logos/`.

## First modules

1. Login (username + password)
2. User Management
3. Role Management (permission mapping from DB)

Access is enforced by permission codes such as `users.view`, `roles.update`. Super admin bypasses checks via `is_super_admin`.
