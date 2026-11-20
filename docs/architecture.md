# Medora HMS Architecture

## System shape

```text
Admin React/Vite UI ─┐
Doctor React/Vite UI ─┼─ Axios + cookie credentials ─> Express API
                     │                                  │
                     │                                  ├─ Helmet/CORS/rate limit/logging
                     │                                  ├─ auth + authorization middleware
                     │                                  ├─ routes → controllers → services/repositories
                     │                                  └─ TypeORM entities/migrations
                     └──────────────────────────────────────> MySQL
```

## Frontend

The frontend is feature-oriented under `frontend/src/features`, with shared UI components, layout shell, routing, API helpers, permission helpers, and theme tokens. Vite has separate admin and doctor modes. The doctor experience also has a dedicated `doctor-frontend` directory, so its ownership and deployment relationship should be clarified before more portal work.

## Backend

The Express app mounts domain routes under `/api/*`. Most domains follow controllers, services, validators, and sometimes repositories. Shared middleware includes authentication, authorization, validation, error handling, request auditing, and rate limiting. Health and readiness endpoints are separate.

## Data layer

TypeORM uses explicit entity registration and migration globs. Runtime schema synchronization is disabled. The migration directory contains 108 files and the entity directory contains 104 files at audit time. This is a strong basis for controlled changes, but migration ordering, duplicate timestamps, foreign-key/index coverage, and live drift must be checked in a disposable database and against the target deployment database.

## Security architecture observed

- JWT authentication and bcrypt password hashing.
- Permission codes attached to roles and menus.
- Super-admin seed path.
- Request audit middleware and system audit log entity.
- Helmet, credentialed CORS, JSON size limit, and API/auth rate limits.
- Session version/password rotation concepts in the auth model.

## Recommended agent boundaries

| Agent | Owns | Must not do alone |
|---|---|---|
| Architect | contracts, dependency order, ADRs, cross-module decisions | approve production deployment |
| Frontend | screens, accessibility, responsive workflows, client integration | bypass backend authorization |
| Backend | routes, services, validation, error contracts | make unreviewed schema changes |
| Database | entities, migrations, indexes, backup/rollback plan | destructive migration without approval |
| QA | unit/integration/browser regression and acceptance evidence | waive failed safety checks |
| Security | RBAC, privacy, audit, threat review, secrets/config checks | alter clinical behavior without domain approval |

## Parallel-work rules

Define API and migration contracts first. Parallelize independent UI, tests, and documentation only after contracts are stable. Keep database migrations sequential. Use isolated Git branches/worktrees once repository Git metadata is available, and require review plus passing tests before merge.

## Architectural decisions still requiring human approval

1. Patient-portal identity and consent model.
2. Document/object storage and encryption approach.
3. Audit-log retention and access policy.
4. Production deployment, backup RPO/RTO, and disaster recovery.
5. Indian data-protection and healthcare compliance interpretation with qualified counsel/domain owners.
