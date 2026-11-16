# Pharmacy Procurement Vertical Slice

## Scope

Manage active suppliers and purchase orders for medication replenishment. A purchase order can be created with one or more medication lines and received into inventory as a single goods-receipt batch.

## Invariants and security

- Supplier codes and purchase-order numbers are unique.
- Purchase orders reference active suppliers and active medications only.
- Receipt is transactional: inventory batches, stock movements, item received quantities, and order status update together.
- A received or cancelled order cannot be received again.
- All routes require authentication, dedicated procurement permissions, and Zod validation.

## API

- `GET/POST /api/pharmacy/suppliers`
- `GET/POST /api/pharmacy/purchase-orders`
- `POST /api/pharmacy/purchase-orders/:id/receive`

The UI is available at `/pharmacy/procurement` and links procurement records to the inventory ledger.
