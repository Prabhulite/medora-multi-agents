# Medora HMS Project Audit

**Audit date:** 2026-11-20
**Scope:** Read-only inspection of the existing repository. No application code, schema, configuration, or runtime data was changed.

## Executive summary

Medora is an active, modular hospital management system rather than a starter template. It has a React 19 + TypeScript/Vite frontend, an Express 4 + TypeScript backend, TypeORM with MySQL, migration-controlled schema changes, JWT authentication, database-backed RBAC, audit logging, rate limiting, health/readiness checks, backup/restore helpers, and synthetic/integration/browser smoke tooling.

The project already covers most of the requested HMS capability areas. The main expansion opportunity is therefore hardening and completion of existing workflows, not duplicating modules. Runtime database state, deployment configuration, production observability, and real end-to-end test execution remain unverified because this phase did not connect to or mutate a database.

## Verified technology and architecture

- Root orchestration: npm scripts and `concurrently`.
- Admin UI: React 19, TypeScript, Vite, React Router, Ant Design, Axios.
- Doctor UI: a second Vite mode served from the same frontend package.
- API: Node.js, Express, TypeScript via `tsx`.
- Persistence: MySQL via `mysql2` and TypeORM.
- Schema workflow: 108 checked-in migrations; `synchronize: false`.
- Security: Helmet, CORS with credentials, JWT, bcryptjs, request rate limits, authorization middleware, audit request middleware.
- Validation: Zod-based validators in multiple modules.
- Delivery: Dockerfiles, Docker Compose, GitHub Actions reference in README.

## Current strengths

1. The module boundary is explicit: routes → controllers → services/repositories.
2. The database is migration-first and includes backup/restore verification utilities.
3. RBAC is modeled with users, roles, permissions, and menus; the UI filters navigation by permission.
4. Clinical and operational scope is broad: patient registration, OPD/check-in, inpatient care, nursing, pharmacy, LIS, radiology, billing, insurance, surgery, emergency, blood bank, ambulance, roster, vaccination, notifications, audit, and reporting.
5. The repository includes API smoke checks, browser smoke checks, a large integration check, and CI documentation.

## Main risks and gaps to address before expansion

- Automated test execution is not represented by a conventional test runner in package scripts; most confidence appears to come from custom smoke/integration scripts and one validator test file.
- The repository has no root Git metadata at `C:\Users\prabh\Desktop\john medora`; Git branch/worktree safety and shared-source review cannot be verified from this checkout.
- The audit could not verify live schema drift, indexes, foreign-key behavior, seed completeness, backup retention, or production environment values.
- There are many modules and migrations, so cross-module contracts and permission coverage need a systematic inventory before parallel changes.
- Patient data protection needs an explicit, reviewed policy covering retention, encryption at rest/in transit, least privilege, exports, logs, and Indian regulatory obligations.

## Evidence reviewed

- `README.md`, root/backend/frontend package manifests.
- `backend/src/app.ts`, TypeORM data source and middleware directory.
- Backend module, route, controller, service, entity, and migration paths.
- Frontend feature paths and shared layout/API/permission code.
- Existing smoke, browser-smoke, integration, backup/restore, seed, and migration utilities.

## Inspection-only conclusion

The project is suitable for incremental improvement. Do not rebuild it. The next approved phase should begin with runtime verification and a module-by-module acceptance matrix, then proceed in small vertical slices with migration review, regression tests, security review, and human approval before production changes.
