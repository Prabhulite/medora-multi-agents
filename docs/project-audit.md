# Medora HMS repository audit

**Date:** 20 November 2026. **Method:** Static inspection only. Application code, schema, configuration, and runtime data were not changed. Builds, migrations, and clinical workflows were not run for this audit.

## Summary and technology

Medora is an established HMS with broad module coverage; source presence alone does not prove production readiness.

| Layer | Technology and evidence |
|---|---|
| Admin and doctor UI | React 19, TypeScript, Vite 6, React Router 7, Axios, Ant Design (`frontend/package.json`). Separate entry points in `admin-frontend` and `doctor-frontend` share `frontend/src`; Vite selects the portal by mode (`frontend/vite.config.ts`). |
| API | Node.js, TypeScript, Express 4, Zod (`backend/package.json`, `backend/src/app.ts`). Routes mount under `/api`. |
| Data | MySQL via `mysql2` and TypeORM (`backend/src/config/data-source.ts`); `synchronize: false`. |
| Delivery | Docker Compose and Dockerfiles; GitHub Actions CI builds and runs database setup, integration and browser smoke checks (`.github/workflows/ci.yml`). CI results were not checked. |

## Existing modules

Routes and/or UI exist for hospital profile, users/roles/permissions/menus, departments/specializations/doctors, patients/documents, appointments, OP check-in/visits, clinical encounters, inpatient/wards/beds, nursing, emergency, surgery, pharmacy prescriptions/inventory/procurement, laboratory, radiology, billing/payments/cashier/insurance, ambulance, blood bank, roster, vaccination, glucose monitoring, intake/output, expenses, fixed assets, notifications, chat, support tickets, operations/reports, automation, audit logs and FHIR interoperability. Evidence: `backend/src/app.ts`, `backend/src/modules`, `frontend/src/features`, `admin-frontend/src/App.tsx`, `doctor-frontend/src/App.tsx`. See `docs/module-inventory.md` for a capability index. These are code-presence findings, not workflow acceptance.

## Entities and migrations

- `backend/src/database/entities` has 103 entity files plus `index.ts` (104 TypeScript files total). Core groups include patient/visit/encounter/prescription/appointment; admission/ward/bed/nursing/discharge; laboratory/radiology; invoice/payment/refund/inventory/suppliers; and user/role/permission/menu/audit.
- `backend/src/database/migrations` has **108** checked-in migration files covering initial schema through clinical, finance, diagnostics, nursing, automation, vaccination and intake/output. Migration execution, upgrade behavior and production schema drift were not verified.
- Seed, starter-service, backup and restore scripts exist under `backend/src/database`. Their behavior on a representative client database remains unverified.

## APIs and authentication

- `backend/src/app.ts` mounts more than 30 route groups. Important prefixes include `/api/auth`, `/api/patients`, `/api/visits`, `/api/clinical`, `/api/pharmacy`, `/api/laboratory`, `/api/radiology`, `/api/billing`, and `/api/inpatient`. Route files are the authoritative endpoint inventory.
- Login checks bcrypt hashes and signs a JWT. It sets an HTTP-only `medora_session` cookie; `authenticate` also accepts Bearer tokens, reloads permissions from the database, and validates session version. `authorize`/`authorizeAny` enforce permission codes, with super-admin bypass (`backend/src/modules/auth`, `backend/src/middleware`).
- The login JSON also returns the raw JWT (`auth.service.ts`). Confirm whether non-browser clients require this; the browser uses cookies (`frontend/src/lib/api.ts`).
- Helmet, CORS, rate limits, request audit, health and readiness endpoints exist. Their deployed configuration was not tested.

## Incomplete or risky areas

1. **End-to-end evidence:** Custom integration and browser smoke scripts exist, but this audit did not run them. Verify registration → check-in → clinical encounter → diagnostics → prescription/dispense → billing/payment → admission/discharge with role-specific synthetic data.
2. **Permission parity:** Compare backend route guards, seed permissions, role grants, UI navigation and action visibility. Prior reported `doctors.view`, `patients.delete` and `emergency.view` failures make this high priority; super-admin testing can mask role gaps.
3. **Patient documents:** `patient-document.routes.ts` stores/returns base64 file data through the API. Review size, retention, backup, download/deletion auditing, malware controls and access scope before broad use.
4. **Patient list filters:** `PatientsPage.tsx` filters the loaded list by *latest* visit date/department. It does not find every historical visit and may need server-side filtering at scale.
5. **Database and recovery:** Clean install, upgrade from an older schema, backup restore and rollback have not been verified here.
6. **Testing depth:** One conventional backend `*.test.ts` file is visible; larger custom scripts and CI may cover more. Map tests to critical state transitions and failure paths.
7. **Privacy/operations:** Source inventory cannot establish TLS, encryption, key rotation, least-privilege exports, retention, incident response, monitoring or applicable hospital obligations.

## Missing or not clearly established HMS capabilities

| Candidate | Finding / decision |
|---|---|
| Patient self-service portal | No distinct patient-facing frontend identified; confirm whether booking, results, bills and consent are required. |
| Full HR/payroll | Staff users and roster exist; no clear payroll module. Obtain local requirements first. |
| Medical certificate issuance | Documents and discharge features exist; dedicated certificate approval/signing is unclear. |
| Multi-site administration | Location fields exist; strong branch or tenant isolation is not established by this audit. |
| Live external integrations | FHIR and automation paths exist; live analyzers, payment gateway, SMS, payer and national-system connections are not proven. |

These are scope candidates, not assertions that the client needs them. This was a static review: no live database, deployed service, accessibility session or clinical validation was inspected.
