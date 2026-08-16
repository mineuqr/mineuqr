# ADR-POS-SALE-01: POS Sale as Order Command

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-SALE-ORDER-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

Represent POS Sale as an orchestration command into `IdentityPlaceOrder`. Do not create a POS Order aggregate or `pos_sales` / `pos_order_lines` tables.

## Rejected

| Alternative | Why |
|-------------|-----|
| POS Order aggregate | Second Order Domain — STOP |
| Direct DB insert from POS router | Bypasses Order ownership |
| Bypass IdentityPlaceOrder | No architectural evidence it is unsafe for station/counter + `cashier_pos` |
