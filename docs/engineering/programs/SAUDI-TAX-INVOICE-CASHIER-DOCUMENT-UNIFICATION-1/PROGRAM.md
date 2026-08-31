# SAUDI-TAX-INVOICE-CASHIER-DOCUMENT-UNIFICATION-1 — Program

## Objective

For Saudi Cashier (`countryCode === SA`), present **one** customer-facing post-payment document: the persisted Saudi Tax Invoice.

## Non-goals

- Do not delete Paid Receipt domain/snapshot builders
- Do not change Collection Fact / PAID / Payment / Settlement
- Do not change Tax Invoice domain, classification, VAT, QR generation
- Do not implement Phase 2 / Fatoora

## Previous

Payment → Paid Receipt dialog **and** Tax Invoice actions → two invoice-like UIs.

## New (Saudi)

Payment success toast/banner → Saudi Tax Invoice dialog (preparing / ready / unavailable) → View/Print.

Non-Saudi: Paid Receipt dialog unchanged.
