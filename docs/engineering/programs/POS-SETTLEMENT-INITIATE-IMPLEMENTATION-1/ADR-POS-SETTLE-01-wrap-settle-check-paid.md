# ADR-POS-SETTLE-01: Wrap settleCheckPaidByIdDetailed

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

POS Settlement Initiation is a POS-authorized command that calls existing `settleCheckPaidByIdDetailed`. Do not create a POS settlement aggregate, a `settling` Check state, a POS payment ledger, or a new Production migration.

Existing Check outcome CAS and Settlement Record uniqueness remain the financial idempotency/concurrency authority (ADR-ARCH-021, ADR-ARCH-022). POS adds only an in-memory command retry envelope, matching Check Intake.

## Rejected

| Alternative | Why |
|-------------|-----|
| POS Settlement / Payment / Tender table | Second financial authority — STOP |
| Invent Check `initiated` / `settling` | Rewrites Check Domain — STOP |
| Reuse public `order.settlePaid` | Tracking-token / publicProcedure; wrong auth contract |
| Reuse `StaffCounterPickupSettlementService` | Hidden Register/Shift prerequisite — STOP |
| Accept client tenders/totals | POS would become financial authority — STOP |
| New `0094` POS settlement idempotency SQL | Existing Check CAS + command envelope suffice locally |
| Grant settlement via owner/admin/`POS_ACCESS` | Weakens explicit POS permission model |
