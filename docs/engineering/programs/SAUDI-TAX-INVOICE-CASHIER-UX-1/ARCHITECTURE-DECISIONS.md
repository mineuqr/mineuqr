# SAUDI-TAX-INVOICE-CASHIER-UX-1 — Architecture decisions

## AD-1 — Read API only

Cashier uses `saudiTaxInvoice.getPhase1ByOrder` / mapped `document`.
No Cashier-side Tax Invoice creation path.

## AD-2 — Receipt ≠ Tax Invoice

`CashierPaidReceiptDialog` remains the operational paid receipt.
Tax Invoice actions are an additive strip; `CashierSaudiTaxInvoiceDialog` is separate.

## AD-3 — Snapshot rendering

Seller / buyer / lines / monetary / QR / issue timestamp come from Phase 1 document.
No live Customer, Product, or Tax Profile queries for render.

## AD-4 — SA gate

Tax Invoice Cashier UX enabled only when restaurant `countryCode === "SA"`.

## AD-5 — No migration

Phase 1 persistence and read contract are sufficient.
