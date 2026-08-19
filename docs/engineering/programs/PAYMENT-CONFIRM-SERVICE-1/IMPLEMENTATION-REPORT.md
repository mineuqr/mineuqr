# PAYMENT-CONFIRM-SERVICE-1

Certified baseline HEAD: `72e09cf5fe30758c262a64f0c9517b4baba7be94`
Branch: `main`
Message: `docs(architecture): define payment process domain`
Production schema terminus: **0095_check_charges** (unchanged; no 0096)

Working tree at program start: clean (HEAD == `origin/main`).
This program did not create a migration, execute collection, or rewrite historical financial facts.

Constitutional authority: [ADR-ARCH-037](../../../architecture/adrs/ADR-ARCH-037-payment-process-domain.md) (I-PAY-01…18).
Hard constraint: façade / adapter extraction only. `settleCheckPaidByIdDetailed` and `finalizeOpenCheckById` were not rewritten.

**Result: PASS WITH DOCUMENTED GAPS**

---

## 1. Implementation Summary

Cashier Confirm Payment now enters a named Payment process function, `confirmPayment`, which delegates to the existing certified Check settlement capability `settleCheckPaidByIdDetailed`.

POS `pos.settlement.initiate` remains the HTTP/auth/idempotency transport. It no longer calls Check settle directly. The POS router was not redesigned.

Financial execution is unchanged: same Check-owned transaction, same `computeCheckMoney`, same `check_settlement_transactions`, same Settlement Record producer, same operational Order release, same cashier `awaitAttribution: false` HTTP-at-commit behavior.

CheckService still hosts `finalizeOpenCheckById` / `settleCheckPaidByIdDetailed` as **I-PAY-14 compatibility**. Session, `SettleOrderPaidService`, and `StaffCounterPickupSettlementService` still call Check settle directly (not migrated).

---

## 2. Before / After Call Graph

### Before

```
Cashier completePayment()
  → trpc.pos.settlement.initiate
    → PosSettlementInitiateService.initiate
      → defaultSettlePaid
        → settleCheckPaidByIdDetailed
          → finalizeOpenCheckById
            → withCheckOwnedTransaction
                 ST + Check PAID + OS + Settlement Record
```

### After

```
Cashier completePayment()
  → trpc.pos.settlement.initiate          (unchanged transport)
    → PosSettlementInitiateService.initiate
      → defaultSettlePaid
        → confirmPayment                 ← Payment process boundary
          → settleCheckPaidByIdDetailed  ← certified Check implementation (I-PAY-14)
            → finalizeOpenCheckById
              → withCheckOwnedTransaction
                   ST + Check PAID + OS + Settlement Record
```

Unchanged (not this program):

```
Session markPaid                 → settleCheckPaidByIdDetailed
SettleOrderPaidService           → settleCheckPaidByIdDetailed
StaffCounterPickupSettlementService → settleCheckPaidByIdDetailed
```

---

## 3. Payment Confirm Service ownership

`server/operational-session/payment/PaymentConfirmService.ts`

Owns the **command / process** boundary:

- `confirmPayment(command)` means “confirm this financial collection.”
- Smallest command: `restaurantId`, `checkId`, optional tender lines, optional Settlement Context / hints, optional `awaitAttribution`.
- Does not accept or recompute grandTotal, tax, discount, Amount Due, Remaining Collectible, Order totals, or Session totals.
- Invokes `settleCheckPaidByIdDetailed` with the same fields.
- Returns the existing `CheckFinancialMutationResult`.
- Emits `OPS_EVENT.payment_confirm` (`category: PAYMENT`) after a successful certified settle. Does not log financial amounts.

Does **not** own: Check aggregate, money formula, collection fact insert, Settlement Record production, Order lifecycle, Refund, Charges.

---

## 4. Current CheckService compatibility role

CheckService remains the **compatibility host** (I-PAY-14), not the Payment process owner.

| Surface | Role after this program |
|---|---|
| `finalizeOpenCheckById` | Certified financial implementation. Unchanged. |
| `settleCheckPaidByIdDetailed` | Certified paid-collection entry used by `confirmPayment` and remaining non-cashier callers. Comment documents that it is not the Payment process boundary. |
| `settleCheckPaidById` | Compatibility wrapper. Unchanged. |

Do not treat CheckService as Payment ownership. Do not remove these surfaces until remaining callers have moved and tests prove they are unused.

---

## 5. Transaction boundary analysis

**Current owner:** `finalizeOpenCheckById` → `withCheckOwnedTransaction` (Check Aggregate owns the money TX).

`confirmPayment` does **not** open a transaction. `defaultSettlePaid` does **not** open a transaction. There is no nested or competing financial TX.

Invariant held:

```
ONE financial confirmation = ONE authoritative transaction boundary
```

Cashier still passes `awaitAttribution: false`. Attribution remains post-commit / fail-open inside Check finalize. Session still omits that flag (awaits Attribution). That split is unchanged.

---

## 6. API / caller migration

**Decision: B — minimal adapter.**

`posRouter.settlement.initiate` still calls `getPosSettlementInitiateService()`. POS continues to own restaurant/RBAC/terminal/register-shift/order-eligibility/idempotency. That service’s `defaultSettlePaid` now calls `confirmPayment`.

Migrated: Cashier Confirm Payment (`completePayment` → `pos.settlement.initiate`).

Not migrated (explicit): Session, Order Settlement APIs, Staff Counter Pickup, Refund, Split Payment, Multi-Check, reporting.

---

## 7. Architecture guards

`server/operational-session/payment/__tests__/paymentConfirm.architecture.guards.test.ts` proves:

1. `confirmPayment` exists as the explicit Payment process boundary.
2. It calls `settleCheckPaidByIdDetailed`.
3. No `payments` table / PaymentEngine / PaymentAggregate / second grandTotal / second collection SSOT / 0096.
4. Check, Settlement Record, Order lifecycle, and Refund are not replaced.
5. CheckService compatibility (`finalizeOpenCheckById`, `settleCheckPaidByIdDetailed`) remains.
6. `confirmPayment` and POS `defaultSettlePaid` do not open a second TX.
7. Only the cashier Confirm caller moved; Session / SettleOrderPaid / Counter Pickup still call Check settle.

Existing POS and Cashier architecture guards were updated so they expect `confirmPayment` on the POS path and `settleCheckPaidByIdDetailed` on the Payment Confirm Service.

---

## 8. Regression results

Program-owned:

| Suite | Result |
|---|---|
| `PaymentConfirmService.test.ts` | PASS (2) |
| `paymentConfirm.architecture.guards.test.ts` | PASS (5) |
| POS settlement initiate (guards + order) | PASS (6 + 27) |
| Cashier payment flow / readiness / timing / mixed-tender / UX / recovery | PASS |
| POS check-read + payment-flow-boundary guards | PASS |
| Check lifecycle hardening | PASS (29) |
| Settlement Record + concurrency/idempotency | PASS (including 2/5/10 concurrent finalize certification) |
| Order Settlement integration | PASS |
| `computeCheckMoney` + collection invariants | PASS |
| Session settle + SettleOrderPaid + StaffCounterPickup | PASS (callers still on Check settle) |
| Refund domain architecture guards | PASS (untouched) |

**Baseline (not introduced by this program):**
`posSettlementFinancialTxnStage.architecture.guards.test.ts` → “instruments existing finalize stages without moving financial work” **already fails on certified HEAD** `72e09cf5`. Assertion: money-TX slice must not contain `loadChargesSubtotal(`. Certified `finalizeOpenCheckById` reloads Charges inside `withCheckOwnedTransaction`. This program must not rewrite that function, so the failure was left untouched. All other tests in that file pass; POS `defaultSettlePaid` assertions in it were updated and pass.

---

## 9. Production safety verification

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

## 10. Files changed

**New**

- `server/operational-session/payment/PaymentConfirmService.ts`
- `server/operational-session/payment/index.ts`
- `server/operational-session/payment/__tests__/PaymentConfirmService.test.ts`
- `server/operational-session/payment/__tests__/paymentConfirm.architecture.guards.test.ts`
- `docs/engineering/programs/PAYMENT-CONFIRM-SERVICE-1/IMPLEMENTATION-REPORT.md`

**Modified (behavior)**

- `server/pos/services/PosSettlementInitiateService.ts` — `defaultSettlePaid` → `confirmPayment`

**Modified (comment / taxonomy / guards / registry)**

- `server/operational-session/check/CheckService.ts` — I-PAY-14 compatibility comment only
- `server/_core/opsTaxonomy.ts` — `payment_confirm`
- POS + Cashier architecture guards listed in `git diff --stat`
- `docs/architecture/adrs/ADR-ARCH-037-payment-process-domain.md`
- `docs/architecture/constitution/ADR-Registry.md`

---

## 11. Commit recommendation

Do **not** commit unless requested. Recommended message:

```
feat(payment): add Confirm Payment process façade

Introduce confirmPayment as the cashier Confirm Payment entry that
delegates to settleCheckPaidByIdDetailed without changing Check money,
transactions, or schema.
```

---

## 12. Explicit deferred work

- Moving tax / discount / Grand Total / Amount Due / Remaining Collectible into Payment
- Extracting Refund
- Reducing CheckService Payment-process surfaces
- Changing Check aggregate, Settlement Record, Charges, Order lifecycle, or schema
- Migrating Session, SettleOrderPaid, Staff Counter Pickup, Split Payment, Multi-Check, reporting
- Repairing the pre-existing financial-txn-stage architecture guard (would require documenting or moving the in-TX Charges reload; not authorized here)

---

## WHAT MOVED / WHAT DID NOT

| | |
|---|---|
| **WHAT MOVED** | Cashier Confirm Payment process *entry*: POS `defaultSettlePaid` now calls `confirmPayment`. |
| **WHAT DID NOT MOVE** | Financial engine, formula, TX, ST, SR, Charges, Order release, Refund, Check lifecycle, schema, POS router, remaining settle callers. |
| **NOW OWNED BY PAYMENT** | The Confirm Payment *process boundary* (`confirmPayment`). |
| **REMAINS OWNED BY CHECK** | Monetary aggregate, `computeCheckMoney`, collection facts, Settlement Record production, OPEN→PAID, OS apply, Check-owned TX, Refund budget/history. |
| **REMAINS DEFERRED** | Remaining Confirm callers; formula extraction; CheckService reduction; Refund extraction. |

POS still owns transport: auth, tenant, terminal, register/shift, order eligibility, cashier idempotency key. UI `hasFeature` / tender selection remain presentation.

---

## Documented gaps

1. **Pre-existing HEAD architecture-guard failure** (not introduced, not fixed): `CASHIER-SETTLEMENT-FINANCIALTXN-STAGE-INSTRUMENTATION-1` money-slice forbids `loadChargesSubtotal(` inside the Check-owned TX; certified finalize still reloads Charges there. Fixing it would rewrite `finalizeOpenCheckById`, which this program forbids.

2. **Remaining Confirm callers** are still on CheckService. That is **deferred by charter**, not an accidental miss.

---

## Final decision

**PASS WITH DOCUMENTED GAPS**

Recommended next program: **PAYMENT-CONFIRM-REMAINING-CALLERS-1**

Scope: route Session `markPaid`, `SettleOrderPaidService`, and `StaffCounterPickupSettlementService` through `confirmPayment` with the same certified settle underneath. Still no formula move, no CheckService shrink, no schema, no Refund extraction.
