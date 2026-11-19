# Medora small ZIP comparison

The supplied ZIP contains three applications: an admin frontend, a doctor frontend, and a PostgreSQL backend. Medora currently uses one React frontend and a MySQL backend. Feature code needs adaptation to Medora's patient IDs, role permissions, migrations and API contracts. Subscription and payment-plan features are excluded by the owner's earlier instruction.

## Working in Medora

- [x] Patients, clinical chart and history
- [x] Appointments and calendar view
- [x] OPD queue and check-in
- [x] Inpatient beds and nursing handoffs
- [x] Emergency, surgery, laboratory and radiology
- [x] Prescriptions inside patient chart and dispensing in pharmacy
- [x] Billing, cashier and patient bill printing
- [x] Pharmacy inventory and supplier purchasing records
- [x] Operations reporting, audit logs and notifications

## Additional ZIP workflows to adapt

- [x] Nursing-station navigation opens the existing admissions and nursing workbench
- [x] Prescriptions entry opens the existing patient chart Rx workflow after patient search
- [x] Suppliers entry opens the existing pharmacy purchasing supplier tab
- [x] Reports page combines patient registration, appointments, billing, inventory and operations data
- [ ] Staff chat has message history and access controls; reference real-time delivery and UI details remain
- [ ] Support tickets and responses work; reference attachment upload and UI details remain
- [ ] Supplier purchase orders, invoices and payments work; reference document upload and supplier dashboard details remain
- [ ] Activities and expenses ledger works; reference activity options and UI details remain
- [x] Internal appointment and prescription reminder settings with scheduled notifications
- [ ] External WhatsApp, SMS and email automation from the reference (provider credentials and hospital consent workflow required)
- [ ] Revenue analytics beyond current billing and operations reports
- [ ] Clinic management and requests if the hospital needs multiple independent clinics
- [ ] Doctor onboarding requests and approvals
- [ ] Match reference UI across desktop, tablet and phone
- [ ] Verify every adapted workflow against Medora's API and role permissions

A visual match cannot establish workflow equivalence. Each item is complete only after the UI, API, schema and relevant tests work together.
