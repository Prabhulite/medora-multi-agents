# Pharmacy Inventory Vertical Slice

## Scope

Track medication lots with expiry, cost/selling price, reorder levels, storage location, and an immutable stock movement ledger. The slice supports authenticated inventory listing, receiving stock, and dispensing stock.

## Invariants

- A batch is unique per medication and batch number.
- Receipts and stock changes are written in one database transaction.
- Dispensing locks the batch row, rejects expired lots, validates the patient when supplied, and cannot reduce quantity below zero.
- All endpoints require authentication and the dedicated `pharmacy.inventory.*` permission.

## API

- `GET /api/pharmacy/inventory`
- `POST /api/pharmacy/inventory/receipts`
- `POST /api/pharmacy/inventory/dispense`

The frontend presents stock by batch and exposes FEFO ordering so pharmacy staff can issue the nearest-expiry lot first.
