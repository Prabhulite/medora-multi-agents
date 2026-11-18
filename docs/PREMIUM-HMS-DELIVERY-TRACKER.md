# Premium HMS Delivery Tracker

This checklist tracks verified delivery work for Medora. A box is checked only after the feature is implemented, tested, and committed.

## Completed clinician experience

- [x] Doctor account linking and permission-based access
- [x] My Practice workspace: personal schedule and recent patients
- [x] Doctor access to patient prescription history
- [x] Printable medication list
- [x] Printable clinical patient summary
- [x] Simplified clinical sidebar and responsive navigation

## Repository hygiene

- [x] Audit generated, obsolete, and duplicate files
- [x] Remove confirmed-safe empty temporary cache
- [x] Verify `.gitignore` protects build output, environment files, and local secrets

## Priority 1 — operational intelligence

- [ ] Define KPI and report requirements with hospital users
- [ ] Role-based operational dashboard
- [ ] Date, department, and doctor report filters
- [ ] CSV and print exports for approved reports
- [ ] Verification: API integration tests, frontend build, and browser smoke test

## Priority 2 — safe hospital operations

- [ ] Document backup and restore runbook
- [ ] Add scheduled database backup tooling with retention policy
- [ ] Add restore verification procedure in a non-production database
- [ ] Add operational health and backup-status dashboard
- [ ] Verification: restore drill and audit evidence

## Priority 3 — barcode-enabled workflows

- [ ] Define barcode identifiers for patient, specimen, medicine, and inventory item
- [ ] Add barcode labels for pharmacy inventory
- [ ] Add scan validation for dispensing and inventory adjustments
- [ ] Add specimen-label scan validation for laboratory workflow
- [ ] Verification: duplicate, expired, and mismatched-code test cases

## Priority 4 — multi-branch readiness

- [ ] Confirm organization, branch, and cross-branch access rules
- [ ] Add branch model and staff assignment
- [ ] Scope patient, appointment, inventory, billing, and reporting queries by branch
- [ ] Add branch switcher and branch-aware audit logs
- [ ] Verification: cross-branch authorization integration tests

## External integrations — require provider approval and credentials

- [ ] Select an approved SMS or WhatsApp provider
- [ ] Define consent, templates, delivery audit, and failure handling
- [ ] Select insurer / claims interface and confirm scope
- [ ] Select payment provider and confirm reconciliation process

## Release gate

- [ ] Security review completed
- [ ] Automated tests and builds passing
- [ ] Backup restore drill successful
- [ ] Pilot users trained and feedback resolved
- [ ] Production rollout and rollback plan approved
