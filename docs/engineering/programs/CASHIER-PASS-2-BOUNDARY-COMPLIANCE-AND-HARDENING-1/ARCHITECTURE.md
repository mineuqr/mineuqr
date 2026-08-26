# CASHIER-PASS-2-BOUNDARY-COMPLIANCE-AND-HARDENING-1

Implementation contract for the **approved** Cashier architecture. Not a new payment model.

```
SELECT ITEMS → DRAFT
  → الدفع → commercial invoice (pos.sale.create Order + items)
  → PAYMENT UI (payable = lines + frozen discount via computeCheckMoney)
  → tender (local)
  → Confirm → freeze → Collection Fact COMMIT = PAID
  → paidReceipt invoice number / date / time
  → Print
  → attribution / operational Check / SR (background)
```

## Law

- الدفع is **not** financial settlement. No Collection Fact. No PAID.
- Confirm **is** the financial boundary. PAID requires Collection Fact success.
- Collection Fact is **not** deferred until after Print.
- OPEN Check is **not** Cashier financial authority.
- Client totals are **not** payable authority.
- Internal Order `orderId` / `orderNumber` / `displayReference` may exist at الدفع.
- **Customer-facing** invoice number, date, and time are **paidReceipt** after PAID.
- Discount-before-VAT via `computeCheckMoney`. Payment UI amount must match Confirm `billDiscountAmount` (frozen on the prepared invoice money).
- Unpaid Order A/B after composition change remains a domain gap (no supersession in this package).

## Non-goals

- Moving Order persist to Confirm
- Draft-only Payment UI without sale.create
- New schema / supersession enum
