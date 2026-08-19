# PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1

**Program:** PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1
**Kind:** Controlled performance-hardening implementation
**Date:** 2026-08-19

**FINAL STATUS: PAYMENT CONFIRM CRITICAL PATH TRIM COMPLETE — NO COMMIT PERFORMED**

This program did not split the financial transaction, move Settlement Record or Order Settlement after PAID, change `computeCheckMoney`, move financial authority to React, create a PaymentEngine, or change schema.

---

## 1. Executive Decision

**PASS WITH DOCUMENTED GAPS**

Cashier Confirm still commits Check **PAID**, collection facts, Order Settlement `settled`, and Settlement Record in one Check-owned transaction. Attribution remains detached (`awaitAttribution: false`).

Unnecessary **duplicate CRMP Register/Shift resolution** on the Cashier path is removed: POS resolves once and forwards `settlementContext` into `confirmPayment`. Pre-TX Charge composition + SUM is **one list** instead of two. The **in-TX Charge SUM remains** as freeze authority.

Latency certification remains pending (no production samples in this program).

---

## 2. Baseline

| Fact | Value |
|---|---|
| Branch | `main` (tracks `origin/main`) |
| HEAD | `797c79962e698fb10e98e1ca9a3fc87873058060` |
| Message | `refactor(payment): close confirm payment barrel bypass` |
| Working tree at start | Clean |
| Working tree at end | Modified implementation + tests; untracked report + trim guard (not committed) |
| Production migration terminus | **0095_check_charges** (unchanged; no 0096) |

---

## 3. Before Call Graph

```
Cashier completePayment
  → pos.settlement.initiate
  → PosSettlementInitiateService
       auth + entitlement + getOrderById
       requireForSettlement          ← CRMP resolve #1 (blocking Register/Shift)
       getCheckById                  ← Check read #1 (eligibility)
  → confirmPayment (hints only, awaitAttribution: false)
  → settleCheckPaidByIdDetailed
  → finalizeOpenCheckById
       getCheckById                  ← Check read #2
       ensureOpenCheckChargeComposition  ← Charge list #1
       loadChargesSubtotal               ← Charge list #2
       computeCheckMoney
       resolveSettlementContextForSettle ← CRMP resolve #2
       list ST + validate tenders
       BEGIN withCheckOwnedTransaction
         touchOpenCheck
         loadChargesSubtotal         ← Charge list #3 (authoritative)
         computeCheckMoney
         list ST + validate
         finalizeCheckOutcome PAID
         insertSettlementTransactions
         applyFullSettlementToCheckOrders
         createSettlementRecordForCheckFinalize
       COMMIT
       void Attribution
  → HTTP PAID
```

---

## 4. Root Cause Analysis

Named duplicate work on Cashier Confirm (not “database latency”):

| Source | Where | Why it existed | This program |
|---|---|---|---|
| CRMP Register/Shift resolve twice | POS `requireForSettlement` then finalize `resolveSettlementContextForSettle` | Guards previously forbade reusing outer context; finalize always resolved from hints | **Removed on Cashier.** POS forwards resolved `SettlementContext`. Session/SettleOrderPaid/Counter still resolve once via hints. |
| Charge `SELECT` twice before BEGIN | `ensureOpenCheckChargeComposition` then `loadChargesSubtotal` | Catch-up listed Charges, then listed again to SUM | **Combined** into `ensureOpenCheckChargesSubtotal` (one list when Charges already exist) |
| Charge `SELECT` inside TX | `finalizeOpenCheckById` after `touchOpenCheck` | Lock-consistent freeze vs concurrent Charge writes | **Kept.** Not safe to drop without a race proof. |
| `computeCheckMoney` twice | Pre-TX tender sizing + in-TX freeze | Fail-before-BEGIN then freeze | **Kept.** Cheap vs DB; in-TX result is authority. |
| Check `getCheckById` twice | POS eligibility then finalize | Membership `checkOutcome` can lag the Check row; POS maps `check_already_terminal` | **Kept.** Passing a mutable Check across the TX boundary is not proven safe. |
| `getRestaurantById` twice | POS scope + entitlement `checkLimit` | Separate auth vs commercial POS entitlement | **Kept.** Removing it would mix authorization layers. |
| Attribution | After COMMIT | Already `awaitAttribution: false` on Cashier | **Unchanged.** |
| SR + OS inside COMMIT | Same TX | SR-INV-04 / I-OS-07 | **Unchanged.** Out of scope. |

---

## 5. Changes Made

| File | Operation | Before | After | Why safe |
|---|---|---|---|---|
| `PosRegisterShiftContextService.ts` | CRMP resolve | `requireForSettlement` resolved and discarded the full `SettlementContext` | `requireResolvedContextForSettlement` returns `{ operational, settlementContext }`. `requireForSettlement` wraps it. | Same resolve + same Register/Shift gate. No control removed. |
| `PosSettlementInitiateService.ts` | Confirm transport | Passed `settlementContextHints` only → second CRMP in finalize | Passes `settlementContext` + hints into `confirmPayment`. Still `awaitAttribution: false`. | Finalize already preferred `input.settlementContext ?? resolve`. Cashier now hits the first branch. Register/Shift still required before Confirm. |
| `PaymentConfirmService.ts` | Process façade | Already forwarded `settlementContext` | **No code change** | Already the process boundary. |
| `checkChargeComposition.ts` | Pre-TX Charges | ensure listed; SUM listed again | `ensureOpenCheckChargesSubtotal` catch-up then SUM from the same list | Same catch-up rules. Empty set still snapshots then lists. Live Order totals still unused for money. |
| `CheckService.ts` `finalizeOpenCheckById` | Pre-TX money + context | ensure + `loadChargesSubtotal`; always CRMP when hints present | `ensureOpenCheckChargesSubtotal`; skip CRMP when `settlementContext` provided; `settlementContextReused` stage flag | In-TX `loadChargesSubtotal` + freeze + ST + OS + SR unchanged. Hints-only callers (Session, etc.) still resolve CRMP once. |
| Tests / guards | Boundary protection | Guard forbade context reuse and forbade in-TX `loadChargesSubtotal` (contradicted live code) | Guards require Cashier context reuse; require in-TX Charge SUM | Matches certified freeze law. |

No Cashier React financial files were modified.

---

## 6. Financial Invariants Preserved

Inside `withCheckOwnedTransaction` after this trim, the money slice still contains:

- `loadChargesSubtotal(` (lock-consistent SUM)
- `finalizeCheckOutcome` (Check → PAID + freeze)
- `insertSettlementTransactions` (collection facts)
- `applyFullSettlementToCheckOrders` (Order Settlement → settled)
- `createSettlementRecordForCheckFinalize` (Settlement Record)

It still does **not** contain Attribution or a second CRMP resolve.

Guards: `paymentConfirmCriticalPathTrim.architecture.guards.test.ts`, updated `posSettlementFinancialTxnStage.architecture.guards.test.ts`.

Concurrency suite `CheckService.settlementRecordConcurrency.test.ts` still certifies one PAID / one ST batch / one OS transition / one SR under concurrent finalize.

`computeCheckMoney` semantics unchanged (no formula edit).

---

## 7. Transaction Analysis

### Before TX (Cashier after this trim)

- POS auth, entitlement, Order load, idempotency envelope
- **One** CRMP Register/Shift resolve (required gate)
- Check eligibility read
- finalize Check reload
- **One** Charge list + SUM (catch-up if empty)
- `computeCheckMoney` (fail-fast tenders)
- Reuse SettlementContext (**no** second CRMP)
- ST list + tender validation

### Inside TX (unchanged atomic set)

- `touchOpenCheck` CAS
- Charge SUM (authoritative)
- `computeCheckMoney` freeze
- ST re-validate
- Check PAID + freeze
- Collection facts
- Order Settlement settled
- Settlement Record
- Check reload for return mapping

### After TX (Cashier)

- Fire-and-forget Attribution
- `opsLog` including `settlementContextReused`
- Idempotency put
- HTTP PAID

---

## 8. Latency Instrumentation

Existing `pos_settlement_initiate` timings remain (`durationMs`, `settlementContextMs`, `checkReloadMs`, `orderDiscoveryMs`, `contextResolveMs`, `moneyTxMs`, `attributionMs`, …).

Added diagnostic only: `settlementContextReused` on Check `finalizeStageMs` and POS initiate metadata. Not money, not a new subsystem.

**Latency certification remains pending.** This program collected no production or manual cashier stopwatch samples. Expected (not measured): Cashier `contextResolveMs` ≈ 0 when context is reused; one fewer pre-TX Charge `SELECT`. Do **not** claim the 1–2 second target is met.

---

## 9. Regression Results

All listed suites **passed** (vitest 2.1.9).

| Suite | Result |
|---|---|
| `posSettlementInitiate.order.test.ts` | 27 passed |
| `posSettlementInitiate.architecture.guards.test.ts` | 6 passed |
| `posSettlementFinancialTxnStage.architecture.guards.test.ts` | 6 passed |
| `posRegisterShift.architecture.guards.test.ts` | 4 passed |
| `posRegisterShift.context.test.ts` | 4 passed |
| `cashierSettlementHttpAtFinancialCommit.architecture.guards.test.ts` | 7 passed |
| `paymentConfirmCriticalPathTrim.architecture.guards.test.ts` | 3 passed |
| `paymentConfirm.architecture.guards.test.ts` | 5 passed |
| `paymentConfirmRemainingCallers.architecture.guards.test.ts` | 6 passed |
| `paymentConfirmCompatibilityCleanup.architecture.guards.test.ts` | 5 passed |
| `PaymentConfirmService.test.ts` | 2 passed |
| `checkChargeComposition.test.ts` | 16 passed |
| `CheckService.billLifecycle.hardening.test.ts` | 29 passed |
| `CheckService.financialTxnStage.instrumentation.test.ts` | 14 passed |
| `CheckService.m3.cutover.test.ts` | 4 passed |
| `CheckService.m4.sessionOptionality.test.ts` | 6 passed |
| `CheckService.m5.channelAdoption.test.ts` | 1 passed |
| `CheckService.orderSettlementIntegration.test.ts` | 5 passed |
| `CheckService.settlementRecordConcurrency.test.ts` | 7 passed |
| `checkMoney.test.ts` | 5 passed |
| `settlementInvariants.test.ts` | 14 passed |
| `billChargeComposition.architecture.guards.test.ts` | 7 passed |
| `billSimplification.architecture.guards.test.ts` | 7 passed |
| `paymentCollection.architecture.guards.test.ts` | 6 passed |
| `sessionActions.test.ts` | 8 passed |
| `sessionService.test.ts` | 14 passed |
| `SettleOrderPaidService.test.ts` | 5 passed |
| `StaffCounterPickupSettlementService.test.ts` | 5 passed |
| `cashierPaymentFlow.architecture.guards.test.ts` | 4 passed |
| `cashierPaymentFlowUxCorrection.architecture.guards.test.ts` | 4 passed |
| `cashierTicketMoney.test.ts` | 5 passed |
| `cashierPaymentReadiness.test.ts` | 18 passed |
| `cashierPaymentReadiness.architecture.guards.test.ts` | 3 passed |
| `refundDomain.architecture.guards.test.ts` | 7 passed |
| `splitPaymentDomain.architecture.guards.test.ts` | 7 passed |
| `splitPaymentIntegration.architecture.guards.test.ts` | 5 passed |

Session / SettleOrderPaid / Counter Pickup still enter `confirmPayment` **without** a pre-resolved context (hints only). They still resolve CRMP **once** inside finalize. Complimentary / void / refund / Split / Multi-Check were not routed through this trim.

---

## 10. Production Safety

| Check | Status |
|---|---|
| Schema change | None |
| Migration / 0096 | None; terminus **0095_check_charges** |
| Financial formula | Unchanged |
| Transaction split | None |
| SR / OS atomicity | Unchanged (same TX) |
| Collection store | Still `check_settlement_transactions` |
| Payment aggregate / payments table | None |
| Frontend financial authority | None |
| `awaitAttribution: false` (Cashier) | Preserved |
| Register/Shift required before Cashier collect | Preserved |
| Idempotency / CAS | Preserved (concurrency suite passed) |
| Commit / push | **Not performed** |

---

## 11. Documented Gaps

1. **No measured cashier duration.** Target 1–2s is not certified.
2. **In-TX Charge reload kept.** Pre-TX SUM is no longer a third list, but freeze still lists Charges under CAS.
3. **Duplicate Check read kept** (POS eligibility vs finalize). Membership outcome is not treated as Check SSOT.
4. **Duplicate `getRestaurantById` / `checkLimit` kept** (auth vs POS entitlement).
5. **Pre-TX `computeCheckMoney` kept** for fail-fast tender errors.
6. **POS settlement idempotency store remains in-memory.** Financial safety is Check CAS + ST/SR uniqueness.
7. **SR and OS remain inside COMMIT** by design (out of scope).
8. **Session / SettleOrderPaid / Counter** still resolve CRMP in finalize (they do not pre-resolve a canonical Register/Shift the same way).

---

## 12. Next Step

No further implementation program is required to complete this trim.

If operators need to **certify** the 1–2s target, collect production `pos_settlement_initiate` rows and compare `contextResolveMs` / `orderDiscoveryMs` before vs after deploy. That is measurement, not a new financial architecture.

Do **not** start an async Settlement Record or async Order Settlement program from this work.

---

## Git (no commit)

`git diff --check`: clean

`git diff --stat`: 17 files, **+143 / −21** (tracked). Untracked: trim architecture guard + this report.

**HEAD remains** `797c7996`.

**PAYMENT CONFIRM CRITICAL PATH TRIM COMPLETE — NO COMMIT PERFORMED**
