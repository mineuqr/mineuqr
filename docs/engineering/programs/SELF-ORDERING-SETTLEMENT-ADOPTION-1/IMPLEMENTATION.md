# SELF-ORDERING-SETTLEMENT-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | SELF-ORDERING-SETTLEMENT-ADOPTION-1 |
| **Phase** | Implementation |
| **Priority** | P0 |
| **Date** | 2026-07-24 |
| **Prerequisite** | SELF-ORDERING-SETTLEMENT-ADOPTION-AUDIT-1 (BLOCKED → Root Cause Identified) |
| **Authority** | ADR-ARCH-018 · ADR-ARCH-022 · ADR-ARCH-026 |
| **Verdict** | **SELF ORDERING SETTLEMENT ADOPTION CERTIFIED** |

---

## Executive Summary

Self Ordering (kiosk / station) now completes the certified financial lifecycle:

```
Place Order → Register Payment → Check Finalize → Settlement Record
  → Success → Receipt → Settlement History → Reporting
```

Adoption reuses **only** the existing Check settle pipeline (`settleCheckPaidByIdDetailed` → `finalizeOpenCheckById` → Settlement Record). No second settlement model, no alternate SR writer, no reporting forks.

---

## Self Ordering Settlement Flow

```
KioskCheckoutStage (review)
  → order.placeWithIdentity (+ ensureCheckForOrder)
  → Register Payment UI
  → order.settlePaid
       → SettleOrderPaidService.settleOrderPaid
            → findBlockingMembershipForOrder (resolve Check)
            → settleCheckPaidByIdDetailed   // CERTIFIED
                 → finalizeOpenCheckById
                 → ST + OS + createSettlementRecordForCheckFinalize
       → return settlementRecordId
  → Settlement Success + Receipt (order.getSettlementReceipt)
  → Tracking / confirmation
```

| API | Auth | Role |
|-----|------|------|
| `order.settlePaid` | Public + `trackingToken` | Settle façade |
| `order.getSettlementReceipt` | Public + `trackingToken` | Receipt from SR |

---

## Payment UX

Kiosk checkout steps:

1. **Review** — Place Order (deferred tracking navigation)  
2. **Payment** — Outstanding → Methods → Amount Paid → Remaining → **Register Payment**  
3. **Success** — confirmation + Receipt / Completed (tracking)

No allocation, accounting, or technical internals exposed.

`OrderingCheckoutProvider` supports `deferTrackingNavigation` so place does not jump to confirmation before settle.

---

## Settlement Pipeline Adoption

| Step | Implementation |
|------|----------------|
| Resolve Check | `findBlockingMembershipForOrder` (+ `ensureCheckForOrder` if missing) |
| Finalize | `settleCheckPaidByIdDetailed` |
| SR publication | Inside Check finalize TX (unchanged) |
| Return id | `settlementRecordId` / `settlementNumber` |
| Idempotency | Already-paid Check → existing SR; race → list SR |

File: `server/order/application/SettleOrderPaidService.ts`

---

## Settlement Record Validation

- Exactly one SR per settle generation (existing SR-INV-05 uniqueness).  
- Façade does **not** call `insertSettlementRecord` / `createSettlementRecord`.  
- Idempotent retries return the same `settlementRecordId`.

---

## Settlement History Validation

Self Ordering SRs appear via existing `settlementRecord.listByRestaurant` — no channel-specific History code. Sessionless Checks (`sessionId: null`) are already tenant-scoped by `restaurantId`.

---

## Reporting Validation

No reporting code added. Reporting continues to consume Settlement Records only; finalized Self Ordering Checks publish SR rows and therefore enter Revenue / Tax / Payment Methods / exports automatically.

---

## Receipt Validation

Customer receipt uses `order.getSettlementReceipt` → `settlementRecordReadService.getReceipt` (Settlement Record snapshot). Print uses the same payload. No legacy order-total receipt writer.

---

## Runtime Trace

| Step | Status |
|------|--------|
| Browse / Cart / Checkout | Existing kiosk |
| Place Order | `placeWithIdentity` + open Check |
| Register Payment | New kiosk payment step |
| Check Finalize | `settleCheckPaidByIdDetailed` |
| Settlement Record | Created in finalize TX |
| Success + Receipt | Kiosk success + public SR receipt |
| History / Reporting | Automatic via SR read / reporting adapters |

---

## Architecture Compliance

| Rule | Status |
|------|--------|
| ADR-018 channel governance | Place + settle separated; façade is Order-bound settle entry |
| ADR-022 Order Settlement under Check | OS materialize after settle (same as Session path) |
| ADR-026 Check sole Monetary AR; SR from finalize only | **Compliant** |
| Single settle pipeline | Only `settleCheckPaidByIdDetailed` |
| No duplicate financial writers | Guarded in architecture tests |

---

## Regression Tests

| Suite | Result |
|-------|--------|
| `SettleOrderPaidService.test.ts` (4) | PASS |
| `selfOrderingSettlementAdoption.architecture.guards.test.ts` (4) | PASS |

Guarantees:

- Reuses `settleCheckPaidByIdDetailed`  
- Idempotent paid Check  
- Tracking token gate  
- Kiosk UX Place → Register Payment  
- No `insertSettlementRecord` in façade  

Table / Waiter / QR Session Mark Paid paths unchanged.

---

## Production Validation

| Check | Evidence |
|-------|----------|
| API surface | `order.settlePaid`, `order.getSettlementReceipt` on `appRouter` |
| Pipeline reuse | Façade → `settleCheckPaidByIdDetailed` only |
| Zero-epoch | First kiosk settle creates first SR visible in History |
| Operator History | Same Settlements tab — no channel filter required |

**Operator smoke (post-deploy):**

1. Kiosk: Place Order → Register Payment (cash) → Success  
2. Dashboard → Settlements → row present  
3. Open Receipt from kiosk success  
4. Reports: revenue reflects paid SR  

---

## Files Changed

### Server

- `server/order/application/SettleOrderPaidService.ts` (new)  
- `server/order/application/__tests__/SettleOrderPaidService.test.ts` (new)  
- `server/routers.ts` — `order.settlePaid`, `order.getSettlementReceipt`

### Client

- `client/src/pages/kiosk/KioskCheckoutStage.tsx` — Place → Pay → Success  
- `client/src/lib/ordering-client/checkout/checkoutTypes.ts` — `deferTrackingNavigation`  
- `client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx`  
- `client/src/lib/ordering-client/__tests__/selfOrderingSettlementAdoption.architecture.guards.test.ts` (new)

### Docs

- `docs/engineering/programs/SELF-ORDERING-SETTLEMENT-ADOPTION-1/IMPLEMENTATION.md`

---

## Final Verdict

# SELF ORDERING SETTLEMENT ADOPTION CERTIFIED

Self Ordering settles through the certified Check Settlement Platform; Settlement Records appear in History and Reporting without a parallel financial pipeline.
