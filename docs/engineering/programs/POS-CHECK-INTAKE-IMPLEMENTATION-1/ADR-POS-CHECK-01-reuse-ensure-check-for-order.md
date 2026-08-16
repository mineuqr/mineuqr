# ADR-POS-CHECK-01: Reuse ensureCheckForOrder

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-CHECK-INTAKE-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

POS Check Intake is a POS-authorized command that calls existing `ensureCheckForOrder`. Do not create a POS Check aggregate, table, or session.

## Rejected

| Alternative | Why |
|-------------|-----|
| POS Check table | Second financial authority — STOP |
| Fabricate a dining Session | Session redesign — STOP |
| Treat SALE_CREATE as intake | Access ≠ financial enrollment |
| Reuse `pos_sale_idempotency` | Sale and Check lifecycle are different commands |
