# VSRI Medora delivery checklist

Source is the VSRI quotation, sections 05–23. Check items only after they pass on the configured hospital environment. Existing screens are implementation starting points.

## Software acceptance

- [ ] Reception registers a new patient, obtains a unique Patient ID, looks up returning patients, and reviews visit, consultation and prescription history.
- [ ] Reception books and reschedules a doctor appointment, checks availability in the calendar, updates appointment status, and moves the patient through the OP queue.
- [ ] A linked physician selects a patient, reviews prior visits and prescriptions, and records diagnosis, consultation notes, treatment and follow-up.
- [ ] A physician selects medicine and records dosage, frequency, duration and instructions. The prescription includes doctor details, is printable and can be retrieved later.
- [ ] Repeat the physician workflow on the agreed tablet, including consultation entry and prescription print preview.
- [ ] Pharmacy configures medicines and categories, receives purchased batches, dispenses or sells medication, and verifies quantities, expiry, low stock notices and transaction history.
- [ ] Cashier adds configured consultation and service charges, generates and prints an invoice, records payment, and checks pending balances and billing history. Include pharmacy billing in the test.
- [ ] Management verifies registration, appointment, consultation, doctor, pharmacy, billing and payment reports for a day and a month. Check totals against sample transactions. The Reports page now includes doctor and pharmacy activity; the complete report set still needs workflow verification.
- [ ] Administrator configures the hospital profile, departments, doctors, staff accounts, staff status, roles and system settings.
- [ ] Verify reception, physician, pharmacy, billing, management and administrator accounts against the approved permissions, including direct API access.

## Hospital configuration and handover

- [ ] Obtain confirmed hospital profile, departments, doctor details, staff roster, medicine catalog, services and actual consultation and service prices.
- [ ] Agree tablet quantity and specifications, deploy to the approved environment, and verify access from the hospital network.
- [ ] Run staff acceptance tests and resolve findings. Orient authorized users, hand over operational instructions and agree the initial support contact and process.

The quotation separates these deliverables from commercial milestones. Hardware, payments, final acceptance and handover require coordination with the parties named in the proposal. Payment gateways, third-party integrations, messaging API charges and advanced analytics are outside the quoted scope.

## Trial evidence

- [x] An isolated integration database verifies API workflows for patient records, appointments, clinical records, prescriptions, pharmacy stock, invoices, payments and receivables. The trial consultation price is test data only.
- [x] Backend and frontend production builds complete.
- [ ] Browser workflow verified end to end for reception, physician, pharmacist and cashier on desktop and tablet widths.
- [ ] Confirm approved consultation, service and medicine prices before entering live billing data.

## Doctor tablet and pharmacy handoff

- [x] The doctor workspace opens a recent patient's chart or prescription entry. The chart records blood pressure, pulse, blood glucose, respiratory rate, temperature, oxygen saturation and weight with the consultation.
- [x] The dedicated prescription form saves a catalog medicine, dose, frequency, duration, quantity, route and instructions. The saved record opens a print preview with the linked doctor's name and registration number when the account is linked.
- [x] Pharmacy lists outstanding catalog prescriptions, starts dispensing with the patient and prescription selected, and calculates remaining quantity from stock transactions. An isolated integration test covers partial and complete dispensing.
- [ ] Verify the complete path visually on the agreed tablet and print to the hospital's intended printer. Browser access was unavailable in the current workspace session; no device or printer was supplied.
