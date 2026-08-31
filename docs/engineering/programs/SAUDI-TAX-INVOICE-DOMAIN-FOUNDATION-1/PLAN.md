# SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 — Plan

## Goal

Establish the internal Saudi Tax Invoice domain foundation: independent identity, immutable snapshots, explicit classification storage, compliance state machine, idempotency, and Saudi Compliance wiring after Collection Fact.

## Non-goals

ZATCA API · Fatoora · IRN · QR · VAT engine · Credit/Debit Notes · Cashier tax UI · Customer Core SA branching · Collection Fact / PAID semantic changes · human Tax Invoice numbering

## Architecture

```
Collection Fact → dispatchComplianceAfterProductionCollectionFact
  → ComplianceOrchestrator → saudiZatcaComplianceModule
  → ensureSaudiTaxInvoiceForCollectionFact
```

Financial truth remains Collection Fact / PAID. Tax Invoice is a Compliance artifact.

## Schema decision

Single aggregate table `saudi_tax_invoices` with JSON snapshots (aligned with Collection Fact JSON conventions). Separate line tables deferred until Phase 1 generation needs them.

Idempotency: `UNIQUE (restaurantId, collectionFactId, documentKind)`.

## Classification foundation

- Null customer → B2C + Simplified context (platform invariant)
- Named customer → unclassified / undetermined until official policy (OQ-CLASS-1)
- Forbidden: `taxNumber ? B2B : B2C`

## Verification

Focused domain tests · architecture guards · customer/sale regression · `pnpm run check` · `pnpm run db:governance-check` · Production migrate 0107
