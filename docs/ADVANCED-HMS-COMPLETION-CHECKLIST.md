# Advanced HMS Completion Checklist

Use this as the single release-tracking checklist for Medora. A box is checked only after the feature is implemented, its database migration (if any) is applied, relevant automated checks pass, and the work is documented. Do not check a production item merely because its screen exists.

## Core hospital workflows

- [x] Patient registration, MRD numbering, search, duplicate handling, and merge controls
- [x] Appointment scheduling, check-in, OPD queue, consultation handoff, and checkout
- [x] Clinical encounters, draft revisions, signing, addenda, diagnoses, allergies, history, consent, and timeline
- [x] Admissions, beds, transfers, observations, care plans, medication administration, discharge review, and home-medicine review
- [x] Nursing handoffs, acknowledgement, reassignment, manual escalation, due queues, and reminders
- [x] Billing, invoices, payments, refunds, claims, receivables, cashier reports, closeouts, deposits, and manual statement matching
- [x] Pharmacy inventory, purchasing, batch movements, FEFO controls, dispensing, quarantine, and disposal
- [x] Laboratory orders, collection, result entry, independent verification, release, corrections, communication queue, report archive, catalog history, and test identity snapshots
- [x] Radiology orders, scheduling, resources, reporting, addenda, communication queue, and report archive
- [x] Surgery, emergency/triage, ambulance, blood bank, notifications, and duty roster workflows

## Security and operational foundations

- [x] Database-backed RBAC and route-level authorization
- [x] Request validation, audit logs, safe error responses, and rate limiting
- [x] Environment validation and documented secret-rotation expectations
- [x] Database migrations, seed data, backup/restore utilities, and health/readiness endpoints
- [x] Backend build, frontend build, database seed, integration suite, and browser smoke coverage
- [x] CI workflow for builds, clean database setup, seed, and integration tests
- [ ] Run and review the CI workflow on the remote Git provider
- [ ] Configure production monitoring, alerting, log retention, and incident response ownership
- [ ] Perform a restore drill from a production-like backup
- [ ] Complete an independent security review and dependency vulnerability review

## Interoperability and integration

- [x] Read-only FHIR R4 Patient resource export with permission checks and audit logging
- [x] Verify `GET /api/fhir/r4/Patient?identifier=<exact-MRD>` returns an authenticated, permission-checked FHIR R4 `searchset` Bundle: one Patient entry for a matching MRD, `total: 0` for no match, and validation rejection for missing or invalid identifiers; tick only after the full integration suite passes.
- [ ] Define and implement FHIR resources beyond Patient where required by the hospital
- [ ] Integrate ABDM only after approved credentials, consent flows, and regulatory review are available
- [ ] Integrate LIS, PACS/RIS, payment gateways, SMS/email, and bank feeds only after credentials and vendor contracts are supplied

## Release-candidate finish line

- [ ] Resolve every uncommitted change and leave a clean Git worktree
- [ ] Apply every migration to a clean production-like database and seed required roles/data
- [ ] Run backend and frontend production builds
- [ ] Run the full integration suite
- [ ] Run browser smoke tests against the release-candidate environment
- [ ] Review user roles and remove unnecessary permissions
- [ ] Rotate all development/shared secrets before deployment
- [ ] Set secure production environment variables, HTTPS URLs, database credentials, and backups
- [ ] Publish operator setup, deployment, recovery, and support instructions
- [ ] Obtain hospital-owner acceptance after representative OPD, IPD, billing, pharmacy, laboratory, and radiology walkthroughs

## Not included in “finished”

- [ ] Regulatory certification or legal compliance claims
- [ ] A complete national interoperability implementation
- [ ] Automatic clinical decision-making, critical-value interpretation, or supervisor escalation
- [ ] Full PACS image storage, analyzer connectivity, or bank-statement import
- [ ] Multi-branch organization administration

These remain separate projects that require hospital policy decisions, external systems, and formal validation.
