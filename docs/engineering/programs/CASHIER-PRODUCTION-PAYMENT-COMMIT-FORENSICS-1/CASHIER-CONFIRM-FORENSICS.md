# CASHIER-CONFIRM-FORENSICS

## Q1 — Does HTTP wait for ST / OS / SR?

**SOURCE: No** on Cashier `orderId` Confirm.

`PaymentConfirmService` sets `deferOperationalSettlementAfterCollectionFact: true`.  
`settleCashierPosOrderPaidByIdDetailed` returns after freeze TX, then `void completeCashierOperationalSettlementAfterCollectionFact` (not `await`).

Existing decoupling tests **MEASURE** that a hanging ST insert does not delay `settleCashierPosOrderPaidByIdDetailed`.

**PRODUCTION RUNTIME: UNKNOWN.** This workspace has no `pos_settlement_initiate.durationMs` from the reported session. If an older build without decoupling is what was deployed, HTTP **would** still wait — that would be FAIL, but HEAD `3c15dff9` source does not.

## Q2 — Where are the 7–8 seconds?

Cannot split T_confirm / T_http / T_ui without production marks.

**INFERRED candidates (not ms):**

A. Backend HTTP still includes (source, all awaited): auth, CRMP register/shift, Check materialize/freeze TX, Collection Fact insert/replay, POS `idempotency.put`. This is **not** ST/OS/SR.  
B. Frontend after HTTP, before toast: `await settlementRecord.getByCheck` when `settlementRecordId` is null (always after decoupling).  
C. Both.  
D. Client timeout / transport error while serverless is still in freeze+CF → catch + recovery (no `paidSuccess`).

`cashierPaymentFlowTiming.settlementDurationMs` = `CASHIER_SETTLEMENT_REQUEST_START` → `CASHIER_SETTLEMENT_RESPONSE` (HTTP only). `postSettlementUiMs` = response → `CASHIER_PAYMENT_SUCCESS` (includes getByCheck). Those events are **`console.info` only** (`cashier_payment_flow`), not server `opsLog`. They were **not retrieved** from production.

tRPC `httpBatchLink` has **no client timeout**. `vercel.json` has **no `maxDuration`**. Platform HTTP cut-off is **UNKNOWN**.

## Q3 — Success then error

See [UI-RESULT-STATE-ANALYSIS.md](./UI-RESULT-STATE-ANALYSIS.md).

Exact error string is `recoveryNotCommitted` (`لم يُسجَّل الدفع. يمكنك المحاولة مرة أخرى.`).  
Exact success string is `paidSuccess` (`تم الدفع بنجاح`). Button label is `confirmPayment` (`تأكيد الدفع`).

## Payment method ~1s

**SOURCE:** Cash / Network / Mixed `onClick` only `setState` (`setTenderMode` / fill tender fields). No tRPC on that click.

Payment sheet opens **before** `sale.create` returns (`placeSale` sets `salePhase: "payment"` then awaits the mutation). Method buttons are clickable during that wait. Confirm stays disabled until `saleReady` (`!saleMutation.isPending`) and preview `amountDue` exists. `verifyingAmount` is shown while sale is pending.

**INFERRED:** The ~1s “method selection” wait is Confirm remaining disabled / verifying copy while `pos.sale.create` is in flight, not a payment-method API.

**MEASURED duration: UNKNOWN.**
