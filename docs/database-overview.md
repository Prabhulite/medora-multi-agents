# Database Overview

## Observed model

The database is MySQL, accessed through TypeORM. The data source explicitly registers 104 entity files and loads migration files from `backend/src/database/migrations`. `synchronize` is disabled, so schema evolution is intended to happen through reviewed migrations.

## Domain groups

- Identity and access: users, roles, permissions, menus, sessions/versioning.
- Hospital master data: hospital profile, departments, specializations, doctors, services, charge master.
- Patient/MRD: patient, addresses, contacts, identification, emergency contacts, documents, allergies, consents, medical history, communications, audit, visits.
- Clinical: encounters, diagnoses, addenda, signing/revisions, home medications, prescriptions.
- Scheduling and care delivery: appointments, doctor schedules/time slots/leave, admissions, wards, beds, bed transfers, nursing plans/observations/handoffs, medication administrations.
- Diagnostics: laboratory catalog/revisions/orders/collection/results/verification/archives/communications; radiology modalities/orders/resources/scheduling/reports/addenda/archives/communications.
- Revenue cycle: invoices/items, payments, refunds, insurance claims, cashier closeouts, cash deposits/settlements, receivables.
- Supply chain: medication inventory batches, stock transactions, suppliers, purchase orders/items, supplier invoices/payments, quarantine and FEFO controls.
- Operations: emergency, surgery, ambulance, blood bank, roster, vaccination, glucose monitoring, intake/output, expenses, fixed assets, notifications, chat, tickets.

## Migration and recovery controls observed

- Migration generation, run, revert, and show scripts.
- Database ensure and seed scripts.
- SQL backup with checksum manifest.
- Restore into a new database with overwrite refusal.
- Backup/restore round-trip verification utility.

## Items not verifiable without a database connection

- Actual tables and columns in the configured database.
- Foreign-key, unique, and index state after all migrations.
- Migration execution success on a clean MySQL instance.
- Seed idempotency and production seed values.
- PII masking, retention, encryption, and backup access controls.
- Current row volumes and query performance.

## Safe database review sequence after approval

1. Provision a disposable MySQL database.
2. Apply all migrations from a clean state.
3. Run seed and integration checks with synthetic data.
4. Inspect schema, constraints, indexes, and migration status.
5. Compare against a redacted target schema if one is supplied.
6. Only then propose additive migrations; never alter or delete patient data without an approved backup and rollback plan.
