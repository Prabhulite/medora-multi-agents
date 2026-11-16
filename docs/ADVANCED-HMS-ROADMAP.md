# Medora Advanced HMS Roadmap

## Objective

Evolve Medora from its current administration, patient-registration, doctor, and appointment foundation into a production-oriented hospital management system for Indian hospitals and clinics.

The implementation will be delivered as tested vertical slices. Existing authentication, role-based access control, patient registration, doctors, appointments, migrations, and seed workflows must remain working after every increment.

## Product scope

### Phase 0: Foundation hardening

- Environment validation and safe development setup
- Consistent API error contracts and request validation
- Pagination, filtering, audit logging, and soft-delete conventions
- Automated backend tests and frontend build checks
- Secure secret handling and removal of default production credentials

### Phase 1: Front office and OPD

- Patient registration, search, duplicate detection, MRD numbering
- Appointment booking, doctor schedules, check-in, cancellation, rescheduling
- OPD visits, queue/status tracking, consultation handoff
- Registration sources and patient communication history

Current communication history: authorized staff can manually record inbound or outbound patient contact by phone, SMS, email, in person, or other channel, including subject, summary, time, and optional follow-up due time. Entries are append-only, patient scoped, audited, and shown on the patient dashboard and timeline. Staff can complete a follow-up with a note; open and overdue tasks appear in the patient API, and an open queue appears on Operations for users with patient view permission. Recording an SMS or email here does not send it.

### Phase 2: Clinical EMR

- Patient timeline and encounter history
- Vitals, allergies, medical history, diagnoses, clinical notes
- Prescriptions, medication history, attachments, consent records
- ICD-10/ICD-11-ready diagnosis catalog and clinical audit trail

Current allergy workflow: staff can record, review, and remove patient allergies in the clinical panel; changes are recorded in the patient audit log. Recorded allergies are also surfaced near the top of the patient dashboard for clinical viewers. Prescription creation, patient-linked stock dispensing, and recording a medication as given block exact case/whitespace-normalized matches against the entered medicine name and catalog medication brand/generic names. Nurses can still record a dose as withheld or refused with a reason. This is a basic safety check only: it does not detect drug classes, ingredients, synonyms, cross-reactivity, interactions, or dosing risks. Clinical review remains required.

Current medical history workflow: staff can add dated conditions with notes, review them in the patient clinical panel, and remove mistaken entries. Additions and removals are recorded in the patient audit log.

Current encounter finalization: users with `clinical.update` can sign a draft encounter that contains clinical content. Signing records the user and time, rejects repeated signing, adds a patient audit entry, and appears in the timeline. Signed content is not edited in place. Authorized staff can append dated addenda with a reason and author; the original note remains intact, and each addendum is visible in the chart, audit trail, and timeline. This is an internal attestation, not a cryptographic or legally verified electronic signature.

Creating a draft encounter also writes a patient audit entry in the same database transaction. The audit API exposes the action and actor summary; the stored record retains the encounter ID and diagnosis fields for internal traceability.

Current consent workflow: authorized staff can attach a PDF or image copy of a signed consent, record its purpose, risks explained, language, signatory and signature time, and, for specific consents, the treating doctor and registration number. The chart lists records without returning file contents; document retrieval requires clinical view permission. Revocation preserves the original copy and records a reason and audit entry. Staff must verify the uploaded copy and identity: Medora does not validate the signature, establish the signatory's legal authority, or certify consent compliance. The fields were informed by the [Clinical Establishments hospital consent guidance](https://www.clinicalestablishments.mohfw.gov.in/sites/default/files/2022-06/885.pdf); the hospital must review the workflow against its procedures before clinical use.

Current patient timeline: the Timeline tab combines up to 100 recent events from registration, appointment status history, visits, encounters, prescriptions, admissions/discharges, laboratory and radiology orders/results, emergency and surgery cases, consent, and allergy/medical-history audit changes. It is patient-scoped and requires clinical view permission. This is a recent-event summary rather than a complete legal record or an unbounded event archive.

Current patient chart tabs: Profile and MRD show identity details and audit history; Visit, Bills, Tests, Rx, and Appointment load patient-scoped records from the existing modules. Tab data is read-only and follows the corresponding API permission checks. Further workflow actions remain in their dedicated modules.

### Phase 3: IPD and nursing

- Admissions, wards, rooms, beds, transfers, discharge
- Nursing station, care plans, observations, medication administration
- Discharge summaries and follow-up instructions
- Bed occupancy and ward dashboards

### Phase 4: Billing and revenue cycle

- Charge masters, packages, invoices, receipts, refunds
- Insurance, corporate accounts, approvals, claims-ready records
- Patient ledger, discounts, taxes, payment reconciliation
- Financial reports and cashier controls

### Phase 5: Pharmacy and inventory

- Drug catalog, batches, expiry, stock ledger, locations
- Purchase orders, suppliers, goods receipt, stock transfers
- Pharmacy dispensing and prescription fulfillment
- Reorder levels and stock/expiry alerts

### Phase 6: Laboratory and radiology

- Test catalog, panels, sample collection, lab workflow
- Results entry, validation, release, printable reports
- Radiology orders, scheduling, reports, document attachments
- Integration-ready interfaces for LIS/RIS/PACS

### Phase 7: Operations and integrations

- OT/surgery, emergency/triage, ambulance, blood bank
- HR/staff scheduling and duty rosters
- Notifications, FHIR/HL7 APIs, ABDM integration readiness
- Multi-branch and organization-level configuration

### Phase 8: Production readiness

- Route-level frontend loading is implemented. The measured Vite entry JavaScript chunk decreased from 790.43 kB to 357.26 kB (uncompressed); the frontend production build passes. Browser timing and visual checks remain to be measured.
- Security review, permission matrix review, rate limiting
- Backup/restore procedures, observability, alerting
- Performance testing, accessibility, browser verification
- Docker/deployment documentation and release checklist

## Architecture rules

- Database migrations are the only production schema change mechanism.
- Each feature is implemented as a vertical slice: migration/entities, validation, repository/service/controller, route, frontend API/types/UI, tests, and seed data where needed.
- Permissions are database-backed and checked at the API boundary; the frontend only hides unavailable actions as a usability feature.
- Patient and clinical data changes must be auditable.
- Destructive operations use soft deletion or explicit confirmation whenever possible.
- No external product source code, branding, or proprietary assets will be copied.

## Verification gates

Every increment must pass:

- Backend type checking/build
- Frontend production build
- Relevant automated tests
- Migration/seed verification against a clean database where schema changes are involved
- Manual browser verification for user-facing flows

## Initial implementation order

1. Add project specification and test/build commands.
2. Add baseline backend/frontend verification and API error consistency.
3. Complete OPD visit and queue flow using the existing patient and appointment modules.
4. Add clinical encounter notes, vitals, diagnoses, and prescriptions.
5. Proceed to IPD, billing, pharmacy, laboratory, and integrations in dependency order.

## Non-goals for the first release

- Reproducing any third-party HMS UI or source code exactly
- Claiming regulatory certification without a formal compliance review
- Connecting real payment, SMS, ABDM, or hospital devices without credentials and integration testing
