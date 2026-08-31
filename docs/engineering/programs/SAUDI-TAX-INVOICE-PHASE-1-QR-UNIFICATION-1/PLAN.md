# SAUDI-TAX-INVOICE-PHASE-1-QR-UNIFICATION-1 — Plan

## Previous behavior

- Simplified Tax Invoice → Phase 1 QR generated/persisted/rendered
- Standard Tax Invoice → QR omitted (`qrRequired = isSimplified…`)

## New MineuQR product policy

`SAUDI_PHASE_1_QR_POLICY = ALWAYS_FOR_TAX_INVOICES`

- Simplified → QR
- Standard → QR (same encoder path: `buildSaudiPhase1QrPayloadBase64`)

## Regulatory distinction

- Regulatory minimum: Simplified Tax Invoice requires QR.
- Product policy: both Simplified and Standard include Phase 1 QR.
- This is **not** a claim that ZATCA Phase 1 legally mandates QR on Standard.

## Architecture

Unchanged pipeline. Single QR path in Saudi Compliance Phase 1 generation.
Cashier only renders persisted `qrPayloadBase64`. No migration expected.
