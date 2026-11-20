# HMS Module Inventory

**Status vocabulary:** Verified = matching backend and/or frontend implementation found. Partial = implementation exists but coverage or completeness needs confirmation. Missing = no clear implementation found in the inspected tree.

| Requested capability | Current evidence | Status | Priority |
|---|---|---:|---:|
| Patient registration and management | `patients` backend/frontend, patient entities, documents, history, consent, communications, audit | Verified / broad | Critical |
| OPD management | appointments, visits, check-in, clinical encounter workflows | Verified / partial | Critical |
| IPD and admission management | inpatient module, admissions, beds, transfers, discharge reviews | Verified / broad | Critical |
| Doctor management | doctors, schedules, leave, fees, documents, doctor workspace/account link | Verified | High |
| Appointment and scheduling | appointments, status history, doctor time slots | Verified | High |
| Nursing management | care plans, observations, handoffs, medication administration | Verified / broad | Critical |
| EMR | clinical encounters, diagnoses, allergies, history, consents, addenda, signing/revisions | Verified / partial | Critical |
| Pharmacy | prescriptions, fulfillment, inventory, procurement, supplier invoices, FEFO/quarantine paths | Verified / broad | Critical |
| Laboratory/LIS | catalog, orders, collection, results, verification, critical results, communications, archives | Verified / broad | Critical |
| Radiology | orders, modalities, resources, scheduling, communications, addenda, report archives | Verified / broad | High |
| Billing and payments | invoices, payments, refunds, ledgers, cashier closeouts, deposits, receivables, charge master | Verified / broad | Critical |
| Insurance and claims | insurance claims and billing panel/service | Verified / partial | High |
| Operation theatre | operating rooms, surgery cases, surgery UI/API | Verified / partial | High |
| Emergency | emergency cases and triage UI/API | Verified / partial | Critical |
| Bed and ward management | ward, bed, transfers, inpatient UI/API | Verified | Critical |
| Inventory and procurement | pharmacy inventory/procurement; suppliers and purchase orders | Verified / partial | High |
| Staff and HR | users, departments, doctors, duty shifts, roster | Partial | Medium |
| Payroll | no clear payroll module/entity/route found | Missing | Low |
| Reports and analytics | operations/reports frontend and operations API; domain reports present | Verified / partial | High |
| Admin and role management | users, roles, permissions, menus, hospital profile | Verified | Critical |
| Patient portal | no distinct patient portal frontend/module found | Missing | Medium |
| Doctor portal | `doctor-frontend`, doctor workspace and prescriptions | Verified / partial | High |
| Hospital notifications | notifications module/entity/UI | Verified | High |
| Discharge and medical certificates | discharge summaries and medication reviews found; standalone certificate workflow not clear | Partial | High |

## Additional implemented areas

Ambulance dispatch, blood bank, vaccination, glucose monitoring, intake/output, expenses, fixed assets, support tickets, staff chat, automation settings, interoperability/FHIR laboratory export, registration-source reporting, and backup/restore tooling are present.

## Module assessment rules for implementation

Before changing a module, verify its route contract, permission codes, entity relationships, migration history, frontend entry points, seed/menu records, smoke coverage, and failure/empty/loading states. “Verified” above means code presence, not production readiness.
