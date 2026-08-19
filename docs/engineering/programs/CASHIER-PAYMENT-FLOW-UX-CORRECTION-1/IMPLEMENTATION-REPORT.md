# CASHIER-PAYMENT-FLOW-UX-CORRECTION-1

Certified baseline: CASHIER-PAYMENT-FLOW-IMPLEMENTATION-1 (uncommitted UX follow-up on `780bddb9` financial simplification).
Production schema: **0095_check_charges** (unchanged; no 0096)

**Commercial Capability Impact: NO**

**Result: IMPLEMENTATION PASS — experimental confirmation still belongs to the owner’s next manual Cashier run**

This program does not redesign Bill, Payment collection, Settlement Record, Refund, Order, or Kitchen. No PaymentEngine. No Bill/Payment workspace. No 0096.

---

## A. Baseline

After CASHIER-PAYMENT-FLOW-IMPLEMENTATION-1 the cashier path was:

Build ticket → **Payment** (wait for `pos.sale.create`) → overlay → Check intake → Confirm on Check.grandTotal.

Ticket showed Discount `0.00` and Tax **At payment**. Payment methods were two always-visible cash/card inputs.

---

## B. Four observed UX problems

1. Tax did not appear when adding items.
2. Discount was displayed with no apply action.
3. Clicking Payment showed “جاري تجهيز الدفع...” for ~4 seconds.
4. Payment methods were not نقدًا / شبكة / تسوية.

---

## C. Root cause of each

1. **Tax:** Ticket used catalog-sum only. Tax was deferred until Check read. The previous program forbade inventing a React tax engine; it did not wire `computeCheckMoney` for display.
2. **Discount:** `billDiscountAmount` exists on Check and in `computeCheckMoney`, but Cashier never collected it. Intake always created Bills at `0.00`.
3. **Latency:** Overlay required `directSale`, which is set only after `sale.create` returns. Perceived wait was Order persist, not “preparing Check” copy. Intake + Check read then blocked the amount-due slot.
4. **Methods:** Both cash and card fields were shown together. Canonical persist keys remain `cash | card`; there was no Cashier-facing Mixed / Network choice.

---

## D. Tax calculation correction

Display reuses **`computeCheckMoney`** with the restaurant’s live tax policy captured through existing `businessTaxSettingsFromRestaurantRow` + `captureTaxPolicySnapshot`.

- Source: Dashboard `restaurant.getById` fields (`taxEnabled`, `taxMode`, `taxPolicyJson`) passed into Cashier.
- No hardcoded 15%.
- Discount is subtracted before tax (existing Check money rule).
- Inclusive vs exclusive follows the restaurant policy.
- **Confirm still uses Check.grandTotal.** Display money is not sent as the payable amount.

---

## E. Discount UX correction

Ticket has **خصم / Discount**. The cashier enters a bill-level amount (existing `billDiscountAmount` semantics). Tax and grand total update immediately via `computeCheckMoney`.

At intake, optional `billDiscountAmount` is forwarded to `ensureCheckForOrder` / `createOpenCheck` and persisted on the open Check money refresh. Server still computes tax/grand total. Client cannot supply `grandTotal`.

---

## F. Payment latency investigation

**Before**

| Step | Blocking UI? |
|---|---|
| `pos.sale.create` | Yes — overlay did not open until this returned (~seconds) |
| `pos.check.intake` | Overlay open, amount slot showed preparing |
| `pos.read.check.getByOrder` | Confirm disabled until Check.grandTotal |

Sequential: sale → intake → check read. Request count: 3 after Payment click.

**After**

| Step | Blocking UI? |
|---|---|
| Overlay + local totals + method buttons | Immediate |
| `pos.sale.create` | Behind overlay |
| `pos.check.intake` (with discount) | Behind overlay |
| Check read | Confirm stays disabled until grandTotal |

Payment **controls** appear immediately. Confirm remains gated on authoritative Check money.

Display remaining/tendered may use local ticket money until Check.grandTotal arrives; Confirm still cannot fire on that display amount.

---

## G. Payment method correction

Cashier-facing modes:

| UI | Persist |
|---|---|
| نقدًا / Cash | `cash` |
| شبكة / Network | canonical `card` (mada/visa/apple_pay remain historical aliases, not a new picker) |
| تسوية / Mixed | cash + card lines covering Check.grandTotal |

تسوية is mixed collection, not a Settlement Record screen.

---

## H. Mixed payment behavior

تسوية shows cash and network amounts, total tendered, and remaining (`الباقي`). Confirm requires exact cover of Check.grandTotal via existing `cashierSplitTender` + `pos.settlement.initiate` settlement lines.

Until Check money is ready, remaining/tendered may follow local display totals. That display cannot enable Confirm.

---

## I. Financial authority

```
FAST DISPLAY: catalog subtotal + cashier discount + live tax policy → computeCheckMoney
AUTHORITATIVE CONFIRM: Check.grandTotal after intake/Charges
```

completePayment does not use `ticketMoney`, `paymentDisplayMoney`, or `directSale.totalAmount`.

---

## J. Order behavior

Unchanged: `pos.sale.create` still persists a `cashier_pos` Order for Charge enrollment. Kitchen lists only after Paid Check. Overlay no longer waits for that persist before showing payment controls.

---

## K. Tests

- `cashierTicketMoney.test.ts` — exclusive/inclusive/disabled tax, discount-before-tax, clamp
- `cashierPaymentFlowUxCorrection.architecture.guards.test.ts`
- Updated copy / order-confirmation / workspace / payment-flow / readiness / latency guards
- Existing split tender, payment readiness, Check intake, settlement initiate, kitchen visibility

Ran 15 test files / 84 tests after remaining-label polish, including CheckService M4. All passed.

---

## L. Architecture guards

Protect: Payment overlay in Cashier; no Bill/Payment tabs; tax visible before Payment; discount action; overlay before `sale.create`; نقدًا/شبكة/تسوية; Confirm on Check.grandTotal; no 0096; no PaymentEngine; no brand picker; no Refund redesign.

---

## M. Latency measurements

Owner-measured ~4s was overlay-gated on `sale.create`. This change removes that gate. Remaining sale+intake time still exists **behind** the sheet until Confirm enables. Automated tests cannot measure wall-clock POS latency; they assert overlay opens before `sale.create`.

---

## N. Manual validation

Owner should re-run the eight cases in the program (tax, discount, speed, cash, network, mixed, failure, success). This implementation does not claim those as already executed.

---

## O. Production verification

Read-only only. No production collection. Journal remains 0095.

---

## P. Files changed

- `client/src/lib/cashier-workspace/cashierTicketMoney.ts` (new)
- `client/src/lib/cashier-workspace/cashierTenderMode.ts` (new)
- `client/src/lib/cashier-workspace/cashierCopy.ts`
- `client/src/lib/cashier-workspace/cashierPosStyles.ts`
- `client/src/components/cashier-workspace/CashierWorkspacePanel.tsx`
- `client/src/pages/Dashboard.tsx` (pass tax policy fields)
- `server/operational-session/check/CheckService.ts` (optional bill discount on sessionless create/ensure + persist on money refresh)
- `server/pos/services/PosCheckIntakeService.ts`
- `server/pos/api/posRouter.ts` (optional `billDiscountAmount` on intake; `moneyAmountInput` declared before `checkIntakeInput` so the router can load)
- Tests listed in K
- This report

---

## Q. Migrations

None. 0095 terminus.

---

## R. Known gaps

1. Display tax uses **live** restaurant policy; Check freezes policy at intake. If settings change mid-sale, display and confirm can differ until Check arrives. Confirm uses the frozen Check.
2. Network is canonical `card`, not a mada/visa/apple_pay brand picker (PAYMENT-METHOD-CATALOG-UNIFICATION).
3. Discount is an amount, not a new percent engine.
4. Sale persist can still take seconds; Confirm waits. The cashier can enter tenders during that wait.
5. Manual UX re-test is pending.

---

## S. Final Decision

**IMPLEMENTATION: PASS**

The four UX defects are addressed without a second financial SSOT:

1. Tax appears on the ticket immediately from the restaurant tax policy via `computeCheckMoney`.
2. Discount is a ticket action and is applied to Check at intake.
3. Payment UI opens before `sale.create`; “preparing payment” is no longer the blocked overlay.
4. Methods are نقدًا / شبكة / تسوية.

**EXPERIMENTAL UX: PENDING owner Cashier re-test**
