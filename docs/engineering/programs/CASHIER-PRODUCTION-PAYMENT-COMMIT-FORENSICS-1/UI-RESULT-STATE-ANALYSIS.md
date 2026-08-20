# UI-RESULT-STATE-ANALYSIS

## Copy (MEASURED)

| Key | Arabic | When |
|---|---|---|
| `confirmPayment` | تأكيد الدفع | Confirm button (idle) |
| `paying` | جاري الدفع… | In-flight |
| `paidSuccess` | تم الدفع بنجاح | `toast.success` after HTTP `mutateAsync` resolves |
| `recoveryNotCommitted` | لم يُسجَّل الدفع. يمكنك المحاولة مرة أخرى. | Recovery says Check not PAID |

User report “تم تأكيد الدفع” is **INFERRED** as the Confirm button (`تأكيد الدفع`) and/or paraphrased `paidSuccess` (`تم الدفع بنجاح`). There is **no** source string `تم تأكيد الدفع`. In-flight button copy is `paying` (`جاري الدفع…`).

## Success path (HTTP 200)

```
CONFIRM
  → settleMutation.mutateAsync  (HTTP)
  → if settlementRecordId == null: await settlementRecord.getByCheck
  → toast.success(paidSuccess)
  → invalidateOrderReads()
  → startNewSale()   // clears paymentIntentId + idempotencyKey
  → print only if SR id present
```

This path **never** calls `toast.error(recoveryNotCommitted)`.

## Error path (HTTP throw)

```
CONFIRM
  → mutateAsync throws
  → register gap? toast.error(errorTitle)
  → else if not UNKNOWN_RESULT? toast.error(errorTitle)
  → else recoverCashierUnknownSettlement
       read pos.read.check.getByOrder
       if Check OPEN → PAYMENT_NOT_CONFIRMED
       → toast.error(recoveryNotCommitted)
```

`evaluateRecoveredCheckOutcome`: `outcome === "open"` → unpaid. **Does not read Collection Fact.**

## Why SUCCESS then ERROR can appear

**INFERRED (not a production trace):**

1. **Timeout after server commit:** Server already returned or committed CF; client throws TIMEOUT (`UNKNOWN_RESULT`); Check still OPEN (downstream not PAID yet, or Vercel killed `void completeCashier`); recovery → `recoveryNotCommitted`. User may have already read Confirm as “confirmed”. **No `paidSuccess` toast** unless HTTP resolved first.

2. **HTTP 200 then later retry:** First click `paidSuccess` + `startNewSale`. Order/Check still OPEN. Operator opens the same order and Confirms again. Second attempt can fail or commit a **new** intent (see idempotency). First toast + later error toast would match “success then error” across two clicks.

3. **Single invocation cannot toast `paidSuccess` then `recoveryNotCommitted`.** Those are mutually exclusive in one `try/catch`.

## Classification

**FINANCIAL SUCCESS + SECONDARY UI FAILURE** when Collection Fact is committed and Check is still OPEN and the client uses recovery.

That is **not** a Collection Fact rollback. The UI copy **incorrectly invites retry as if money was not taken.**

## State diagram

```
CONFIRM
  ├─ HTTP 200 + CF committed + Check OPEN
  │     → paidSuccess
  │     → startNewSale (new identities)
  │     → Check still OPEN in DB
  │
  └─ HTTP throw (timeout/network) + CF may already be committed
        → getByOrder Check OPEN
        → recoveryNotCommitted  ← misleading unpaid
        → same paymentIntentId kept → retry should REPLAY CF
```
