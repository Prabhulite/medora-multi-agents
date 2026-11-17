# Inpatient discharge medication review

## Workflow

Discharge requires both `inpatient.update` and `clinical.update`. The clinician opens the discharge form, reviews the patient's active prescriptions, and chooses exactly one decision per prescription: continue with discharge instructions, or stop with a reason. An explicit review attestation is required even when there are no active prescriptions. The server rechecks the current active list in the discharge transaction and rejects stale, missing, extra, or duplicate decisions.

The same transaction saves a snapshot of each medicine name, dose, frequency, route, decision, instructions or reason, reviewer, and time; stops selected prescriptions; saves the discharge summary; releases the bed; and records a patient audit event. Continuing a prescription leaves it active. A read-only review appears in the discharge view and print layout. Earlier discharges are labeled as historical records without structured review.

A continue decision rechecks the recorded patient allergies against the prescription medicine name and any linked catalog brand and generic name. An exact normalized match blocks discharge until the clinician reviews the record and changes the medication decision or corrects an erroneous allergy. A failed review rolls back all decisions and bed release.

## Boundary

This reviews active prescriptions recorded in Medora. It does not import home medicines, over-the-counter products, outside prescriptions, or medication administration history into the reconciliation list. It does not create a new take-home prescription, check interactions or duplications, validate doses, or prove that the patient received instructions. The allergy check covers exact normalized names only; it does not detect classes, ingredients, synonyms, cross-reactivity, or interactions. Clinicians must verify the complete medication history and prescribe any changed or new regimen through the approved clinical process. The discharge record is an internal attestation, not a certified electronic signature.

## API

- `GET /api/inpatient/admissions/:id/medication-orders` lists active patient prescriptions for review (`inpatient.view`).
- `PATCH /api/inpatient/admissions/:id/discharge` requires `medicationsReviewed: true` and a `medicationReview` decision for every active prescription (`inpatient.update` and `clinical.update`).
- `GET /api/inpatient/admissions/:id/discharge-medication-review` returns the saved snapshot and review attribution (`inpatient.view`).
