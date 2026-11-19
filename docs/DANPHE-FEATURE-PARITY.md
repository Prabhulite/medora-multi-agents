# Danphe reference comparison

Reference is the local `hospital-management-emr-master` source, especially `Code/Websites/DanpheEMR/wwwroot/DanpheApp/src/app/app-routing.constant.ts` and its module routing files. This is a functional comparison, not permission to copy its code, database, branding or country-specific defaults. A tab is complete only when its data model, API, role checks, screen, and workflow test work together.

## Existing Medora workflows to retain and deepen

- [x] Patient registration, chart, history and MRD
- [x] Appointments, calendar, OP queue and doctor workspace
- [x] Admissions, beds, nursing and discharge
- [x] Billing, cashier, invoices, payments and insurance claims
- [x] Pharmacy inventory, batch receiving, dispensing and purchasing
- [x] Laboratory, radiology, emergency and operating theatre
- [x] Reports, users, roles, audit logs and notifications
- [x] Staff chat, support tickets and expense activities at a basic level

## Distinct reference modules missing or materially smaller

- [x] Admission intake/output chart for ward care with recorded volumes and totals. Reference `clinical/clinical-routing.module.ts` (`InputOutput`).
- [x] Serial blood glucose monitoring with individual readings and context. Reference `clinical/clinical-routing.module.ts` (`BloodSugarMonitoring`). Trend visualization remains a further enhancement.
- [ ] Nursing consultation requests with clinician response and status. Reference `nursing/nursing-routing.module.ts` (`ConsultationRequests`).
- [ ] Structured active/past problems and family, surgical and social history. Reference `doctors/doctors-routing.constant.ts` (`ProblemsMain`).
- [ ] Clinical documents and scanned images attached to the patient chart. Reference `doctors/doctors-routing.constant.ts` (`ClinicalDocuments`, `ScannedImages`).
- [ ] Vaccination patient list, vaccine/dose records, appointments and reports. Vaccine catalog, dose records and filtered report now work; appointment scheduling for future doses remains.
- [ ] Maternity patient workflow, payment view and reports. Reference `maternity/maternity-routing.module.ts`.
- [ ] CSSD sterilization pending/finalized items and integrated report. Reference `cssd/cssd-routing.module.ts`.
- [ ] Fixed assets register, maintenance, depreciation/disposal and substore dispatch. Register, maintenance log, disposal fields and straight line depreciation display now work; substore dispatch remains.
- [ ] Ward supply and substore requisition, issue, return and stock reconciliation. Reference `wardsupply/wardsupply-routing.module.ts`.
- [ ] Separate procurement approval, purchase and receipt workflows beyond pharmacy purchasing. Reference `procurement/procurement-routing.module.ts` and `inventory/inventory-routing.module.ts`.
- [ ] Full accounting with ledgers, journals, fiscal periods and reconciliation beyond Medora's billing and expenses. Reference `accounting/accounting-routing.module.ts`.
- [ ] Employee HR and payroll beyond staff accounts and duty rosters. Reference `employee` and `payroll-module/payroll-routing.module.ts`.
- [ ] Incentive and commission accounting. Reference `incentive/incentive-routing.module.ts`.
- [ ] Social service and charity subsidy workflow. Reference `ssu/ssu-routing.module.ts`.
- [ ] Marketing referral tracking. Reference `mktreferral/mktreferral-routing.module.ts`.
- [ ] Order verification, claim review and diagnostics workflow parity. Reference `verification`, `claim-management`, `orders`, `labs`, and `radiology` routing files.
- [ ] Reference-specific dispensary, queue display, scheduling and reporting details where Medora's current screens do not yet cover the actual operation.

## Country and deployment decisions

- [ ] Review Nepal government insurance, SSF and Nepali receipt modules with the client before adapting them. They are jurisdiction-specific and should not be enabled by default for an Indian deployment.
- [ ] Confirm which facility types, departments, assets, vaccine schedules, accounting rules and payroll obligations this client actually uses. Do not preload clinical schedules or prices from the reference.
- [ ] Run role-by-role browser acceptance on desktop, tablet and printer for every completed workflow.

## Implementation order

1. Vaccination and fixed assets as new self-contained modules.
2. CSSD and ward supply with inventory links.
3. Maternity and medical record expansion with patient chart links.
4. Procurement, accounting, payroll and financial reporting.
5. Remaining referral, incentives, insurance and country-specific features after client configuration.

Keep these checkboxes open until each workflow is tested against Medora's database and permissions. The reference contains far more than a single navigation change; adding menu labels alone would misrepresent completion.

## Verified implementation slices

- [x] Isolated database migration and API checks for vaccination catalog, dose records, duplicate prevention, patient history and report filtering.
- [x] Isolated database API checks for glucose reading validation and retrieval.
- [x] Isolated database API checks for fixed asset registration, maintenance and invalid disposal rejection.
- [x] Isolated database API checks for admission intake/output validation, recording and totals.
- [ ] Browser acceptance on the client's desktop, tablet and printer with assigned non-admin roles.
