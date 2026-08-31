# SAUDI-TAX-INVOICE-PHASE-1 — Implementation

## Flow

```
Collection Fact → ComplianceOrchestrator → Saudi module
  → ensureSaudiTaxInvoiceForCollectionFact
  → applySaudiPhase1Generation
  → invoiceNumber + QR + phase1DocumentJson
```

## Schema (0108)

- `saudi_tax_invoice_sequences`
- Columns: `invoiceNumber`, `invoiceSequence`, `issueTimestampIso`, `qrPayloadBase64`, `phase1DocumentJson`

## API

`saudiTaxInvoice.getPhase1ById` / `getPhase1ByOrder` — tenant-scoped read + HTML.

## Classification Phase 1 policy

- Absent buyer → Simplified  
- Business + taxNumber → Tax Invoice  
- Other named → Simplified (OQ-CLASS-1 documented)  
- Forbidden: taxNumber alone → B2B/B2C
