# BILL-SIMPLIFICATION-1

Certified baseline HEAD: `6be3beb7ea3e10659cfa3199059063cea456a51f`
(`feat(financial): establish bill payment collection`)
Branch: `main`
Production schema: **0095_check_charges** (hash `02f6ad22…12d08cca`, journal id `6234102`)

Prior certified programs:

- BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 = PASS (`514a9a6f`)
- BILL-CHARGE-COMPOSITION-HARDENING-1 = PASS (`9da5cd02`)
- BILL-FINANCIAL-LIFECYCLE-HARDENING-1 = PASS (`3211d736`)
- PAYMENT-COLLECTION-ARCHITECTURE-1 = PASS (`6be3beb7`)

This program does not rewrite CheckService, Payment, Order, Refund, Settlement Record, or Reporting. No migration 0096. No new table. No new engine.

**Result: PASS**

---

## A. Executive Summary

After Charge composition and Payment collection, Bill still carried a few proven-obsolete leftovers:

1. `computeCheckMoney` accepted an Order-named `ordersSubtotal` alias.
2. Five CheckService getters that only forwarded to existing `load*` functions had **zero** TypeScript consumers.
3. Paid finalize copied the same amountDue / collection-line assembly twice (pre-TX and in-TX).

Those are removed or collapsed. Bill money is Charge-only. amountDue has one derivation:

```
amountDue = Bill.grandTotal − SUM(captured monetary settlement transactions)
```

Payment persistence remains `check_settlement_transactions` written in the existing finalize TX. Complimentary remains a Bill outcome. Lifecycle remains OPEN → PAID | COMPLIMENTARY | VOIDED.

CheckService is still the Check-aggregate mutation façade (Split Payment, Multi-Check Allocation, Order Settlement, Refund). Those wrappers were **not** deleted: they have write consumers and moving them would be a redesign.

---

## B. Before Architecture

```
ORDER (operational)
   │ correlation / enrollment
   ↓
BILL / CheckService
   ├── Charges → computeCheckMoney (chargesSubtotal, plus ordersSubtotal alias)
   ├── Discount, frozen tax, currency snapshot, lifecycle
   ├── amountDue assembled twice inside finalizeOpenCheckById
   ├── Collection command settleCheckPaid* (ST insert in same TX)
   ├── Dead read wrappers (getSplitPaymentsForCheck, …)
   ├── Split Payment / Multi-Check / OS / Refund mutation façades
   └── Settlement Record publication
          ↓
       PAYMENT fact = check_settlement_transactions
          ↓
       SETTLEMENT RECORD
          ↓
       REPORTING (unchanged, outside Bill)
```

---

## C. Current Ownership Audit

| Responsibility | Current Owner | Correct Owner | Action | Reason |
|---|---|---|---|---|
| Bill total (Charges → discount → frozen tax → grandTotal) | `computeCheckMoney` / CheckService | Bill | KEEP | Certified Charge money path |
| `ordersSubtotal` alias on Bill money | `checkMoney.ts` | None | REMOVE | Order-named compatibility; production already used `chargesSubtotal` |
| Charge composition / correction | CheckService + charge composition | Bill / Charge | KEEP | Core simplification from prior programs |
| Tax / currency snapshot | Bill freeze policy | Bill | KEEP | Historical money must not use live Settings |
| Bill-level discount | Check / `billDiscountAmount` | Bill | KEEP | One Bill discount |
| Lifecycle OPEN / PAID / COMPLIMENTARY / VOIDED | CheckService + repository `WHERE outcome='open'` | Bill | KEEP | Certified terminal lifecycle |
| amountDue | Duplicated in finalize; formula in `remainingCollectible` | Bill reads collection facts | CONSOLIDATE | One helper `billAmountDueFromCollection` |
| Collection command + ST insert in finalize TX | CheckService | Payment collection (existing path) | KEEP | Moving ST write is Payment redesign → STOP |
| Tender validation (`assertPaidSettlementLines`) | `settlementInvariants` used by finalize | Payment rules at collect time | KEEP | Required by collection, not a new engine |
| Dead FSP/allocation **read** getters on CheckService | CheckService | Integration `load*` functions | REMOVE | Zero consumers |
| Split Payment / allocation **mutations** | CheckService façades | Check aggregate (certified) | KEEP | Write services consume them |
| `check_order_membership` | Membership service | Correlation / enrollment / catch-up | KEEP TABLE | Not money authority; still required |
| `check_order_settlements` | OS integration in finalize | Order publication | KEEP | Not Bill amount authority; still published |
| Refund `refundableBalance` | Refund budget from SR history | Refund | KEEP OUTSIDE | No Refund redesign |
| Settlement Record | Finalize publication | Settlement publication | KEEP | No SR redesign |
| Revenue / Payment Method Analytics | Reporting | Reporting | KEEP OUTSIDE | No reporting change |
| Session `ordersTotalAmount` | Session (operational) | Session | KEEP OUTSIDE | Not Bill money |
| Cashier amountDue display fallback | POS / cashier UI | Presentation | KEEP OUTSIDE | Confirm still uses Check grandTotal |

---

## D. Removed Responsibilities

- Bill money no longer accepts `ordersSubtotal`.
- CheckService no longer re-exports unused FSP/allocation reads:
  - `getSplitPaymentsForCheck`
  - `getSplitPaymentAttemptsForCheck`
  - `getCheckOutstandingBalance`
  - `getMultiCheckAllocationsForSourceCheck`
  - `getMultiCheckAllocationByIdentity`
- Duplicate paid-collection assembly in `finalizeOpenCheckById` (pre-TX and in-TX copies).

Not removed (consumers or certified boundary):

- `insertSettlementTransactions` in finalize
- `settleCheckPaid*`
- Charge reconcile / cancel compensation
- Split Payment / Multi-Check / OS / Refund **mutations**
- Membership and Order Settlement tables

---

## E. Responsibilities Kept

Bill still answers:

1. What is owed? (`grandTotal` from Charges + discount + frozen tax)
2. What composes the amount owed? (append-only Charges)
3. What tax policy applies? (`TaxPolicySnapshot`)
4. What discount applies? (`billDiscountAmount`)
5. What currency applies? (`CurrencySnapshot`)
6. What is the lifecycle state? (`open` / `paid` / `complimentary` / `voided`)
7. Is it financially terminal? (`CHECK_TERMINAL_OUTCOMES` + `WHERE outcome='open'`)

amountDue is derived at collect time from Bill grandTotal minus captured monetary ST. It is not a stored Bill column.

---

## F. Payment Boundary

```
Bill determines obligation (Charges → grandTotal).
Payment determines collection (check_settlement_transactions).
```

- No `payments` table.
- No PaymentEngine / PaymentOrchestrator / PaymentAggregate.
- Complimentary ST lines are excluded from monetary collection (`capturedCollectionAmounts`).
- Overpayment still rejected.
- Zero-obligation OPEN Bill with no captured ST still allows the historical `other` / `0.00` default line.
- CheckService local `resolvePaidCollectionLines` is a helper, not a new service.

---

## G. Order Boundary

CheckService Bill calculation does not call `getOrdersByIds`, `loadOrdersSubtotal`, or `ordersTotalAmount`.

Order remains:

- enrollment / correlation (`check_order_membership`)
- catch-up / Charge origin
- Order Settlement publication (`check_order_settlements`) using `orderTotalSnapshot` **for Order coverage**, not Bill grandTotal

`ordersSubtotal` remains only on the Order Settlement money helpers (`orderSettlementMoney.ts` / `orderSettlementInvariants.ts`). That is OS domain, not Bill amount.

---

## H. Session Boundary

Session remains an operational façade (`ensureOpenCheckForSession`, `markPaid` → Check settle, close guards). Session totals are not Bill financial authority. No Session redesign.

---

## I. Settlement Boundary

- Settlement Record still published in the same finalize TX.
- Order Settlement still applied in that TX.
- `check_settlement_transactions` remains the collection fact store.
- Refund still uses Settlement Record history (`refundableBalance`).
- No Settlement redesign. No new event types.

---

## J. Simplification Changes

1. `CheckMoneyInput.chargesSubtotal` is required; `ordersSubtotal` alias deleted.
2. `billAmountDueFromCollection(grandTotal, lines)` wraps `capturedCollectionAmounts` + `remainingCollectible`.
3. `resolvePaidCollectionLines` is the single paid-line resolver used pre-TX and in-TX.
4. Five dead CheckService getters and their barrel exports deleted.
5. Payment-collection architecture guards now assert `billAmountDueFromCollection` / `resolvePaidCollectionLines` instead of requiring the lower-level names inside CheckService.
6. New `billSimplification.architecture.guards.test.ts`.

No CheckService rewrite. No new Bill engine. No 0096.

---

## K. Deleted Code

| Deleted | Replacement / remaining path |
|---|---|
| `computeCheckMoney({ ordersSubtotal })` | `chargesSubtotal` only |
| `getSplitPaymentsForCheck` | `loadSplitPaymentsForCheck` (unchanged) |
| `getSplitPaymentAttemptsForCheck` | `loadPaymentAttemptsForCheck` |
| `getCheckOutstandingBalance` | `loadCheckOutstanding` |
| `getMultiCheckAllocationsForSourceCheck` | `loadAllocationsForSourceCheck` |
| `getMultiCheckAllocationByIdentity` | `loadAllocationByIdentity` |
| Copied amountDue / captured / already-collected blocks in finalize | `billAmountDueFromCollection` + `resolvePaidCollectionLines` |

No ops taxonomy deletions: `check_collection_rejected` and `check_terminal_transition_rejected` remain reachable.

No Bill-related error types deleted: `SettlementValidationError` / `CheckTransitionError` / `DiningSessionValidationError` still apply.

---

## L. Tests

Primary suite (this program): **140 passed** (15 files), including:

| Area | Evidence |
|---|---|
| Bill money | `checkMoney.test.ts` — Charges, discount, frozen tax, grandTotal |
| amountDue | `settlementInvariants.test.ts` — remaining + `billAmountDueFromCollection` (complimentary excluded) |
| Order isolation | lifecycle hardening + m3 — `getOrdersByIds` not called for Bill money |
| Payment / PAID | lifecycle hardening — overpayment, collection, terminal reject |
| Lifecycle | OPEN → PAID / COMPLIMENTARY / VOIDED; terminal rejects |
| Charge | `checkChargeComposition.test.ts` + lifecycle hardening |
| Concurrency / SR | `CheckService.settlementRecordConcurrency.test.ts` |
| POS Check read | `posRead.check.test.ts` |
| Guards | charge, lifecycle, payment collection, **bill simplification** |

Additional façade regression (unchanged mutation wrappers): split payment, multi-check allocation, m5, Settlement Record integration, Refund integration, POS payment-flow boundary — **17 passed**.

Required matrix (program §41) is covered by the existing certified tests plus the amountDue helper test. No certified tests were deleted.

An unrelated pre-existing failure exists in `settlementRecordMigration.architecture.guards.test.ts` (expects the string `0076_settlement_records` in `migration-governance-lib.cjs`, which now records canonical tail **0095**). This program did not change that file or Settlement Record schema. It is out of scope.

---

## M. Architecture Guards

`shared/operational-session/__tests__/billSimplification.architecture.guards.test.ts` (7 tests):

1. Bill calculation does not load live Order / Session totals (`chargesSubtotal` only).
2. No `payments` table, no 0096, no PaymentEngine; collection facts remain ST.
3. Order Settlement and membership are not amount authority on money refresh / paid finalize.
4. Charge-based Bill; terminal lifecycle; Complimentary is a Bill outcome; no reopen.
5. No BillEngine / Refund redesign / new financial root.
6. No `0096*` SQL file.
7. Dead CheckService read wrappers gone; mutation façades and `settleCheckPaidByIdDetailed` remain.

Payment-collection guards updated for the consolidated amountDue helper (same formula, fewer names in CheckService).

---

## N. Production Validation

Read-only probe `2026-08-19T01:17:44.637Z` via existing `_preflight-readonly.mjs after`.

| Gate | Result |
|---|---|
| Access | Production TiDB Cloud `mineuqr` |
| Journal terminus | **0095** hash `02f6ad22808cf79e6a54ae2d174d0bce310760f4b7de425c69e3739f12d08cca` (id `6234102`) |
| 0096 | **absent** |
| `check_charges` | exists (3 rows) — not rewritten |
| `check_order_membership` | exists (140 rows) |
| operational_checks | 140 |
| settlement_records | 111 |
| orders | 120 |
| Mutation | NONE |

No customer financial write. No backfill. No historical rewrite.

---

## O. Complexity Scorecard

| Metric | Before | After |
|---|---|---|
| CheckService exported async functions | 46 | 41 |
| CheckService non-empty lines | 1643 | 1615 |
| Bill money Order-named alias | `ordersSubtotal` | none |
| Bill → live Order total reads in CheckService | 0 | 0 |
| Bill → Session `ordersTotalAmount` | 0 | 0 |
| Payment-specific **dead read** wrappers on CheckService | 3 | 0 |
| Duplicate amountDue assembly in finalize | 2 copies | 1 helper |
| Obsolete CheckService wrappers removed | — | 5 |
| Architecture guard files (Bill/Payment simplification) | 3 | 4 |
| Migrations / new tables | 0095 / none | 0095 / none |
| New engines / financial roots | 0 | 0 |

Domain git diff (excluding new guard file / this report): net **−13** lines (81 insertions / 94 deletions). The new guard file is required by the program and does not add runtime Bill behavior.

CheckService is **smaller**, not rewritten. It is not “Bill-only”: certified Check-aggregate mutation façades remain (documented in §P).

---

## P. Remaining Legacy

- CheckService remains the mutation façade for Split Payment, Multi-Check Allocation, Order Settlement, and Refund. Deleting those would break certified write paths.
- Collection facts are still inserted inside `finalizeOpenCheckById`. Extracting a Payment persistence service would be Payment redesign.
- `check_order_membership` and `check_order_settlements` remain. Neither is Bill amount authority.
- `check_split_payments` remains a separate FSP domain, not cashier collection SSOT.
- POS / Session still discover the Check via Order/Session. Confirm uses Bill grandTotal.
- Cashier Order-total fallback display remains presentation-only.
- amountDue is computed at settle time, not stored on the Bill row.
- Local variable leftover naming in older Order Settlement helpers (`ordersSubtotal`) is OS-owned.

---

## Q. Final PASS / BLOCKED

**PASS**

Bill is smaller and clearer. Charges remain Bill-owned. Financial calculation is Charge-based. Lifecycle is unchanged. Bill does not own a Payment table, PaymentEngine, or live Order/Session totals. Payment remains collection on `check_settlement_transactions`. Settlement Record remains publication. Reporting, Order, Refund, and Payment collection semantics were not redesigned. No 0096. No historical rewrite. Tests and simplification guards passed. Production journal remains 0095.
