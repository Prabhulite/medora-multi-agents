# Operations Dashboard Vertical Slice

## Scope

Provide an authenticated management cockpit that aggregates today’s appointments, active admissions, available beds, outstanding billing, pharmacy stock risk, and pending laboratory/radiology work.

## Invariants and security

- Dashboard data is read-only and scoped to the requested operational date.
- Each queue is sourced from the existing domain repositories, so the dashboard does not maintain a second copy of clinical or financial state.
- The endpoint requires authentication and the `operations.view` permission.
- Alerts are derived from current low-stock, expiry-watch, and open-balance conditions.

## API

- `GET /api/operations/dashboard`
- Optional query: `date=YYYY-MM-DD`

The UI is available at `/operations` with KPI cards, queues, alerts, loading states, retry handling, and responsive layouts.
