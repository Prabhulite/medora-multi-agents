# FHIR R4 Laboratory DiagnosticReport Export

Medora provides a read-only FHIR R4 `DiagnosticReport` export for a released laboratory report:

`GET /api/fhir/r4/DiagnosticReport/laboratory/:id`

The endpoint requires an authenticated user with both `patients.export` and `laboratory.view`. It returns `application/fhir+json` with `Cache-Control: private, no-store`.

## Safety boundary

Only reports that have completed the full laboratory workflow—result entry, independent verification, release, and immutable archive creation—are exported. Draft, collected, processing, verified-but-unreleased, cancelled, missing, or archive-less reports cannot be exported.

The resource includes the laboratory order identifier, local test code and name, patient reference, release time, result value/unit, and reference range. Each successful export is recorded in the patient's audit trail.

The export intentionally excludes clinical notes, critical-result rationale, communication records, user contact details, and unapproved corrections. It reads the immutable release archive so the exported report is anchored to the released record.

## Terminology and scope

The coding system is Medora's local test-code namespace (`{APP_URL}/codes/laboratory-tests`). It is not a LOINC mapping and does not claim national interoperability, ABDM compatibility, regulatory certification, analyzer connectivity, or LIS/PACS integration. Those require hospital-approved terminology, consent, contracts, and validation.

## User interface

A released Laboratory report shows **Export FHIR R4** only to users who have both required permissions. The action downloads the JSON resource; it does not modify the report, archive, or clinical result.
