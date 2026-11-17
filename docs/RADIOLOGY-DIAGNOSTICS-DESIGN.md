# Radiology Diagnostics Vertical Slice

## Scope

Provide an imaging modality catalog, patient-linked radiology orders, priority and clinical notes, and a report workflow from ordered through performed/reported.

## Invariants and security

- Orders reference existing patients and active imaging modalities.
- Radiology order numbers use the transactional shared sequence service.
- Cancelled orders cannot receive reports.
- Final reports cannot be overwritten. Only finalized reports can receive append-only addenda with a reason, author, and timestamp.
- A linked active referring doctor receives an in-app notification when a final report or addendum is recorded. Notification text excludes clinical findings.
- Report text and impression are validated and attributed to the reporting user.
- All endpoints require authentication and radiology-specific permissions.

## API

- `GET /api/radiology/modalities`
- `GET /api/radiology/orders`
- `POST /api/radiology/orders`
- `PATCH /api/radiology/orders/:id/report`
- `GET /api/radiology/orders/:id/addenda`
- `POST /api/radiology/orders/:id/addenda`

The UI is available at `/radiology` with a searchable worklist, imaging-order form, report-entry form, and final-report addendum history. Critical finding communication, clinician attestation, image management, and RIS/PACS integration remain future work.
