# Inpatient discharge medication review

## Workflow

Discharge requires inpatient and clinical view/update permissions. Staff can record a separate, source-labeled home medication history in the patient chart (`clinical.create`) and mark an entry no longer current with a reason. At discharge, the clinician reviews both active Medora prescriptions and current reported home medicines. Each needs exactly one continue decision with instructions or stop decision with a reason. Explicit attestations are required for both lists even when empty. The server rechecks both current lists in the discharge transaction and rejects stale, missing, extra, or duplicate decisions.

The discharge form also displays the saved admission decision beside each current reported home medicine. It flags medicines added to the history after admission review and warns when a medicine held or stopped at admission is selected to continue on discharge. Continuing such a medicine requires a documented reason for the change; the server checks this and saves the explanation in the immutable discharge snapshot. If no admission review exists, the form calls that out. The discharge decisions still require an independent review.

The same transaction saves separate snapshots for prescriptions and reported home medicines, including name, dose, frequency, route, home medicine source and source detail, decision, instructions or reason, reviewer, and time; stops selected prescriptions; marks selected home medicines not current; saves the discharge summary; releases the bed; and records a patient audit event. Continuing a prescription leaves it active; continuing a reported home medicine does not create a prescription. A read-only review appears in the discharge view and print layout. Earlier discharges are labeled as historical records without structured review.

A continue decision rechecks the recorded patient allergies against the prescription medicine name and any linked catalog brand and generic name. An exact normalized match blocks discharge until the clinician reviews the record and changes the medication decision or corrects an erroneous allergy. A failed review rolls back all decisions and bed release.

## Boundary

The home medicine list is a recorded report, not a verified best possible medication history. Medora does not import outside prescriptions, pharmacy fills, over-the-counter products, supplements, or administration history automatically. Staff must ask about them and enter them where appropriate, check another reliable source, and resolve duplicate or conflicting entries. The workflow does not create a new take-home prescription, check interactions or duplications, validate doses, or prove that the patient received instructions. The allergy check covers exact normalized names only; it does not detect classes, ingredients, synonyms, cross-reactivity, or interactions. Clinicians must verify the complete medication history and prescribe any changed or new regimen through the approved clinical process. The discharge record is an internal attestation, not a certified electronic signature. The separation of prior medication use from prescribed medicines follows [WHO's transitions of care guidance](https://www.who.int/docs/default-source/patient-safety/who-uhc-sds-2019-9-eng.pdf).

## API

- `GET /api/inpatient/admissions/:id/medication-orders` lists active patient prescriptions for review (`inpatient.view`).
- `GET/POST /api/clinical/patients/:patientId/home-medications` lists or records source-labeled reported medicine history (`clinical.view`/`clinical.create`).
- `POST /api/clinical/patients/:patientId/home-medications/:id/cease` marks a reported medicine not current with a reason (`clinical.create`).
- `PATCH /api/inpatient/admissions/:id/discharge` requires `medicationsReviewed: true`, `homeMedicationsReviewed: true`, and decisions for every active prescription and current reported home medicine (inpatient and clinical view/update permissions).
- `GET /api/inpatient/admissions/:id/discharge-medication-review` returns the saved snapshot and review attribution (`inpatient.view`).
