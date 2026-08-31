# SAUDI-TAX-INVOICE-CASHIER-UX-1 — Final Report

## Verdict: **PASS WITH OPEN QUESTIONS**

(Open questions are inherited domain OQs — not UX blockers.)

## Mandatory scope certification

SAUDI TAX INVOICE PHASE 1 CASHIER UX IMPLEMENTED.

NO NEW TAX INVOICE GENERATION ENGINE WAS CREATED.  
NO DUPLICATE TAX INVOICE PATH WAS CREATED.  
NO CUSTOMER SCHEMA WAS CHANGED.  
NO SAUDI CUSTOMER LOGIC WAS ADDED TO CUSTOMER CORE.  
NO COLLECTION FACT SEMANTICS WERE CHANGED.  
NO PAID SEMANTICS WERE CHANGED.  
NO PAYMENT SEMANTICS WERE CHANGED.  
NO SETTLEMENT SEMANTICS WERE CHANGED.  
NO VAT ENGINE WAS IMPLEMENTED.  
NO NEW B2B/B2C CLASSIFICATION ENGINE WAS IMPLEMENTED.  
NO ZATCA PHASE 2 WAS IMPLEMENTED.  
NO FATOORA INTEGRATION WAS IMPLEMENTED.  
NO CSID/CERTIFICATE WAS IMPLEMENTED.  
NO CRYPTOGRAPHIC SIGNING WAS IMPLEMENTED.  
NO PHASE 2 HASH CHAIN WAS IMPLEMENTED.  
NO CREDIT NOTE WAS IMPLEMENTED.  
NO DEBIT NOTE WAS IMPLEMENTED.  
NO TAX PROFILE REDESIGN WAS IMPLEMENTED.

## Post-Payment Flow

Confirm → PAID → operational Paid Receipt dialog.  
For `countryCode === SA`, Cashier polls `saudiTaxInvoice.getPhase1ByOrder` (≤15s) and shows Tax Invoice strip: preparing / ready / unavailable / blocked profile.  
PAID never remapped to payment failure.

## Tax Invoice View

`CashierSaudiTaxInvoiceDialog` renders mapped Phase 1 document (white surface, RTL, snapshot fields).

## Document Type / Number / Seller / Buyer

From persisted Phase 1 titles / `invoiceNumber` / seller snapshot / buyer snapshot.  
Anonymous cash → **نقدًا** / Cash. No live Customer/Tax Profile query for render.

## Lines / Totals / QR

Authoritative snapshot strings only.  
Simplified: QR from persisted `qrPayloadBase64`. Standard: QR from the same
persisted Phase 1 artifact (`SAUDI_PHASE_1_QR_POLICY = ALWAYS_FOR_TAX_INVOICES`).

## Print / Paper / Height

Body class `printing-cashier-saudi-tax-invoice`; ~72.1mm width; content-driven height; no 100vh lock.  
Same view model for screen and print.

## Browser Print Preview

**LIVE PRINT PREVIEW NOT RUN IN-AGENT**

## Failure UX

Payment success retained; Tax Invoice strip shows unavailable / blocked / retryable messaging without reversing PAID.

## Boundaries

Financial / Compliance ownership / Customer Core / Phase 2 — unchanged. Cashier is presentation over Phase 1 read API.

## Migration

None created.

## Tests / Check

Focused Cashier + Tax Invoice suites pass; `pnpm run check` pass. Architecture guards added/updated.

## Deferred

- Domain retry UI (only if productized idempotent retry contract)
- Historical order-history Tax Invoice entry without unrelated redesign
- Operator live Print Preview (1 / 5 / 10+ items)

## Open Questions (unchanged; not resolved by UX)

OQ-CLASS-1, OQ-SELLER-1, OQ-VAT-1, OQ-B2G, OQ-EDU-HEALTH, date-of-supply
