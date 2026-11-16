# Operations Export

The operations dashboard exposes an authorized CSV snapshot at `GET /api/operations/dashboard.csv`, with the same optional `date=YYYY-MM-DD` query as the JSON dashboard.

The export contains queue section, item, detail, status, and timestamp columns. Values are CSV-escaped server-side, and the endpoint uses the existing `operations.view` permission. The dashboard UI provides a direct Export CSV action.
