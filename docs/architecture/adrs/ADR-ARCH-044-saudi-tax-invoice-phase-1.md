# ADR-ARCH-044: Saudi Tax Invoice Phase 1 Generation

> [← ADR-ARCH-043](./ADR-ARCH-043-saudi-tax-invoice-domain-foundation.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted** |
| **Program** | SAUDI-TAX-INVOICE-PHASE-1 |
| **Date** | 2026-08-31 |
| **Implements** | ADR-041 / ADR-043 Phase 1 generation |
| **Does not implement** | Fatoora · Phase 2 · CSID · signing · hash chain · Credit/Debit Notes · VAT engine |

## Decision

Phase 1 generation is owned by Saudi Compliance after Tax Invoice domain ensure.

- Simplified Tax Invoice: Phase 1 QR (TLV tags 1–5 per official QRCodeCreation.pdf).
- Tax Invoice (Standard): Phase 1 QR using the **same** encoder/path
  (`SAUDI_PHASE_1_QR_POLICY = ALWAYS_FOR_TAX_INVOICES` —
  SAUDI-TAX-INVOICE-PHASE-1-QR-UNIFICATION-1).
  This is MineuQR product policy; it is **not** a claim that ZATCA Phase 1
  legally mandates QR on Standard Tax Invoice.
- Regulatory minimum remains: Simplified requires QR.
- Human invoice numbers: restaurant-scoped Compliance sequence (not Cashier invoice).
- Tax amounts: Collection Fact monetary snapshot presentation (OQ-VAT-1 open).
- Seller VAT missing: retryable block (PAID unchanged).

## Related

`docs/engineering/programs/SAUDI-TAX-INVOICE-PHASE-1/`
`docs/engineering/programs/SAUDI-TAX-INVOICE-PHASE-1-QR-UNIFICATION-1/`
