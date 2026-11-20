# HMS Improvement Roadmap

This roadmap is based on static inspection. It is a proposal for approval, not an authorization to change application code or schema.

## Phase 0 — Verification gate (Critical)

| Task | Owner | Complexity | Acceptance evidence |
|---|---|---:|---|
| Establish/confirm Git remote, default branch, clean working tree, and branch/worktree policy | Architect | Small | `git status`, remote, and branch policy recorded |
| Run backend/frontend builds and existing smoke/integration/browser checks in a disposable environment | QA | Medium | Logs attached; failures triaged |
| Apply all migrations to clean MySQL and inspect constraints/indexes | Database | Medium | Migration status and schema snapshot |
| Review auth, RBAC, audit, secrets, CORS, cookies, exports, and PII handling | Security | Medium | Threat/risk checklist with findings |

## Phase 1 — Stabilize shared foundations (Critical/High)

1. Define consistent API error, pagination, filtering, and authorization contracts.
2. Add a repeatable test runner with unit, integration, and browser smoke entry points, preserving existing custom checks.
3. Build a permission coverage matrix from backend routes, frontend routes, seed permissions, and roles.
4. Add observability baseline: structured request IDs, safe error logging, latency/error metrics, and alert ownership.
5. Standardize loading, empty, error, confirmation, accessibility, and responsive states across shared UI patterns.

## Phase 2 — Complete core patient journey (Critical)

Vertical slice order: registration → appointment/check-in → clinical encounter → lab/radiology orders → pharmacy → billing/payment → discharge/continuity. Each slice requires API validation, permission tests, migration review if needed, UI acceptance, synthetic-data tests, and regression evidence.

## Phase 3 — Harden high-risk clinical and financial modules (Critical/High)

- Nursing handoff, medication administration, admission/discharge, and emergency: workflow state integrity and auditability.
- Laboratory and radiology: result verification, addenda, critical-result escalation, immutable released archives, and report access.
- Billing/insurance/cashier: transactional integrity, duplicate-payment prevention, closeout/reconciliation, refund authorization, and report correctness.
- Pharmacy/inventory: batch expiry, FEFO overrides, stock reconciliation, procurement approvals, and traceability.

## Phase 4 — Complete operational and portal capabilities (Medium/Low)

- Staff/HR foundations and payroll only after requirements and ownership are defined.
- Patient portal with explicit consent, identity proofing, delegated access, and minimum-necessary data exposure.
- Medical certificate/discharge document workflows.
- Analytics/report catalog, export governance, and performance tuning based on measured queries.

## Dependency graph

```text
Auth/RBAC + audit + API contracts
              │
              ├── Patient/doctor/master data
              │        │
              │        ├── Appointments/check-in/encounters
              │        │        ├── Lab/radiology/pharmacy
              │        │        └── Admission/nursing/surgery/emergency
              │        └── Billing/insurance
              │
              └── Reports/analytics/portals/notifications
```

## Priority rubric

- **Critical:** patient safety, identity/access, data integrity, financial correctness, or core care continuity.
- **High:** operational workflow completeness, diagnostics, inventory, reporting, and doctor experience.
- **Medium:** portal and HR capabilities that depend on policy and identity decisions.
- **Low:** payroll and non-core convenience features until requirements are confirmed.

## Definition of done for every approved task

- Scope is one independently reviewable vertical slice.
- Existing APIs/workflows remain compatible unless explicitly approved.
- Synthetic patient data only in development/test fixtures.
- Backend validation, authorization, audit behavior, and failure paths are covered.
- UI is responsive and accessible for loading, empty, error, and success states.
- Migration is additive/reversible where possible, reviewed, backed up, and tested on a clean database.
- Relevant automated checks pass; changed files, DB changes, tests, and remaining risks are reported.
- Human approval is obtained before production or sensitive-data changes.
