# SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 — Final Report

## Verdict

**PASS WITH OPEN QUESTIONS**

## Domain

Saudi Compliance–owned Tax Invoice aggregate (`saudi_tax_invoices`) with ensure path after Collection Fact via Saudi module.

## Tax Invoice Identity

Independent `taxInvoiceId` (`sti_…`). Not orderId / collectionFactId / paymentId.

## Source Sale

`orderId` references `orders.id` for traceability (no cascade ownership).

## Seller Snapshot

Immutable JSON from Saudi Tax Profile at ensure time (`legalName`, VAT status/number, address).

## Buyer Snapshot

Immutable JSON from Customer or `anonymous_cash` when `orders.customerId` is null.

## Line Snapshot

Order items + Collection Fact composition copy. No VAT engine.

## Monetary Snapshot

Copied from Collection Fact; tax amount labeled as CF copy (OQ-VAT-1 deferred).

## Classification

Explicit persisted result. Absent customer → B2C simplified context. Named customer → unclassified until official policy. No `taxNumber ? B2B : B2C`.

## State Machine

`blocked_profile` | `generated` | `failed` | `retryable` — separate from PAID. Generated snapshots immutable.

## Idempotency

`UNIQUE (restaurantId, collectionFactId, documentKind)`; retries converge.

## Tenant Isolation

All lookups scoped by `restaurantId`; cross-tenant order rejected.

## Financial Boundary

Read-only Collection Fact access. No CF/PAID/payment/settlement mutation.

## Compliance Boundary

`dispatch → Orchestrator → saudiZatcaComplianceModule → ensureSaudiTaxInvoiceForCollectionFact`.

## Customer Boundary

Customer Core unchanged; optional `taxNumber` unchanged; no SA branching.

## Saudi Boundary

Domain tables/services under Saudi Compliance; no SA branching in Global Financial Core.

## Migration

| Item | Value |
|------|-------|
| Tag | `0107_saudi_tax_invoices` |
| Governance terminus | 0107 / **108** entries |
| Nature | Additive CREATE TABLE |

## Production

Pending migrate verification in this report’s commit/push section.

## Tests

Focused domain + classification + architecture + evaluation + governance + sale-customer: **PASS**  
`pnpm run check` (tsc): **PASS**  
`pnpm run db:governance-check`: **PASS**

## Check

PASS

## Governance

PASS (terminus 0107)

## Commit / Push / Working Tree

Filled after git steps.

## Deferred

- Human Tax Invoice numbering
- Durable compliance outbox (G1)
- Phase 1 generation / QR
- Phase 2 Fatoora clearance/reporting
- Credit / Debit Notes
- Full legal classification engine
- VAT engine

## Needs Official Confirmation

| ID | Question |
|----|----------|
| OQ-CLASS-1 | Named Individual without VAT → Simplified always? |
| OQ-SELLER-1 | Seller `not_registered` issuance policy |
| OQ-VAT-1 | VAT line SSOT vs Collection Fact |
| OQ-PHASE-1 | Phase 1-only vs Phase 2-ready schema depth |
| OQ-B2G | B2G in first MVP? |
| OQ-EDU-HEALTH | Education/health special cases |

## Open Questions

Same as Needs Official Confirmation (policy, not architecture conflicts).

## Scope certification

NO ZATCA API WAS IMPLEMENTED.  
NO FATOORA INTEGRATION WAS IMPLEMENTED.  
NO IRN WAS IMPLEMENTED.  
NO QR GENERATION WAS IMPLEMENTED.  
NO VAT ENGINE WAS IMPLEMENTED.  
NO B2B/B2C LEGAL CLASSIFICATION ENGINE WAS IMPLEMENTED BEYOND THE APPROVED DOMAIN FOUNDATION.  
NO CREDIT NOTE WAS IMPLEMENTED.  
NO DEBIT NOTE WAS IMPLEMENTED.  
NO PAYMENT CONTRACT WAS CHANGED.  
NO COLLECTION FACT SEMANTICS WERE CHANGED.  
NO PAID SEMANTICS WERE CHANGED.  
NO SETTLEMENT SEMANTICS WERE CHANGED.  
NO CUSTOMER CORE REDESIGN WAS PERFORMED.  
NO SAUDI LOGIC WAS ADDED TO GLOBAL CORE.
