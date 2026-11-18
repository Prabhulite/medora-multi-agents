# Medora HMS - Deployment Readiness and Function Report

Date: 18 November 2026. Revision: c58947e. Status: conditionally ready for hospital acceptance testing; production release awaits site-specific gates.

## Executive result

Frontend and backend production builds pass. The MySQL-backed integration suite passes. The authenticated headless Chrome workflow suite passes. The backup and restore round trip passes, including overwrite and checksum safeguards. These checks show implemented paths are connected to the APIs, but they do not prove every UI action, role, real device, or clinical process in a live hospital.

## Architecture

Browser (React 19, TypeScript, Vite) -> same-origin Nginx reverse proxy -> Express API (TypeScript/Node) -> TypeORM -> MySQL 8. Authentication uses a session cookie and permission-based middleware. Database changes use versioned migrations with runtime schema synchronization disabled. Docker Compose runs MySQL, backend, and frontend; the frontend binds to localhost port 80 and needs a separate public HTTPS reverse proxy. Health and database readiness endpoints are available at `/health` and `/health/ready`.

The backend separates routes, validation, controllers, services, and entities. The frontend separates route guards, UI controls, feature pages, API clients, and brand tokens. Data and access controls remain server-side; browser navigation permissions are presentation controls.

## Function map and typical users

| Area | Main functions | Typical users | Evidence |
| --- | --- | --- | --- |
| Identity and administration | Login, users, roles, permissions, dynamic menus, account security | Administrator | Integration API checks; authenticated browser session |
| Patient records | Registration, demographic updates, MRD, clinical history, timeline, communications, consent, FHIR export | Reception, clinicians | Integration and browser checks |
| Appointments and OPD | Booking, availability, slots, reschedule, check-in, visit, calendar | Reception, doctors | Integration and browser calendar check |
| Doctor workspace | Own appointments, recent patients, chart navigation | Linked doctor | API integration; frontend build |
| Inpatient and emergency | Admissions, beds, ward workflow, emergency encounters | Clinical and ward staff | Integration and browser checks |
| Surgery and nursing | Scheduling, operating workflow, medication administration | Clinical staff | Integration checks |
| Laboratory | Orders, collection, result, verification, release, addenda, audit, FHIR report | Lab staff | Integration and browser checks |
| Radiology | Orders, scheduling, reports, release, archives, communication | Radiology staff | Integration and browser checks |
| Pharmacy | Inventory, expiry, quarantine, FEFO, dispensing, purchasing, prescriptions | Pharmacists and doctors | Integration and browser checks |
| Billing and insurance | Invoices, payments, cashier close, receivables, insurance | Billing staff | Integration and browser checks |
| Operations | Worklists, notifications, roster, ambulance, blood bank, reports | Operations staff | Integration and browser checks |

## Verification completed on 18 November 2026

- Backend TypeScript production build: PASS.
- Frontend TypeScript and Vite production build: PASS.
- Full MySQL API integration check: PASS; includes permissions and clinical, diagnostic, pharmacy, billing, and account workflows.
- Authenticated headless Chrome smoke check: PASS; includes dashboard, appointment calendar, mobile dashboard width, laboratory, radiology, pharmacy, inpatient, registration, billing, and OPD screens.
- Database backup/restore check: PASS; migrated schema, seed, overwrite refusal, checksum rejection.
- Production dependency audit: frontend 0 findings; backend 3 moderate transitive findings in TypeORM glob/minimatch. No high or critical findings at the configured audit gate.
- Git working tree before report: clean.

## Deployment configuration and gates

1. Provision a hospital-controlled host, DNS, HTTPS reverse proxy, firewall, and encrypted off-host backup destination. The Compose frontend binds only to localhost.
2. Set unique production `DB_PASSWORD`, `JWT_SECRET`, `SUPER_ADMIN_PASSWORD`, and public HTTPS `APP_URL` and `FRONTEND_URL`. Never reuse local demonstration credentials.
3. Run migrations and seed on the target database; check `/health` and `/health/ready` over the public HTTPS address.
4. Schedule and monitor encrypted backups; run a restore into an isolated database and retain a signed record of the drill.
5. Create representative roles and staff accounts; verify permitted and denied paths for each role.
6. Have clinical owners approve OPD, inpatient, pharmacy, laboratory, radiology, emergency, and billing outcomes with non-real test patients.
7. Record release commit, build output, migration result, dependency audit, backup evidence, operator, and rollback procedure.

## Tomorrow's hands-on acceptance script

- Reception: register a test patient; search by MRD; book, reschedule, check in, and open the visit.
- Doctor: sign in with a linked doctor account; review My Practice, history and allergies; prescribe and print the medication list and clinical summary.
- Lab and radiology: order, collect/schedule, enter, verify, release, and print a test result; attempt a forbidden action with an unrelated role.
- Pharmacy: receive a batch; check expiry and quarantine; dispense against a prescription; verify FEFO and allergy blocks.
- Billing: create and settle an invoice, inspect cashier and receivables reports; test a refund/void with the correct permission.
- Ward and emergency: admit and transfer a test patient, administer medication, and close the clinical event.
- Mobile and accessibility: inspect 390px and desktop layouts, keyboard order, labels, errors, and print previews.
- Record screen, role, steps, expected/actual result, timestamp, and a screenshot for every issue. Do not use real patient information in issue reports.

## Known limitations

This audit is a release candidate check, not a certification of clinical safety or legal compliance. Live HTTPS, backup schedule, alerts, production restore drill, exhaustive role testing, browser/device coverage, performance under load, and staff usability acceptance remain unverified. Automated patient messaging needs provider credentials and consent rules. Multi-branch isolation and barcode pharmacy flows are not complete. A moderate transitive dependency audit finding remains under review; forcing the suggested TypeORM major upgrade would be breaking.

## Decision

Ready for controlled acceptance testing tomorrow. Do not open production to real patients until site-specific deployment, security, recovery, and clinical sign-off gates above pass.
