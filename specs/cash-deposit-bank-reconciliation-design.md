# Feature: Cash deposit bank reconciliation

## Requirements

While a signed-in staff member has the `billing.reconcile` permission, when they submit a bank statement date and reference for an active cash deposit, the system shall record one attributed bank-statement match.

While a deposit is voided, when a staff member tries to match it, the system shall reject the request. While a deposit is bank matched, when a staff member tries to void it, the system shall reject the request.

While another deposit already uses a statement reference, when a match is submitted with that reference, the system shall reject the request.

## Architecture

### Frontend

- The cash-closeout panel shows recorded, voided, and bank-matched states in text.
- Authorized staff can supply a statement date and reference through the existing deposit table action.
- The existing alert and loading states show success and API validation failures.

### Backend

- `POST /api/billing/deposits/:id/reconcile` accepts `statementDate` and `statementReference`.
- Zod validates date and reference length at the route boundary.
- `cash_deposit_settlements` stores one match for a deposit and a globally unique statement reference.
- A transaction locks the related closeout and deposit, checks current state, and records the matching actor and time.

### Security

- Authentication is required by the billing router.
- `billing.reconcile` is enforced at the API boundary; the UI only hides unavailable controls.
- Statement input is length-constrained and trimmed. Queries use repository parameters rather than string interpolation.
- Responses expose only operational identifiers, dates, references, and staff names; they do not expose credentials or bank account data.

## API contract

`POST /api/billing/deposits/:id/reconcile`

```json
{ "statementDate": "2026-11-18", "statementReference": "BANK-REF-1234" }
```

Returns the existing deposit representation with additive nullable fields: `statementDate`, `statementReference`, `matchedByName`, and `matchedAt`.

## Verification

- Integration coverage verifies authorization, date validation, a successful match, duplicate deposit matching, duplicate statement references, rejection of a voided deposit, and rejection of a void after matching.
- Backend and frontend production builds, local migration and seed, and browser smoke run before release.
