# Laboratory Diagnostics Vertical Slice

## Scope

Provide a laboratory test catalog, patient-linked investigation orders, and a controlled result workflow from ordered to collected/processing/completed.

## Invariants and security

- Orders reference existing patients and active laboratory tests.
- Order numbers are allocated transactionally through the shared number sequence service.
- Cancelled orders cannot receive results.
- Result values, units, ranges, and notes are validated server-side and attributed to the user who entered them.
- All endpoints require authentication and laboratory-specific permissions.

## API

- `GET /api/laboratory/tests`
- `GET /api/laboratory/orders`
- `POST /api/laboratory/orders`
- `PATCH /api/laboratory/orders/:id/result`

The UI is available at `/laboratory` and supports order creation, searchable worklist review, and result entry.
