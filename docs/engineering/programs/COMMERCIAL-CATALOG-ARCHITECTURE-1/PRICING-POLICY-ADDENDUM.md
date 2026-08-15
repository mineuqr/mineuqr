# PRICING-POLICY-ADDENDUM.md

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PRICING-POLICY-UPDATE-1 |
| **Date** | 2026-08-15 |
| **Type** | Architecture addendum — does **not** rewrite historical audit findings |
| **Canonical ADRs** | [ADR-ARCH-035 rev 1.1](../../../architecture/adrs/ADR-ARCH-035-commercial-price-semantics.md) · [ADR-ARCH-036 rev 1.1](../../../architecture/adrs/ADR-ARCH-036-mrr-constitution.md) |

## Approved pricing policy (resolved)

The Architecture Authority approved the following commercial pricing behavior. It is now registered in ADR-035 / ADR-036.

| Event | Price that applies |
|-------|--------------------|
| **New Checkout** | Current Live Plan Offer List Price presented at that event → Charged Terms for the new period |
| **Current period** | Existing Charged Terms remain fixed. Catalog edits do not rewrite them. |
| **Price increase during period** | No retroactive charge, supplementary invoice, or mid-period adjustment |
| **Price decrease during period** | No automatic refund or credit |
| **Renewal** | Current Live Plan Offer List Price → new Charged Terms (higher, lower, or equal). **No lifetime price lock.** |
| **New capabilities during period** | May become available under the existing subscription without an additional charge (server `CanUse` remains authoritative) |

```
Live Plan     = current catalog product / entitlement template
Charged Terms = price terms for the current customer subscription period
```

Price is period-bound. Product capabilities follow the current Live Plan.

## MRR alignment

MRR uses current Charged Terms of qualifying ACTIVE paid subscriptions — not current catalog price, not cash paid today.

A catalog change during the period does not move MRR. Renewal that writes new Charged Terms does.

## What this addendum does **not** resolve

1. **Checkout Cutover Design** — `subscription_plans` remains the legacy compatibility charge layer.
2. **MRR FX Policy**
3. **Refund-to-Binding Classification** — Refund ≠ Charged Terms / MRR change unless a future ADR says so.

## Architecture status

Pricing-policy behavior is **registered**. Overall commercial architecture remains:

```
ARCHITECTURE STATUS:
NOT READY — ADDITIONAL DECISION REQUIRED
```
