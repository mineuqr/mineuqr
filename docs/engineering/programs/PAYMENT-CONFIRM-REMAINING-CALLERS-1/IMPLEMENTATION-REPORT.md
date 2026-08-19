# PAYMENT-CONFIRM-REMAINING-CALLERS-1

Certified baseline HEAD: `8c5e6ddbcae8d3ae1c8b354927bea290336309c0`
Branch: `main`
Message: `fix(payment): complete confirm payment guards`

Latest PAYMENT-CONFIRM-SERVICE-1 implementation commit: `3943eb2f feat(payment): add confirm payment process facade`
Follow-up guard completion: `8c5e6ddb` (HEAD at program start)

Production schema terminus: **0095_check_charges** (unchanged; no 0096)

Working tree at program start: clean (HEAD == `origin/main`).
This program did not create a migration, execute collection, or rewrite historical financial facts.

Constitutional authority: [ADR-ARCH-037](../../../architecture/adrs/ADR-ARCH-037-payment-process-domain.md) (I-PAY-01…18).
Predecessor: [PAYMENT-CONFIRM-SERVICE-1](../PAYMENT-CONFIRM-SERVICE-1/IMPLEMENTATION-REPORT.md).
Hard constraint: caller unification only. `confirmPayment`, `settleCheckPaidByIdDetailed`, and `finalizeOpenCheckById` were not rewritten as financial engines.

**Result: PASS WITH DOCUMENTED GAPS**

---

## 1. Implementation Summary

The remaining Confirm Payment callers now enter the existing Payment process boundary `confirmPayment`, which continues to delegate to certified `settleCheckPaidByIdDetailed`.

Migrated in this program:

- Session `markPaid` (operational session façade)
- `SettleOrderPaidService.settleOrderPaid`
- `StaffCounterPickupSettlementService.settleCounterPickupPaid`

Already migrated (PAYMENT-CONFIRM-SERVICE-1, preserved):

- Cashier Confirm Payment (`PosSettlementInitiateService.defaultSettlePaid`)

Not Confirm Payment (unchanged by design):

- Session `markComplimentary` → `settleCheckComplimentaryByIdDetailed`
- Counter Pickup cancel → `voidCheckByIdDetailed`
- Refund
- Split Payment / Multi-Check

Financial execution is unchanged: same Check-owned transaction, same `computeCheckMoney`, same `check_settlement_transactions`, same Settlement Record producer, same operational Order release. Session still omits `awaitAttribution` (awaits fail-open Attribution). Cashier still passes `awaitAttribution: false`.

---

## 2. Current Caller Map

| Caller | Authorization (preserved) | Confirm entry after this program | Operational work after Confirm |
|---|---|---|---|
| Cashier `pos.settlement.initiate` | POS_ACCESS + SETTLEMENT_INITIATE, terminal, register/shift, order eligibility, idempotency key | `confirmPayment` (`awaitAttribution: false`) | HTTP return at financial commit |
| Session `markPaid` | staff session load / restaurant+session ownership | `confirmPayment` (default Attribution await) | OPEN → PAID → CLOSED session events |
| `settleOrderPaid` | restaurant + trackingToken | `confirmPayment` | Order Settlement projection sync; idempotent SR return |
| Counter Pickup settle | staff + Register required + open Financial Shift (CSA-03) | `confirmPayment` | Order Settlement projection sync; cancel still voids Check |

---

## 3. Before / After Call Graph

### Before

```
Cashier completePayment()
  → confirmPayment → settleCheckPaidByIdDetailed → finalizeOpenCheckById

Session markPaid
  → settleCheckPaidByIdDetailed → finalizeOpenCheckById

SettleOrderPaid
  → settleCheckPaidByIdDetailed → finalizeOpenCheckById

Counter Pickup settle
  → settleCheckPaidByIdDetailed → finalizeOpenCheckById
```

### After

```
                    ┌── Cashier
                    │
                    ├── Session markPaid
                    │
                    ├── SettleOrderPaid
                    │
                    └── Counter Pickup
                         │
                         ▼
                 Payment.confirmPayment
                         │
                         ▼
             settleCheckPaidByIdDetailed
                         │
                         ▼
                Existing Check TX
                         │
              ┌──────────┼──────────┐
              │          │          │
             ST         SR       Order Release
```

Complimentary and void remain Check-owned and do not enter Confirm Payment.

---

## 4. Session Migration

`server/diningSession/sessionService.ts` `settleAndCloseSession` paid branch now calls `confirmPayment` with the same financial inputs (`restaurantId`, `checkId`, `settlements`, `settlementContextHints`).

Session remains an operational façade:

- OPEN → PAID → CLOSED is unchanged
- Complimentary still uses `settleCheckComplimentaryByIdDetailed`
- Session close still requires prior financial completion (`assertSessionCloseable`)
- Session operational `db.transaction` still runs **after** Confirm (status/events). It is not a second financial TX and does not wrap `confirmPayment`.

---

## 5. SettleOrderPaid Migration

`SettleOrderPaidService.settleOrderPaid` now calls `confirmPayment` after existing Order identity, tracking-token, membership, and already-paid idempotency checks.

Preserved:

- Order identity / Check identity
- tenant via `restaurantId`
- trackingToken authorization
- tender forwarding
- CheckTransitionError race → existing Settlement Record
- Order Settlement projection materialization
- no money calculated from Order totals

Order Settlement is not the Payment owner.

---

## 6. Counter Pickup Migration

`StaffCounterPickupSettlementService.settleCounterPickupPaid` now calls `confirmPayment` after Register trim, membership, already-paid idempotency, and CSA-03 Register/Shift resolution.

Cancel (`cancelCounterPickupUnpaid`) still voids the unpaid Check. That is not Confirm Payment.

Counter Pickup remains an operational entry. Payment owns confirmation.

---

## 7. Payment Confirm convergence proof

Production `await settleCheckPaidByIdDetailed` remains only on `PaymentConfirmService`. Cashier, Session markPaid, SettleOrderPaid, and Counter Pickup settle all call `await confirmPayment({`. Architecture guards scan those trees and fail if a second direct settle path appears.

`confirmPayment` still:

```
await settleCheckPaidByIdDetailed({ restaurantId, checkId, settlements, settlementContext, settlementContextHints, awaitAttribution })
```

No second Payment confirmation function was added.

---

## 8. Transaction Boundary proof

`confirmPayment` does not open a transaction. Callers do not wrap Confirm in `withCheckOwnedTransaction`.

Authoritative money TX remains `finalizeOpenCheckById` → `withCheckOwnedTransaction`.

Session still has a **post-commit operational** session-status transaction. That existed before this program and is not a nested financial TX:

```
confirmPayment
  → settleCheckPaidByIdDetailed
    → withCheckOwnedTransaction   ← sole financial confirmation TX
Session then: db.transaction (OPEN→PAID→CLOSED events)
```

---

## 9. Authorization proof

| Caller | Gate still before Confirm |
|---|---|
| Cashier | POS router + `PosSettlementInitiateService` (unchanged) |
| Session markPaid | `loadSessionForStaffAction` restaurant/session match |
| SettleOrderPaid | `getOrderById` tenant + trackingToken |
| Counter Pickup | staff procedure + Register required + resolved Financial Shift |

`confirmPayment` does not add or remove authorization. Complimentary and close-without-settle do not call Confirm.

---

## 10. Idempotency proof

Existing already-paid / race behavior is preserved:

- SettleOrderPaid and Counter Pickup return the existing Settlement Record when Check outcome is already `paid`, without calling Confirm
- CheckTransitionError still recovers to the existing SR
- Cashier idempotency key remains POS-owned
- Session repeated markPaid still hits Check terminal-state protection via Confirm → certified settle
- CheckService concurrency/idempotency suites remain the money-TX proof

The façade does not insert collection facts or Settlement Records.

---

## 11. Architecture guards

New: `server/operational-session/payment/__tests__/paymentConfirmRemainingCallers.architecture.guards.test.ts`

Extended: `paymentConfirm.architecture.guards.test.ts` now requires remaining callers on `confirmPayment`.

Updated existing guards so they expect Confirm routing without weakening complimentary/void/Refund/Check-export proofs:

- cashier HTTP-at-commit (Session still omits `awaitAttribution: false`)
- settlement payment-method capture
- self-ordering settlement / counter-pickup / order-settlement adoption
- CHECK-GENERALIZATION-M5 / CHECK-MANAGEMENT Session wiring

---

## 12. Regression results

Program-owned and directly affected:

| Suite | Result |
|---|---|
| `PaymentConfirmService.test.ts` | PASS (2) |
| `paymentConfirm.architecture.guards.test.ts` | PASS (5) |
| `paymentConfirmRemainingCallers.architecture.guards.test.ts` | PASS (6) |
| Session markPaid / complimentary / close (`sessionActions` + `sessionService`) | PASS (8 + 14) |
| SettleOrderPaid | PASS (5) |
| Staff Counter Pickup | PASS (5) |
| POS settlement initiate (guards + order) | PASS (6 + 27) |
| Cashier payment flow / readiness / timing / mixed-tender | PASS |
| cashier HTTP-at-commit | PASS (7) |
| Check lifecycle hardening | PASS (29) |
| Settlement Record concurrency/idempotency (2/5/10 concurrent) | PASS (7) |
| Order Settlement integration | PASS (5) |
| `computeCheckMoney` | PASS (5) |
| collection invariants + bill simplification guards | PASS |
| self-ordering / Session Check wiring guards | PASS |
| Refund domain architecture guards | PASS (untouched) |
| Check financial-txn-stage *instrumentation* (behavior) | PASS (13) |
| POS sale / POS architecture / Register-Shift guards | PASS |

**Baseline (not introduced by this program):**

1. `posSettlementFinancialTxnStage.architecture.guards.test.ts` → “instruments existing finalize stages without moving financial work” **already fails on certified HEAD**. Assertion: money-TX slice must not contain `loadChargesSubtotal(`. Certified `finalizeOpenCheckById` reloads Charges inside `withCheckOwnedTransaction`. This program must not rewrite that function.

2. `server/session-actions-router.test.ts` (3) fails with `requireRestaurantPlanFeature` / missing restaurant (`FORBIDDEN`) before `markPaid` is invoked. The file and the `session.markPaid` procedure were not behaviorally changed (comment-only on `order.settlePaid`). This is a missing commercial-entitlement mock in the router test, not a Confirm routing defect.

---

## 13. Production safety verification

| Check | Status |
|---|---|
| Production migration terminus | **0095_check_charges** |
| `drizzle/0096*` | absent |
| `payments` table / PaymentEngine / PaymentAggregate | absent |
| Schema / journal | unmodified |
| Real collection / refund executed | no |
| Historical financial rewrite | no |
| `finalizeOpenCheckById` body | unmodified |
| `computeCheckMoney` | unmodified |

---

## 14. Files changed

**New**

- `server/operational-session/payment/__tests__/paymentConfirmRemainingCallers.architecture.guards.test.ts`
- `docs/engineering/programs/PAYMENT-CONFIRM-REMAINING-CALLERS-1/IMPLEMENTATION-REPORT.md`

**Modified (behavior)**

- `server/diningSession/sessionService.ts` — paid Confirm → `confirmPayment`
- `server/order/application/SettleOrderPaidService.ts` — Confirm → `confirmPayment`
- `server/order/application/StaffCounterPickupSettlementService.ts` — settle Confirm → `confirmPayment`

**Modified (comment / tests / guards / registry)**

- `server/operational-session/payment/PaymentConfirmService.ts` — caller list comment
- `server/operational-session/check/CheckService.ts` — I-PAY-14 comment
- `server/routers.ts` — settlePaid comment only
- Session / SettleOrderPaid / Counter Pickup unit tests
- architecture guards listed above
- `docs/architecture/adrs/ADR-ARCH-037-payment-process-domain.md`
- `docs/architecture/constitution/ADR-Registry.md`

---

## 15. Explicit deferred work

- Tax / Discount / Grand Total / Amount Due / Remaining Collectible extraction
- Refund extraction
- CheckService reduction / removing `settleCheckPaidByIdDetailed` export
- Check aggregate redesign
- Bill simplification
- Settlement Record redesign
- Charges redesign
- Order lifecycle redesign
- database changes
- latency optimization / Charge reload-in-TX instrumentation gap

---

## 16. Commit recommendation

Do **not** commit unless requested. Recommended message:

```
feat(payment): route remaining confirm payment callers

Session markPaid, SettleOrderPaid, and Counter Pickup settle now
enter confirmPayment without changing Check money, transactions, or schema.
```

---

## WHAT MOVED / WHAT DID NOT

| | |
|---|---|
| **WHAT MOVED** | Confirm Payment *entry* for Session markPaid, SettleOrderPaid, and Counter Pickup settle. |
| **WHAT DID NOT MOVE** | Financial engine, formula, TX, ST, SR, Charges, Order release, Refund, complimentary, void, Session lifecycle, POS router, schema. |
| **WHAT NOW CONVERGES ON PAYMENT** | Cashier, Session markPaid, SettleOrderPaid, Counter Pickup settle → `confirmPayment`. |
| **WHAT REMAINS CHECK-OWNED** | Monetary aggregate, `computeCheckMoney`, collection facts, Settlement Record production, OPEN→PAID, OS apply, Check-owned TX, complimentary, void, Refund budget/history, `settleCheckPaidByIdDetailed` / `finalizeOpenCheckById` (I-PAY-14). |
| **WHAT REMAINS DEFERRED** | Formula extraction; CheckService reduction; Refund extraction; schema; latency. |

---

## Documented gaps

1. **Pre-existing HEAD architecture-guard failure** (not introduced, not fixed): `CASHIER-SETTLEMENT-FINANCIALTXN-STAGE-INSTRUMENTATION-1` money-slice forbids `loadChargesSubtotal(` inside the Check-owned TX; certified finalize still reloads Charges there.

2. **Pre-existing `session-actions-router.test.ts` commercial-entitlement mock gap** (not introduced, not fixed): `requireRestaurantPlanFeature` rejects because `getRestaurantById` is unmocked. Confirm Payment routing is covered by `sessionActions.test.ts` and architecture guards. Fixing the router test would be a commercial-entitlement test harness change, not this program.

---

## Final decision

**PASS WITH DOCUMENTED GAPS**

Recommended next program: **PAYMENT-CONFIRM-COMPATIBILITY-AUDIT-1**

Scope: prove there are no remaining legitimate production Confirm callers of `settleCheckPaidByIdDetailed` except `confirmPayment`, then decide whether I-PAY-14 compatibility exports may be narrowed. Still no formula move, no schema, no Refund extraction.
