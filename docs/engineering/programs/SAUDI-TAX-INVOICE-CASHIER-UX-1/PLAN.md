# SAUDI-TAX-INVOICE-CASHIER-UX-1 — Plan

## Objective

After successful Cashier payment (PAID), expose the **existing** Saudi Tax Invoice
Phase 1 document for View / Print Preview / Print. Presentation only.

## Non-goals

- No Tax Invoice domain redesign
- No Financial Core / Collection Fact / PAID / Payment changes
- No Customer Core changes
- No VAT engine, B2B/B2C classification, ZATCA Phase 2, Fatoora
- No migration (Phase 1 schema/API already sufficient)

## Flow

```
Confirm payment → Collection Fact → PAID
  → Compliance (async, best-effort)
  → Saudi Tax Invoice Phase 1
  → Cashier: getPhase1ByOrder (poll briefly)
  → View / Print same immutable document
```

## UX decisions

1. Keep operational **Paid Receipt** distinct; add Tax Invoice strip when `countryCode === SA`.
2. Poll `saudiTaxInvoice.getPhase1ByOrder` while receipt/tax dialog is open (≤15s).
3. Failure UX: payment remains successful; show compliance unavailable / blocked profile.
4. Mapper: Phase 1 document → Cashier view model (snapshots only).
5. Print: body class `printing-cashier-saudi-tax-invoice`, ~72.1mm, content-driven height.
6. QR: render persisted `qrPayloadBase64` for Simplified only; do not regenerate TLV.

## Deferred

- Safe domain retry UI if/when a dedicated retry contract is productized
- Historical order-history Tax Invoice entry (only if low-risk without redesign)
- Live browser Print Preview (operator / in-agent browser)
