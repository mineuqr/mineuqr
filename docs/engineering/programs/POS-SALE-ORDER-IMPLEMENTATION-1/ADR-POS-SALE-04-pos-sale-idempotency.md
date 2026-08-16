# ADR-POS-SALE-04: POS Sale Idempotency

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-SALE-ORDER-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

POS-owned idempotency map keyed by restaurant + terminal + cashier + key, with a body fingerprint. Replay the stored canonical Order result. Conflict when the key is reused with a different body.

## Rejected

| Alternative | Why |
|-------------|-----|
| Event `DurableBusinessClaimStore` | Key width 36; no Order result recovery |
| Second generic idempotency platform | Forbidden |
| Unique constraint only on `orders` | Order does not own POS retry identity |
