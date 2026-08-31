# SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 — Architecture Decisions

## Aggregate shape

**Decision:** Single table `saudi_tax_invoices` with JSON snapshot columns.

**Why:** Matches Collection Fact JSON snapshot conventions; smallest durable aggregate for identity, classification, state, idempotency, and immutability. Normalized line tables deferred to Phase 1 generation if needed.

## Identity

**Decision:** Internal `taxInvoiceId` (`sti_<uuid>`), independent of orderId / collectionFactId / paymentId.

**Human Tax Invoice Number:** Deferred — not invented in this program.

## Idempotency

**Decision:** `UNIQUE (restaurantId, collectionFactId, documentKind)`.

## Classification

**Decision:** Persist explicit classification. Foundation rules only:
- absent customer → B2C + simplified context (platform invariant)
- present customer → unclassified / undetermined (NEEDS OFFICIAL CONFIRMATION)

Forbidden: `taxNumber ? B2B : B2C`.

## Monetary / VAT

**Decision:** Copy Collection Fact totals into monetary snapshot with explicit `collection_fact_copy_not_saudi_vat_engine`. OQ-VAT-1 deferred.

## Profile not READY

**Decision:** Persist `blocked_profile` aggregate; do not fake issued document. PAID unchanged.
