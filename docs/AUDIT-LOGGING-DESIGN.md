# System Audit Logging

## Scope

Capture a minimal, non-sensitive audit record for mutating HTTP actions and expose a paginated administrator view for compliance and incident investigation.

## Recorded fields

Request ID, authenticated user, method, route path, response status, module, client IP, user-agent, and timestamp. Request bodies, credentials, tokens, and clinical payloads are intentionally excluded.

## Controls

- Audit writes occur after the response finishes and cannot change the request outcome.
- The log table has indexes for time and user investigation.
- Read access requires the dedicated `audit.view` permission.
- The endpoint validates pagination, method, status class, date, and search inputs.

## API/UI

- `GET /api/audit-logs`
- UI: `/audit-logs`
- Supports pagination, method/status/date/search filters, retry, and empty states.
