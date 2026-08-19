# BILL-CHARGE-COMPOSITION-HARDENING-1

Certified baseline: `514a9a6fb81348adced3c14d49f64c8937a97077`
Production schema: **0095_check_charges** (unchanged)

## A. Executive Summary

OPEN-Bill Charge composition can now correct item add / price / quantity / remove by appending compensating Charges. Existing Charge money is never updated. Bill calculation still sums persisted Charges only. No schema change.

Order item mutations do **not** exist in the current Order aggregate (items are insert-once at place; events are Created / Status / Ready / Completed / Cancelled). The correction command is implemented and tested at the Bill boundary. Production wiring remains enroll + cancel. Item-edit is ready when Order grows that workflow.

## B. Hardened Gaps

- OPEN Bill item add / price / qty / remove → append-only correction plan
- Duplicate reconcile / duplicate sequence → no-op or retry
- Terminal Bills reject correction
- Cross-tenant correction rejected
- Catch-up remains empty-set establishment only (not a live calc path)

## C. Files Changed

- `shared/operational-session/check/charge/chargeCommands.ts` — `planOpenChargeCorrections`
- `server/operational-session/check/checkChargeComposition.ts` — `reconcileOpenOrderCharges`
- `server/operational-session/check/CheckService.ts` — `applyOpenOrderChargeReconciliation`
- tests + architecture guards

## D. Schema Changes

**None.** Production remains 0095.

## E. Charge Correction Model

For each origin item: `delta = intendedNet - currentOriginNet`.
If delta is 0, skip. If current is 0, insert the intended Charge. Otherwise insert one compensating Charge. Original Charge rows are unchanged.

## F. OPEN Bill Behavior

New Charge, compensating Charge, then Bill money = sum of Charges + Bill tax/discount.

## G. Terminal Bill Behavior

PAID / complimentary / voided: no new Charges, no reopen. Paid + later Order change remains a Refund-program dependency.

## H. Idempotency

Identity is intended net vs current origin net. Same mutation twice produces an empty plan.

## I. Concurrency

`UNIQUE(checkId, sequence)` conflict retries the reconcile. The retry re-reads Charges; if nets already match, it does not insert.

## J. Catch-up Safety

`ensureOpenCheckChargeComposition` still returns when any Charge exists. It does not re-read live Orders during later Bill calculation.

## K. Order Isolation

`order.restaurantId` must equal `check.restaurantId`. Cross-tenant throws. Origin refs stay correlation only.

## L. Bill Calculation Verification

`refreshOpenCheckMoneyFromDiscovery` still: catch-up if empty → `loadChargesSubtotal` → `computeCheckMoney`. No `getOrdersByIds`.

## M. Architecture Guards

Updated `billChargeComposition.architecture.guards.test.ts` (no live Order calc, no 0096, no ChargeEngine, no membership rename).

## N. Tests

80 hardening/regression + 23 CheckService/money tests passed.

## O. Production Validation

Read-only: journal terminus 0095, `check_charges` present, no 0096. Live row growth (checks/orders/membership/SR) is new restaurant activity after 0095, not a rewrite of historical Settlement Records.

## P. Remaining Gaps

- No Order item-add/edit/remove application path or domain event. Do not invent one here.
- `check_order_settlements` remains legacy coupling.
- Historical paid Bills are not backfilled.

## Q. Complexity Review

BEFORE: Bill → Charges → calculation
AFTER: Bill → Charges (+ append-only correction facts) → calculation

No new aggregate, table, event bus, or financial authority.

## R. Final Decision

**PASS** with the documented Order-mutation wiring gap.
