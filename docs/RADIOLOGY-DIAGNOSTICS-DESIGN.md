# Radiology Diagnostics Vertical Slice

## Scope

Provide an imaging modality catalog, patient-linked radiology orders, priority and clinical notes, and a report workflow from ordered through performed/reported.

## Invariants and security

- Orders reference existing patients and active imaging modalities.
- Radiology order numbers use the transactional shared sequence service.
- Cancelled orders cannot receive reports.
- Report text and impression are validated and attributed to the reporting user.
- All endpoints require authentication and radiology-specific permissions.

## API

- `GET /api/radiology/modalities`
- `GET /api/radiology/orders`
- `POST /api/radiology/orders`
- `PATCH /api/radiology/orders/:id/report`

The UI is available at `/radiology` with a searchable worklist, imaging-order form, and report-entry form.
