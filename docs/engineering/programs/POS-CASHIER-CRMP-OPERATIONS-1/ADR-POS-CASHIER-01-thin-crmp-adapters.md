# ADR-POS-CASHIER-01: Thin POS adapters over CRMP façades

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-CASHIER-CRMP-OPERATIONS-1 |
| **Date** | 2026-08-16 |

## Decision

POS cashiers open/close Register and Financial Shift through thin POS commands that call existing CRMP operation façades. Cashier identity is `PosAccessContext.userId`. CRMP owner/admin APIs stay on `assertRestaurantAccess`.

Cash in/out/adjustments are **not** exposed: CRMP has no public movement API and movements are not idempotent.

## Rejected

| Alternative | Why |
|-------------|-----|
| `pos_cashiers` table | Second identity — STOP |
| Widen `crmpRouter` to POS grants | Weakens CRMP authorization |
| POS `paid_in` / `paid_out` | No CRMP public API; retry would duplicate money |
| New migration | Existing CRMP tables suffice |
