# SAUDI-TAX-INVOICE-CASHIER-DOCUMENT-UNIFICATION-1 — Architecture

## Impact analysis (pre-implementation)

| Item | Finding |
|------|---------|
| Paid Receipt component | `CashierPaidReceiptDialog` — customer-facing for non-SA; operational snapshot via `buildCashierPaidReceiptSnapshot` |
| Tax Invoice dialog | `CashierSaudiTaxInvoiceDialog` — Phase 1 document view/print |
| Open after pay | `completePayment` → `setPaidReceipt` + previously `setPrintOpen(true)` for all |
| Tax Invoice poll | `saudiTaxInvoice.getPhase1ByOrder` while print/tax dialog open |
| Dual actions | Tax Invoice strip inside Paid Receipt (removed) |
| Paid Receipt reuse | Non-Saudi Cashier; Settlement History has separate receipt surfaces |
| Country gate | Centralized `isSaudiEInvoiceCustomerFacingDocument(countryCode)` |
| Cashier invoice toggle | None that bypasses Saudi e-invoice; country-derived policy only |

## Document hierarchy (Saudi)

| Layer | Artifact |
|-------|----------|
| Financial truth | Collection Fact / PAID |
| Compliance | Saudi Tax Invoice Phase 1 |
| Customer-facing | Saudi Tax Invoice (Simplified or Standard per classifier) |
| Operational | Paid Receipt snapshot retained; dialog not opened as competing UI |

## Flow

```
Confirm → Collection Fact → PAID
  → (SA) open Tax Invoice dialog + poll getPhase1ByOrder
  → View/Print persisted Phase 1 document
```

Non-SA unchanged: open Paid Receipt dialog.
