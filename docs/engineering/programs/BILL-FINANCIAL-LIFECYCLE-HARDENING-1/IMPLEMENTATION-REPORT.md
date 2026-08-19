# BILL-FINANCIAL-LIFECYCLE-HARDENING-1

Certified baseline HEAD: `9da5cd02c87f84eef842dca25d79000a2bd8648a`
Branch: `main`
Production schema: **0095_check_charges** (unchanged; no 0096)

Prior certified programs:

- BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 = PASS (`514a9a6f`)
- BILL-CHARGE-COMPOSITION-HARDENING-1 = PASS (`9da5cd02`)

## A. Executive Summary

Bill already used `open | paid | complimentary | voided` with `WHERE outcome='open'` on money writes and finalize. This program made that lifecycle explicit and closed the Charge + terminal race.

OPEN is the only mutable financial state. PAID, COMPLIMENTARY, and VOIDED are terminal. Terminal Bills cannot return to OPEN, cannot accept Charges, and cannot change financial composition.

No Payment Aggregate. No Refund redesign. No Settlement Record redesign. No Order redesign. No lifecycle engine. No migration.

**Result: PASS**

## B. Current Bill Lifecycle

Domain names (preserved):

| Intended | Existing enum |
|---|---|
| OPEN | `open` |
| PAID | `paid` |
| COMPLIMENTARY | `complimentary` |
| VOIDED | `voided` |

Source: `CHECK_OUTCOMES` / `CHECK_TERMINAL_OUTCOMES` in `shared/operational-session/check/checkContract.ts`.

```
OPEN
  │  Charges may be added/corrected (append-only)
  │  financial amount may change
  │  Bill remains collectible
  ├──────────────┬──────────────┐
  ↓              ↓              ↓
PAID       COMPLIMENTARY      VOIDED
```

All three terminal states are terminal. No reopen command exists. None was added.

## C. State Transition Matrix

| From | To OPEN | To PAID | To COMPLIMENTARY | To VOIDED |
|---|---|---|---|---|
| OPEN | — (already open) | allowed | allowed | allowed |
| PAID | rejected | `CheckTransitionError` (idempotent reject) | rejected | rejected |
| COMPLIMENTARY | rejected | rejected | `CheckTransitionError` | rejected |
| VOIDED | rejected | rejected | rejected | `CheckTransitionError` |

Duplicate terminal command against an already-terminal Bill throws `CheckTransitionError` (`Cannot finalize check from outcome ${outcome}`). This preserves SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1. It is deterministic. It is not “return the existing paid Check.”

## D. Terminal State Invariants

After PAID / COMPLIMENTARY / VOIDED:

- `finalizeCheckOutcome` is `UPDATE … WHERE outcome='open'` — 0 rows aborts
- `updateCheckMoney` is `UPDATE … WHERE outcome='open'`
- `touchOpenCheck` is `UPDATE … WHERE outcome='open'` — 0 rows means terminal
- Charge insert requires a successful `touchOpenCheck` after a nonempty correction plan
- `decideCheckRecalculation` / `isCheckFinanciallyMutable` refuse recalc when terminal or `totalsFrozenAt != null`
- Explicit `applyOpenOrderChargeReconciliation` on a terminal Bill throws `CheckTransitionError`

Rejected mutations: new Charge, Charge correction, discount write via `updateCheckMoney`, currency/tax snapshot rewrite, reopen.

## E. Charge Interaction

| Path | Terminal behavior |
|---|---|
| `snapshotChargesForEnrolledOrder` (paid backfill enroll) | silent no-op (`applied: false`, `blocked: "terminal"`) |
| `compensateChargesForCancelledOrder` (Order cancel) | silent no-op so Order cancel does not fail |
| `applyOpenOrderChargeReconciliation` (explicit correction) | **throws** `CheckTransitionError` |
| Charge + finalize race | OPEN-row lock; if finalize wins, Charge insert is refused; if Charge commits first, finalize reloads Charges inside the TX |

Existing Charge money remains immutable. Corrections stay append-only.

## F. Session Interaction

Session remains the operational façade.

- `markPaid` / `markComplimentary` call `settleCheckPaidByIdDetailed` / `settleCheckComplimentaryByIdDetailed`
- Session close requires a financially complete Check (`assertSessionCloseable`) and does not auto-pay
- Session `ordersTotalAmount` is operational / presentation. After settle, Session metadata copies `check.grandTotal` — Bill → Session, never Session → Bill
- `sessionAggregateReaders` may compute live Order totals for Session aggregates. That path is not Bill calculation

Session is not financial authority, Payment authority, or Revenue authority.

## G. Order Isolation

- Order status / served / completed does **not** pay the Bill
- `OrderLifecyclePolicy` has no Check settle calls
- `SettleOrderPaidService` / cashier pickup settle are **explicit financial commands**, not Order-status side effects
- Order cancel on a terminal Bill does not reopen or insert Charges
- Order changes after PAID / COMPLIMENTARY / VOIDED cannot mutate Bill money
- Post-paid Order correction remains a Refund-program dependency

`check_order_membership` is enrollment / correlation / catch-up discovery only. It is not Bill money authority.

## H. Payment Boundary

**Not implemented in this program.**

Current PAID dependency (documented only):

- `resolveStaffSettlementLines` / `defaultPaidSettlementLine`
- `insertSettlementTransactions` (`check_settlement_transactions`)
- `applyFullSettlementToCheckOrders` (legacy Order Settlement)

There is no `remainingCollectible` field or API in the Check domain. Do not invent a second collection SSOT. A future Payment Aggregate would own collected amount.

## I. Refund Boundary

**Not implemented in this program.**

`refundableBalance` already exists in the separate Refund program and is derived from Settlement Record history (`refundBudget.ts`). That authority is not redesigned here. Post-paid Charge correction remains a future Refund/adjustment dependency.

## J. Settlement Boundary

`check_order_settlements` is unchanged. It is still applied inside the same Check-owned finalize TX (`applyFullSettlement` / complimentary / void). It is not Bill money authority.

Settlement Records are still created in the same finalize TX. Schema, lifecycle, and Revenue SSOT were not modified. No historical SR rewrite.

## K. Concurrency

Existing mechanism only: Check-owned transaction + conditional `UPDATE WHERE outcome='open'`.

Added `touchOpenCheck` so Charge insert and terminal finalize serialize on the same OPEN row:

1. Finalize holds the OPEN row, reloads Charges, then flips outcome. A waiting Charge insert sees 0 rows and refuses.
2. Charge insert holds the OPEN row, inserts, commits. Finalize then locks, reloads the latest Charge sum, and freezes that money.

Concurrent `markPaid` + `void` / `complimentary`: exactly one `finalizeCheckOutcome` wins; losers throw `CheckTransitionError`. Certified by existing SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1 tests (2 / 5 / 10 racers).

## L. Idempotency

Preserved. Repeated `settleCheckPaid` / complimentary / void against an already-terminal Bill throws `CheckTransitionError`. No new idempotency framework.

## M. Tests

Primary suite: **11 files, 93 passed**

| Area | File | Notes |
|---|---|---|
| Transitions + rejects + races + tenant | `CheckService.billLifecycle.hardening.test.ts` | 24 tests |
| Charge lock / terminal no-op | `checkChargeComposition.test.ts` | 16 tests |
| Freeze mutability | `freezePolicy.test.ts` | 3 tests |
| Guards | `billFinancialLifecycle.architecture.guards.test.ts` | 7 tests |
| Charge composition guards | `billChargeComposition.architecture.guards.test.ts` | 7 tests |
| Regression | m3, m4, m5, financialTxn, concurrency, orderSettlement | 36 tests |

Additional Session regression: `sessionService.test.ts` (14), `sessionActions.test.ts` (7), `checkMembershipService.test.ts` (6) — passed.

Pre-existing (not introduced here): `checkManagement.architecture.guards.test.ts` expects `voidCheckById` inside `sessionService.ts`. Session void is already routed through `operationalSessionLifecycle`. Session was not changed.

## N. Architecture Guards

`shared/operational-session/__tests__/billFinancialLifecycle.architecture.guards.test.ts` enforces:

1. Terminal money writes stay `WHERE outcome='open'`
2. No reopen command / no `BillLifecycleEngine`
3. Bill calculation cannot load live Order totals or `ordersTotalAmount`
4. `check_order_membership` is not used in Bill money refresh
5. Order lifecycle does not pay the Bill
6. No Payment / Refund aggregate or lifecycle engine
7. No migration 0096

Observability (existing `opsLog`):

- `check_terminal_transition_rejected`
- `check_charge_on_terminal_rejected`

## O. Production Validation

Read-only probe (`_preflight-readonly.mjs after`) at `2026-08-19T00:43:16.820Z`:

| Gate | Result |
|---|---|
| Access | Production TiDB Cloud `mineuqr` |
| Journal terminus | **0095** hash `02f6ad22808cf79e6a54ae2d174d0bce310760f4b7de425c69e3739f12d08cca` (id `6234102`) |
| hash0095 count | 1 |
| 0096 | **absent** (repo journal + disk) |
| `check_charges` | exists; 2 rows |
| `check_order_membership` | exists; 139 rows |
| Counts | checks 139, settlement_records 110, orders 119, membership 139 |

Count growth vs the 0095 apply report (checks 137 / SR 108 / orders 117) is live restaurant activity, not a rewrite of historical Settlement Records.

No real financial collection was performed for this program. Historical financial rows and Settlement Records were not mutated by this hardening.

## P. Remaining Gaps

- No `remainingCollectible`. Payment consolidation is a future program.
- `refundable` stays on the existing Refund / Settlement Record path. Not a Bill-lifecycle SSOT.
- Enroll snapshot and Order-cancel Charge compensation remain silent no-ops on terminal Bills so operational backfill/cancel do not fail. Explicit correction throws.
- `check_order_settlements` remains legacy coupling. Retirement is a separate program.
- PAID still depends on current settlement-line + Order Settlement publication. Do not treat that as the future Payment Aggregate.
- Order has no item-add/edit/remove API. `applyOpenOrderChargeReconciliation` is the Bill-side hook when that signal exists.

## Q. Complexity Review

BEFORE:

```
Bill → Charges → Bill calculation
```

TARGET / AFTER:

```
OPEN Bill → Charges → financial calculation → terminal outcome → immutable Bill
```

Not created:

- new Aggregate
- new table
- new financial SSOT
- BillLifecycleEngine / state-machine service
- new event bus
- new Payment layer
- new Settlement layer
- migration 0096

Minimal changes: `touchOpenCheck`, in-TX Charge reload before finalize, `blocked: "terminal"` + throw on explicit correction, existing `opsLog` events.

## R. Final PASS / BLOCKED

**PASS**

Bill lifecycle is explicit. OPEN is the only mutable financial state. PAID, COMPLIMENTARY, and VOIDED are terminal and cannot return to OPEN. Terminal Bills cannot accept Charges. Existing Charges remain immutable. Bill calculation remains Charge-only with frozen tax policy. Session and Order remain operational. Payment, Refund, Settlement Record, and Reporting were not redesigned. No unnecessary migration. Tests and architecture guards passed. Production remains 0095.
