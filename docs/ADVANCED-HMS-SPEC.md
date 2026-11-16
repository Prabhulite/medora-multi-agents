# Advanced HMS Specification

## Objective

Build a modular web-based hospital management system on the existing Medora stack. The system must support hospital administration, outpatient and inpatient care, clinical documentation, billing, pharmacy, inventory, laboratory, radiology, reporting, and integration-ready APIs.

## Assumptions

- The initial deployment targets Indian hospitals and clinics.
- The application remains a React + TypeScript frontend with a Node.js + TypeScript backend.
- MySQL remains the primary transactional database.
- JWT authentication and database-backed RBAC remain the security foundation.
- Existing patient, doctor, appointment, migration, and seed modules are retained and extended.
- Real payment, SMS, ABDM, PACS, and LIS credentials will be supplied when those integrations are implemented.

## Commands

```text
npm run dev
npm run build --prefix backend
npm run build --prefix frontend
npm run db:setup --prefix backend
```

## Project structure

- `backend/src/database`: entities, migrations, seed, and database setup
- `backend/src/modules`: bounded backend modules with routes, controllers, services, repositories, and validators
- `frontend/src/features`: user-facing feature modules and API clients
- `frontend/src/components`: reusable layout and UI components
- `docs`: specifications, roadmap, decisions, and operational documentation

## Code style

Backend modules should follow the existing controller/service/repository pattern and validate external input with Zod. Frontend features should keep API calls in feature-specific API clients and use typed payloads.

```ts
const patient = await patientService.create(input, req.user?.id ?? null);
return res.status(201).json({ success: true, data: patient });
```

## Testing strategy

- Unit tests for validators and domain services
- Integration tests for routes, permissions, migrations, and database behavior
- Frontend tests for validation and important state transitions
- Browser verification for login, patient registration, appointments, clinical workflows, and billing
- Clean-database migration and seed verification for every schema phase

## Boundaries

- Always: validate inputs, enforce API permissions, audit clinical changes, use migrations, preserve existing flows, and verify builds.
- Ask first: production integrations, regulatory claims, external messaging/payment credentials, and irreversible data changes.
- Never: commit `.env` files or secrets, bypass permission middleware, edit vendor dependencies, or delete clinical data silently.

## Success criteria

- A user with the correct role can complete end-to-end OPD and IPD workflows.
- Clinical, billing, inventory, laboratory, and pharmacy records are linked to the correct patient and encounter.
- Unauthorized users cannot access protected data through either the UI or API.
- A clean database can be created from migrations and seed data.
- Backend and frontend builds pass at every release checkpoint.
- Operational documentation explains setup, backup, restore, deployment, and support procedures.
