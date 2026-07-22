# SPLIT-PAYMENT-INTEGRATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Integration (Check Aggregate orchestration) |
| **ADR** | ADR-ARCH-024 · ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 |
| **Prior** | SPLIT-PAYMENT-DOMAIN-1 · PERSISTENCE-1 · MIGRATION-EXECUTION-1 (0074 applied) |

---

## Objective

Connect the certified Split Payment Domain and Repository to the Financial Settlement Platform so the **Check Aggregate** is the only mutation authority, with atomic Check-owned transactions covering Payment persistence, Order Settlement updates, and collected Domain events.

---

## Delivered

| Artifact | Path |
|----------|------|
| Check Aggregate SP orchestration | `server/operational-session/check/checkSplitPaymentIntegration.ts` |
| Check Aggregate wiring + tx ownership | `server/operational-session/check/CheckService.ts` |
| Barrel exports | `server/operational-session/check/index.ts` |
| Integration tests | `server/operational-session/check/__tests__/checkSplitPaymentIntegration.test.ts` |
| Transaction ownership tests | `server/operational-session/check/__tests__/CheckService.splitPaymentIntegration.test.ts` |
| Architecture guards | `shared/operational-session/__tests__/splitPaymentIntegration.architecture.guards.test.ts` |

---

## Command flow (enforced)

```
Application
  → Check Aggregate (CheckService / withCheckOwnedTransaction)
    → checkSplitPaymentIntegration
      → Split Payment Domain commands
      → Split Payment Repository (SessionDbClient)
      → Order Settlement Integration (applyPartialSettlementForOrder)
        → Order Settlement Domain → Repository
```

No API / Controller / UI / Repository bypass of Aggregate commands.  
No direct `check_order_settlements` mutation from Split Payment.

---

## Atomicity (INTEGRATION ATOMICITY)

Within a single Check-owned transaction (`withCheckOwnedTransaction`):

| Step | Participates |
|------|----------------|
| Check open validation | Yes (read) |
| Split Payment Domain | Pure (in-memory) |
| Split Payment persistence | Yes (`SessionDbClient`) |
| Order Settlement updates (on apply) | Yes (via OS Aggregate integration) |
| Outstanding snapshot event | Collected in result |
| Domain events | Collected — **not** published / no bus |

On any failure: transaction rolls back; no partial Payment + OS state; events not observable outside the failed unit of work.

---

## Integrated Aggregate commands

| CheckService | Integration |
|--------------|-------------|
| `createSplitPaymentOnCheck` | `createPaymentOnCheck` |
| `authorizeSplitPaymentOnCheck` | `authorizePaymentOnCheck` |
| `captureSplitPaymentOnCheck` | `capturePaymentOnCheck` |
| `applySplitPaymentOnCheck` | `applyPaymentOnCheck` (+ OS portions) |
| `allocateSplitPaymentTendersOnCheck` | `allocateTendersOnCheck` |
| `fail` / `cancel` / `void` / `refund` | matching `*PaymentOnCheck` |
| Payment Attempt start / succeed / fail / cancel | historical attempt APIs |
| `getCheckOutstandingBalance` | Check-owned Outstanding read |

---

## Outstanding Balance

- Owned by Check Aggregate (`grandTotal` responsibility − applied Payment value).
- Recalculated after capture / apply / void / refund that changes value-received set.
- Emits Domain `OutstandingUpdated` event contract (collected).
- Never implies Check Financial Settlement (`impliesFinancialSettlement` remains false).

---

## Idempotency (ADR-ARCH-021)

- Domain outcomes `applied` \| `already_applied` \| `no_change` respected.
- Create: existing `paymentId` → `already_applied` (no insert / no events).
- Duplicate key race → reload as `already_applied`.
- Already-applied authorize/capture → no repository update.

---

## Out of scope (confirmed)

No Domain redesign · No Persistence schema changes · No projections · No APIs · No UI · No Event Bus / Outbox · No Payment Gateway.

---

## Ready for

**SPLIT-PAYMENT-PROJECTION-1** — may consume collected Domain events / Payment reads without further Aggregate redesign.
