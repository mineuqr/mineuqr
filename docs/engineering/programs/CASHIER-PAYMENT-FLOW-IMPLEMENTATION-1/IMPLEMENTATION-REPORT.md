# CASHIER-PAYMENT-FLOW-IMPLEMENTATION-1

Certified baseline HEAD: `780bddb991bafa4acd9de1d14a4233317079fab9`
(`refactor(financial): simplify bill domain`)
Branch: `main`
Production schema: **0095_check_charges** (unchanged; no 0096)

Prior certified programs (not reopened):

- BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 = PASS (`514a9a6f`)
- BILL-CHARGE-COMPOSITION-HARDENING-1 = PASS (`9da5cd02`)
- BILL-FINANCIAL-LIFECYCLE-HARDENING-1 = PASS (`3211d736`)
- PAYMENT-COLLECTION-ARCHITECTURE-1 = PASS (`6be3beb7`)
- BILL-SIMPLIFICATION-1 = PASS (`780bddb9`)
- CASHIER-POS-CHECK-READ-CONTRACT-1 / CASHIER-ORDER-VISIBILITY-AND-NOTIFICATION-1 = existing Cashier POS infrastructure reused

This program does not rewrite Cashier, CheckService, Payment, Order, Refund, or Settlement Record. No migration 0096. No new table. No new engine.

**Commercial Capability Impact: NO**

**Implementation result: PASS WITH DOCUMENTED GAPS**

**Experimental UX validation: PENDING owner manual Cashier use**

---

## A. Baseline

Approved operating model for the Cashier channel:

```
Cashier sale / cart
  → Payment (same workspace)
  → Confirm Payment
  → Financial finalization (Bill + collection facts + Settlement Record)
  → Operational Order release
```

Server remains financial authority. Charges remain frozen Bill facts. Settlement Record remains the finalized financial publication. Refund is unchanged.

The smallest safe change is **Cashier presentation + reuse of existing POS commands**. Deferring Order persistence until after payment would require a new Order+Check+Charge+settle orchestration. That is a rewrite. It was not done.

---

## B. Current Cashier flow (before this program)

1. In-memory catalog ticket (`displayTicketTotal` from item prices).
2. User-facing CTA **Confirm order** → `trpc.pos.sale.create` (`PosSaleService` → `IdentityPlaceOrderService`, `orderingChannel: cashier_pos`, `enrollCheck: false`, `awaitRelay: false`).
3. Overlay opens (`salePhase = "payment"`). Intake: `trpc.pos.check.intake` → `ensureCheckForOrder` (Bill/Check + Charges).
4. Confirm Payment: `trpc.pos.settlement.initiate` → `settleCheckPaidByIdDetailed` (Bill PAID + settlement transactions + Settlement Record).
5. Confirm disabled until **Check.grandTotal** is available (`cashierPaymentReadiness.ts`). Order total is display-only fallback.
6. Kitchen / operational lists already hide `cashier_pos` Orders until a **paid or complimentary** Check exists (`cashierPosPaidOperationalVisibilitySql`).

User-visible leaks: Confirm order, Check amount due, Check number, Preparing check, Settlement Record print copy.

---

## C. Target Cashier flow

User experience:

```
Build sale
  → see Subtotal / Discount / Tax / Total
  → [Payment]
  → Cash / Card / Mixed
  → [Confirm payment]
  → Done
```

Internal sequence (unchanged commands):

```
pos.sale.create
  → pos.check.intake
  → pos.read.check.getByOrder  (display + confirm authority)
  → pos.settlement.initiate
  → kitchen/ops list (paid Check membership)
```

The cashier stays on the Cashier tab. Payment remains an overlay in `CashierWorkspacePanel`. No Bill screen. No Payment workspace. No Settlement workspace as a cashier step.

---

## D. Pre-payment Sale/Cart behavior

The working sale is the in-memory ticket until the cashier clicks **Payment**.

During construction the cashier can add/remove items and change quantities. Catalog **subtotal** and **total** update immediately. Discount on the ticket is `0.00` (there is no cashier discount-apply control). Tax on the ticket is labeled **At payment**, not a browser-calculated VAT amount.

That is DISPLAY. It is not Bill authority. `displayTicketTotal` is catalog-decimal arithmetic only. It does not call `computeCheckMoney`. The panel does not use `t("ticketTax")` and does not hardcode `0.15`.

When Payment opens, intake creates the Bill/Check from Charges. The payment sheet then shows **server** Check `subtotal`, `billDiscountAmount`, `taxAmount`, and `grandTotal` copied through `PosOrderCheckDto`.

---

## E. Payment flow

Payment is the same overlay as before. Methods remain Cash, Card, and Mixed (cash + card exact cover of Check `grandTotal`) via existing `cashierSplitTender` + `pos.settlement.initiate` settlement lines.

Copy changes:

| Before | After |
|---|---|
| Confirm order | Payment |
| Confirming order… | Opening payment… |
| Check amount due | Amount due |
| Preparing check… | Preparing payment… |
| Check #id on paid / toasts | Order number + total |
| Order confirmed — unpaid | removed |

Confirm Payment is still the financial commit. Confirm stays disabled while Check `grandTotal` is missing (`amountDueIsOrderFallback`).

---

## F. Bill behavior

Bill/Check remains an internal obligation record.

Timing is option A of the program: **Bill exists before collection**, created by existing `pos.check.intake` / `ensureCheckForOrder` after `pos.sale.create`. That is required so Charges can freeze and Check money can be authoritative at Confirm.

Bill is not a cashier screen. Intake is orchestrated in the background. The cashier is not asked to Open Check / Open Bill.

Collection-before-Bill was not implemented.

---

## G. Financial authority

Unchanged:

```
Charges → computeCheckMoney → Check (subtotal, discount, frozen tax, grandTotal)
  → Confirm Payment consumes Check.grandTotal
  → settleCheckPaidByIdDetailed writes collection facts + Settlement Record
```

This program copies `billDiscountAmount` onto `PosOrderCheckDto` for display. `PosCheckReadService` still does not calculate tax, discount, or grand total. It does not load live Order totals.

Browser ticket math is not used at Confirm (`completePayment` does not send `directSale.totalAmount` as the due amount).

---

## H. Order release timing

**Persist timing (unchanged, required):** `cashier_pos` Order row is created at the Payment CTA so Check/Charges can enroll (`orderId` is the enrollment key).

**Operational release (already certified, reused):** kitchen and operational lists apply `cashierPosPaidOperationalVisibilitySql()`. A `cashier_pos` Order is listed only when an active membership points at a **paid or complimentary** Check.

So:

| Stage | Order row | Kitchen / ops list |
|---|---|---|
| Ticket construction | No | No |
| Payment overlay, unpaid | Yes (enrollment) | No |
| After successful Confirm Payment | Yes | Yes |

Deferring the Order row until after payment was rejected: Check/Charge enrollment needs `orderId`. Inventing a pre-Order sale aggregate or a new persist TX would be a rewrite.

Order still does not own tax, discount, amount due, payment, collection, refund, or settlement.

---

## I. Transaction boundary

Unchanged existing boundary:

1. `pos.sale.create` — Order persist (separate command, idempotent sale key).
2. `pos.check.intake` — Bill/Check + Charges (separate command).
3. `pos.settlement.initiate` — **one Check-owned financial TX**: Bill PAID + settlement transactions + Settlement Record (`settleCheckPaidByIdDetailed`).

There is no new distributed transaction. Confirm Payment does not collect without an existing Bill. Kitchen listing cannot observe an unpaid cashier sale as an operational order.

If Confirm fails: Order row may exist, Bill may be open, kitchen still does not list it. Cashier overlay remains; retry uses existing settle idempotency.

If financial finalization succeeds, the Order row already exists from step 1, so “paid with no Order” is not the residual risk. Residual risk is an unpaid enrollment Order, which operational lists already hide.

---

## J. Failure behavior

| Failure | Behavior |
|---|---|
| Payment / finalize fails | No PAID Check. No false Settlement Record. Kitchen does not list the sale. Overlay remains; retry allowed per existing idempotency. |
| Register / shift gap | Existing Register Ops gap UI. Not a Bill screen. |
| Duplicate Confirm | Existing `settleCheckPaidByIdDetailed` / POS settle idempotency. |
| Concurrent Confirm | Existing Check `WHERE outcome='open'` finalize + Settlement Record uniqueness. |
| Receipt print missing after paid | Payment stays successful; print disabled with cashier-facing “receipt isn’t ready” copy. Do not retry as a new payment. |

Cancel on the overlay is presentation-only (`salePhase` back to ticket). It does not void the Check or cancel the Order. That is existing behavior.

---

## K. Tests

New / updated:

- `client/src/lib/cashier-workspace/__tests__/cashierPaymentFlow.architecture.guards.test.ts`
- `client/src/lib/cashier-workspace/__tests__/cashierCopy.test.ts`
- `client/src/lib/cashier-workspace/__tests__/cashierOrderConfirmationPaymentFlow.architecture.guards.test.ts`
- `client/src/lib/cashier-workspace/__tests__/cashierTicketTotals.test.ts`
- `server/pos/__tests__/posRead.check.test.ts`
- `server/pos/__tests__/posCheckRead.architecture.guards.test.ts`

Existing coverage reused (not rewritten):

| Requirement | Existing tests |
|---|---|
| Cash / card / mixed collection | `posSettlementInitiate.order.test.ts`, `cashierSplitTender.test.ts` |
| Confirm uses Check.grandTotal | `cashierPaymentReadiness.test.ts`, POS Check read tests |
| Duplicate / concurrency | CheckService settlement Record + paid finalize tests |
| Kitchen hide until paid | `cashierPosOperationalVisibility.test.ts`, `cashierOrderVisibilityAndNotification.architecture.guards.test.ts` |
| Charge composition / Bill lifecycle / Settlement / Refund | prior certified program suites |

This program does not add a production collection test.

---

## L. Architecture guards

`cashierPaymentFlow.architecture.guards.test.ts` protects:

- No Bill screen / no Payment workspace tab
- Payment remains Cashier overlay
- No `PaymentEngine` / `BillEngine` / `CashierFinancialEngine`
- Pre-payment ticket is not kitchen-visible operational release
- Confirm still uses Check `grandTotal`; ticket tax is not invented
- `pos.sale.create` then `pos.settlement.initiate`
- Kitchen SQL still requires paid/complimentary Check
- No 0096
- No Refund redesign from Cashier

Prior guards remain: Check read contract, payment readiness, checkout print, order confirmation command split, bill simplification, payment collection.

---

## M. Production verification

Read-only only. No production financial collection test. No historical rewrite. Journal terminus remains **0095_check_charges**. No 0096 file.

Owner should manually operate Cashier after merge (section 29). That is the UX experiment, not a production payment test.

---

## N. Files changed

- `client/src/lib/cashier-workspace/cashierCopy.ts`
- `client/src/components/cashier-workspace/CashierWorkspacePanel.tsx`
- `client/src/lib/cashier-workspace/cashierTicketTotals.ts`
- `server/pos/read/posCheckDto.ts`
- `server/pos/services/PosCheckReadService.ts`
- Tests listed in K
- This report

`server/pos/api/posRouter.ts` was not modified.

---

## O. Migrations

None. Production terminus remains **0095**. No 0096.

`billDiscountAmount` already exists on `operational_checks`. The POS Check read DTO now copies it. That is not a schema change.

---

## P. Known gaps

1. **Order row still exists before collection.** Required for Charge enrollment. Operational release is still post-Paid. Full “no Order row until after pay” would be a rewrite → not done.
2. **Cart tax is not a live VAT number.** Showing a browser tax would be a second calculator. Tax appears as an amount on the payment sheet from Check.
3. **No cashier control to apply a bill discount while building the sale.** Discount displays from Check (`billDiscountAmount`) when the payment sheet has the Bill. Usually `0.00` for current Cashier sales.
4. **Unused copy keys** still contain internal Check/Settlement vocabulary (`checkLabel`, `intakeCheck`, …). The Cashier panel does not call them. They were left in place to avoid a copy-key deletion sweep.
5. **Active orders sidebar** still lists POS active orders (existing POS read). Kitchen/ops lists remain paid-gated.
6. **Manual UX experiment has not been run.** Tests cannot answer “does this feel faster?”

---

## Q. UX observations

Intended cashier path is shorter in language: **Payment → Confirm → Done**, not Confirm order → Open check → Pay check.

Practical speed depends on intake latency: Confirm stays blocked until Check `grandTotal` arrives. That was already true; this program did not add a wait, it only stopped calling that wait “Preparing check”.

Ticket totals during construction are catalog-fast and financially incomplete (tax at payment). That is the honest trade for not inventing tax in React.

Final judgment of faster / clearer / more natural is **owner manual Cashier use**, per program §29.

Possible experimental outcomes (not claimed here):

- A. Clear improvement → harden/adopt
- B. Minor improvement → decide if more simplification is worth it
- C. No improvement → do not force the architecture
- D. Regression → investigate the concrete problem

---

## R. Final Decision

**IMPLEMENTATION: PASS WITH DOCUMENTED GAPS**

The smallest safe change was made:

- Cashier sale → Payment overlay → Confirm Payment → existing financial TX → operational list after Paid
- Server Check money remains confirm authority
- Charges, Settlement Record, Refund, Kitchen lifecycle, and 0095 are preserved
- No new financial engine, Bill screen, Payment workspace, or migration

**EXPERIMENTAL UX VALIDATION: PENDING**

Do not treat this as a successful architecture change until the owner has used Cashier for a real sale and chosen A/B/C/D in section Q.

Do not reopen:

- CheckService rewrite
- Order persist-after-pay mega-TX
- Refund
- Settlement Record
- 0096
- UI-only financial authority
- Live Order totals as Bill money
