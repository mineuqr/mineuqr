# ADR-POS-SALE-03: Cashier / Terminal Attribution

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-SALE-ORDER-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

Cashier = authenticated user via PosAccessContext / opsLog. Terminal = canonical POS Terminal UUID on existing station fulfilment stamps (`stationId` + `fulfilmentLabel`). Do not add `posCashierId` or new Order columns.

## Rejected

| Alternative | Why |
|-------------|-----|
| New Order cashier/terminal columns | Broader Order redesign — STOP |
| Device / hardware / IP as terminal | Violates POS Terminal identity |
| Client-supplied cashierId | Forgable |
