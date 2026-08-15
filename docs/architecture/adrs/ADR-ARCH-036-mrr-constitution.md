# ADR-ARCH-036: Commercial MRR Constitution

> [← ADR-ARCH-034](./ADR-ARCH-034-commercial-catalog-authority.md) · [← ADR-ARCH-035](./ADR-ARCH-035-commercial-price-semantics.md) · [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|-------|-------|
| **Status** | **Accepted** (governance) |
| **Owner** | Architecture Authority |
| **Program** | COMMERCIAL-ADR-REGISTRATION-1 · COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-PRICING-POLICY-UPDATE-1 |
| **Date** | 2026-08-15 |
| **Revision** | **1.1** |
| **Supersedes** | — |
| **Refines** | ADR-ARCH-034 / 035 (Charged Terms as contract amount) |
| **Does not modify** | ADR-ARCH-020 / 022 / 026 operational revenue · current MRR code · Charged Terms rows |
| **Related ADRs** | ADR-ARCH-002 · 020 · 022 · 026 · 034 · 035 |
| **Related programs** | COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-PRICING-POLICY-UPDATE-1 · COMMERCIAL-CATALOG-PLANS-MRR-UI-AUDIT-CLEANUP-1 |
| **Implementation status** | **Governance only** — current `CanonicalMetricsService` remains **non-compliant** until a gated MRR program. This ADR authorizes no MRR code change. |
| **Currency** | MRR is a **USD** commercial metric (ADR-035). **FX treatment is an OPEN POLICY DECISION** — this ADR does not invent an FX source, date, or conversion. |

---

## Context

Admin MRR today sums `subscription_plans` monthly-equivalents for owners with `countsInMrr`. Charged Terms already exist on bindings. Operational revenue is Check-owned:

```
Revenue = SUM(Paid Check.grandTotal)
```

## Problem

Without a registered MRR constitution, implementers may treat catalog price, checkout price, or Check Revenue as MRR.

## Decision

MRR is a **commercial recurring-revenue metric**. It is **not** Check Revenue, Settlement Revenue, Order Sales, or operational financial revenue.

### Canonical source

> **Charged Terms of qualifying ACTIVE paid customer subscriptions**

NOT `subscription_plans.price`.  
NOT Live Plan catalog price, unless that price has already become the subscription’s Charged Terms through a valid commercial event (ADR-034 / 035).

```
Current Catalog Price  ≠  MRR directly

Current Subscription
        ↓
Current Charged Terms
        ↓
Monthly Equivalent
        ↓
MRR
```

At Renewal (ADR-035):

```
Current Live Plan Offer List Price
        ↓
New Charged Terms
        ↓
New MRR value
```

A catalog price change during the current period does **not** move MRR. MRR changes when Renewal (or another classified commercial event that writes new Charged Terms) establishes new Charged Terms.

MRR is **not** “cash paid today.”  
MRR is **not** “current catalog price × active customers.”

> **MRR is the monthly-equivalent recurring contractual value represented by the current Charged Terms of qualifying ACTIVE paid subscriptions.**

Cash collection and refunds remain separate financial events (ADR-020 / open refund-to-binding).

### Period and renewal examples (rev 1.1)

Subscribe at $35. Catalog later becomes $45 during the period:

- Charged Terms remain $35.
- MRR remains $35.

At Renewal, catalog is $45:

- New Charged Terms = $45.
- MRR becomes $45.

If the catalog instead falls to $25 before Renewal:

- New Charged Terms = $25.
- MRR = $25.

Therefore the current MRR implementation that derives from `subscription_plans` is:

> **NON-COMPLIANT WITH THIS CONSTITUTION**

It MUST NOT be modified in this governance program. A gated MRR implementation program is required later.

### Eligibility

**Includes:** ACTIVE paid customer subscriptions (positive recurring Charged Terms).

**Excludes:**

- Trial  
- Frozen  
- NONE  
- PLATFORM_OWNER  
- FULL_PLATFORM  
- SIMULATED_PLAN  
- Complimentary zero-value subscriptions  
- Subscriptions with zero recurring charged value  

Do not invent additional exclusions in this ADR.

### Monthly normalization (conceptual — not implemented here)

```
Monthly Charged Terms  →  MRR += monthly amount
Annual Charged Terms   →  MRR += annual recurring amount / 12
```

### Refund ≠ contract change

A refund does **not** automatically change MRR.  
A refund does **not** automatically change Charged Terms.

```
Refund  ≠  Subscription Contract Change
```

unless a future approved policy explicitly connects them.

## Scope

**In:** MRR definition, source, inclusion/exclusion, normalization concept, separation from Check Revenue.  
**Out:** Implementation, FX policy, refund-to-binding policy.

## Consequences

+ MRR cannot be used as a second financial SSOT.  
+ Target metric matches contracted recurring amount.  
− Production KPIs remain non-compliant until the gated program.  
− FX and refund-to-binding remain open.

## Invariants

- **I-PRICE-08** MRR MUST use the current Charged Terms of qualifying subscriptions, not the current Live Plan catalog price directly.
- **I-PRICE-09** MRR MUST NOT be treated as Check Revenue.
- MRR source = Charged Terms of qualifying subscriptions.
- Catalog edit during the current period does not move MRR; Renewal that writes new Charged Terms does.
- Owner / simulation never enter MRR.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Catalog price as MRR | Moves when the editor saves |
| Keep `subscription_plans` as MRR law | Not contracted amount; dual book |
| Merge MRR into Check Revenue | Violates ADR-020 |
| Invent FX or refund rules here | Open policy decisions |

## Ownership boundaries

| Concern | Owner |
|---------|-------|
| Operational revenue | Check (ADR-020) |
| Charged Terms | Subscription binding (ADR-034 / 035) |
| MRR policy | This ADR |
| MRR implementation | Future gated program only |

## Migration implications

Gated. No code in this program. Implementation must wait for **MRR FX Policy** and **Refund-to-Binding Classification**.

## Open decisions

1. **MRR FX policy** — OPEN POLICY DECISION. No FX source, date, or conversion is adopted here.  
2. **Refund-to-binding classification** — OPEN POLICY DECISION. Refund ≠ Charged Terms / MRR change unless a future ADR says so.  
3. Unspecified edge cases (e.g. mid-period proration detail) remain **open MRR policy items** — do not guess.
