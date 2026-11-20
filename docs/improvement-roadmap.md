# Medora HMS phased roadmap

**Basis:** Static repository audit, 20 November 2026. Proposal only; no code, schema or production changes are authorized by this document.

## Phase 0 — Establish baseline

Record deployment, database version, current roles and real hospital workflows. In an isolated synthetic-data environment, run builds, clean migrations, representative upgrade, integration and browser smoke checks, backup restore, and role-specific walkthroughs. Build a route → permission → role → UI action → audit-event matrix.

**Exit:** Reproducible results, migration/restore evidence, defect list and named risk owners.

## Phase 1 — Secure shared foundations

Resolve high-impact auth/RBAC gaps; decide whether login should return a JWT in JSON. Define patient-document storage/access/retention and export policy. Standardize validation, errors, filtering/pagination, financial write idempotency and audit behavior. Add automated permission and state-transition checks to CI. Establish safe logs, request IDs, alerts and backup monitoring.

**Depends on:** Phase 0 findings. **Exit:** Approved permission matrix, security review and critical regression gates.

## Phase 2 — Complete the outpatient journey

Deliver small vertical slices: identity/deduplication → OP registration and appointment → doctor queue/encounter/vitals/history → lab/radiology order/result review → prescription and print → pharmacy fulfillment → bill/payment/receipt. Check linkage to the same patient and encounter, cancellation/revision audit, tablet usability and each staff role's permitted actions.

**Depends on:** Phase 1 contracts/permissions/audit plus seeded doctors, departments, services, medicines and reviewed prices. **Exit:** Front desk, doctor, diagnostics, pharmacy and cashier complete success and failure journeys with synthetic patients.

## Phase 3 — Validate inpatient and high-risk operations

Verify admission/bed transfer, nursing handoff and medication administration, discharge, emergency escalation, theatre and blood-bank traceability. Test lab/radiology verification, critical results, released reports and addenda. Reconcile pharmacy batches/expiry/procurement, billing refunds, cashier closeout, deposits, receivables and insurance claims.

**Depends on:** Stable patient/encounter identity, audit and transaction standards. **Exit:** Clinical and finance owners approve workflow and reconciliation evidence.

## Phase 4 — Decide actual missing scope

With client requirements, assess patient portal, medical certificates, multi-site operation, HR/payroll and named external integrations. For each, record owner, policy, vendor/interface, data boundary, acceptance criteria and migration impact before implementation.

**Depends on:** Stable core journeys and explicit client scope. **Exit:** Only requested modules proceed to delivery.

## Release gate for every phase

Use synthetic data in development. Review API permissions, validation, audit, migration and restore plans. Pass automated checks and human walkthroughs of success, duplicate, cancellation, error and recovery paths. Record deployment and rollback owners, known limits and hospital acceptance before go-live.
