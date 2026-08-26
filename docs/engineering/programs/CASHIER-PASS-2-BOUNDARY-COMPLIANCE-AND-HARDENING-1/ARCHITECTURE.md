# CASHIER-PASS-2-BOUNDARY-COMPLIANCE-AND-HARDENING-1

Implementation contract for the **approved** Cashier architecture. Not a new payment model.

**Runtime law (`CASHIER-PASS-2-CONFIRM-FINALIZATION-1`):**

```
SELECT ITEMS → DRAFT
  → الدفع → Payment UI (local prepared invoice only; no Order persist)
  → tender (local)
  → Confirm → Order + items + freeze + Collection Fact COMMIT = PAID
  → paidReceipt invoice number / date / time
  → Print
  → attribution / operational Check / SR (background)
```

## Law

- الدفع is **not** commercial invoice persist. No Order. No Collection Fact. No PAID.
- Confirm **is** the finalization and financial boundary. PAID requires Collection Fact success.
- Collection Fact is **not** deferred until after Print.
- OPEN Check is **not** Cashier financial authority.
- Client totals are **not** payable authority.
- **Customer-facing** invoice number, date, and time are **paidReceipt** after PAID (Confirm success time).
- Discount-before-VAT via `computeCheckMoney`. Payment UI preview uses the same engine as Confirm freeze.
- No Cashier Order A/B before payment: no Order exists until a successful Confirm.

## Runtime split

| Step | When | Blocks Payment UI? |
|---|---|---|
| Local draft / Payment UI | الدفع | React only |
| Restaurant scope + terminal access | Confirm | Yes |
| Pricing + order number + BI | Confirm | Yes |
| Order + items + CF in one persist TX | Confirm | Yes (تأكيد الدفع) |
| Relay / OPEN Check / SR | After PAID | No |

## Non-goals

- Deleting `pos.sale.create` globally (other channels / leftover API)
- New schema / supersession enum
- Check as Cashier financial SSOT
