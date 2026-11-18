# FHIR R4 Patient Identifier Search

The endpoint GET /api/fhir/r4/Patient?identifier=&lt;exact-MRD&gt; returns a FHIR R4 Bundle with type "searchset" for one exact Medora MRD identifier.

## Contract

- Authentication and the patients.export permission are required.
- identifier is required, 2 to 40 characters, and accepts Medora MRD characters only: letters, digits, underscores, and hyphens. Missing, invalid, or repeated identifier parameters return 422.
- MRD matching uses the database collation configured for the patient MRD field; deployments that require case-sensitive identifiers must configure that collation accordingly.
- The result has total 0 and no entry when no MRD matches, or total 1 with one Patient resource when it does.
- Responses use application/fhir+json and Cache-Control: private, no-store.
- A returned Patient is audited in that patient's log. Unknown identifiers do not create a patient audit event.

This is an exact identifier lookup, not a general FHIR patient search, directory, profile validator, or external exchange interface.
