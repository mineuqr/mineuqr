# ADR-ARCH-035: Commercial Price Semantics

> [← ADR-ARCH-034](./ADR-ARCH-034-commercial-catalog-authority.md) · [→ ADR-ARCH-036](./ADR-ARCH-036-mrr-constitution.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|-------|-------|
| **Status** | **Accepted** (governance) |
| **Owner** | Architecture Authority |
| **Program** | COMMERCIAL-ADR-REGISTRATION-1 · COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-PRICING-POLICY-UPDATE-1 |
| **Date** | 2026-08-15 |
| **Revision** | **1.1** |
| **Supersedes** | — |
| **Refines** | ADR-ARCH-034 (list price ownership) |
| **Does not modify** | Checkout runtime · `subscription_plans` production data · Charged Terms rows · ADR-020 money |
| **Related ADRs** | ADR-ARCH-002 · 006 · 020 · 034 · 036 |
| **Related programs** | COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-PRICING-POLICY-UPDATE-1 · COMMERCIAL-LIVE-PLANS-APPLICATION-CUTOVER-1 (checkout boundary evidence) |
| **Implementation status** | **Governance only** — this ADR authorizes no Checkout rewrite, price sync, or production price change. |
| **Currency** | Subscription commercial pricing and MRR reporting currency: **USD**. Restaurant menu currency (e.g. SAR) is a separate presentation/business concept and MUST NOT be confused with subscription billing currency. This ADR does **not** reopen USD/SAR. |

---

## Context

Public Pricing reads Live Plan `commercial_prices`. Checkout charges `subscription_plans` (e.g. Professional list 26.40 USD vs checkout 39.00 USD). Bindings store Charged Terms captured at classified events.

## Problem

One word (“price”) is used for catalog display, checkout charge, contracted amount, and renewal. That collapse produces a source-of-truth defect and risks silent history rewrite.

## Decision

Formally distinguish these semantics. They MUST NOT share one mutable field.

| Concept | Definition |
|---------|------------|
| **Catalog / Offer list price** | Current Live Plan price for the sellable offer (cycle + USD). Future canonical source for **new** Checkout. |
| **Checkout price** | Amount offered/charged in a **new** Checkout flow. **Target:** Live Plan Offer list price → Checkout. **Current:** `subscription_plans` (**LEGACY COMPATIBILITY CHARGE LAYER**). |
| **Charged Terms** | Customer-specific contractual terms on the subscription instance. Catalog edits MUST NOT silently mutate them. |
| **Renewal / Re-bind price** | **Current** Live Plan Offer List Price at the classified Renewal event, then written as Charged Terms for the **new** period. MAY be higher, lower, or equal to the previous Charged Terms. |
| **Upgrade price** | Price applicable when the customer **explicitly upgrades**. |
| **Downgrade price** | Price applicable when the customer **explicitly downgrades**. |

New Checkout, Renewal/Re-bind, Upgrade, and Downgrade are **distinct event classes**. This revision specifies New Checkout and Renewal pricing. It does **not** invent a new Upgrade/Downgrade price algorithm.

### Approved period and renewal policy (rev 1.1)

The current Live Plan Offer List Price is the authoritative price for **New Checkout** and **Renewal**. The price displayed to the customer at that event is the price that applies to that event.

#### New Checkout

```
Current Live Plan
        ↓
Current Offer List Price
        ↓
Checkout
        ↓
Customer pays that presented price
        ↓
Charged Terms for the subscription period
```

Example: Live Plan Professional = $35 → Checkout = $35 → Charged Terms = $35.

The customer MUST NOT be charged a different hidden price from the one presented for that commercial event (I-PRICE-01).

**Target architecture** (not implemented by this ADR):

```
New Checkout → Current Live Plan Offer List Price → Charged Terms
```

Current Checkout remains on `subscription_plans` (**LEGACY COMPATIBILITY CHARGE LAYER**) until a separate Checkout Cutover program.

#### Current subscription period

Once a period is established, **Charged Terms are fixed for that period** (I-PRICE-02).

A Live Plan catalog price change MUST NOT modify current-period Charged Terms. There is **no automatic synchronization** from Live Plan price onto active-period Charged Terms.

#### Price increase during the period

If Charged Terms = $35 and the catalog later becomes $45:

- Current period remains $35.
- No retroactive charge, supplementary invoice, automatic repricing, or mid-period adjustment (I-PRICE-03).
- $45 becomes relevant at the next qualifying Renewal.

#### Price decrease during the period

If Charged Terms = $45 and the catalog later becomes $35:

- Current period remains $45.
- No automatic refund, retroactive repricing, or credit merely because the catalog decreased (I-PRICE-04).
- $35 becomes relevant at the next qualifying Renewal.

#### Renewal

At Renewal, the **current** Live Plan Offer List Price becomes the Charged Terms for the **new** period (I-PRICE-05), whether that price is higher, lower, or equal to the previous Charged Terms (I-PRICE-06).

```
Renewal → Current Live Plan Offer List Price → New Charged Terms
```

Examples:

- Previous Charged Terms $35, catalog at Renewal $45 → new Charged Terms $45.
- Previous Charged Terms $45, catalog at Renewal $35 → new Charged Terms $35.

**There is no lifetime price lock.** The price is locked **only for the current subscription period**.

#### Plan product vs price period

```
Live Plan     = current catalog product / entitlement template
Charged Terms = price terms for the current customer subscription period
```

Price is period-bound. Product capabilities follow the current Live Plan entitlement semantics (ADR-034). Do not create a full plan-version lock merely to preserve historical pricing.

If new capabilities are added to the customer's Live Plan during the current period, the customer may receive those capabilities under the existing subscription **without an additional charge** (I-PRICE-07), subject to server-side entitlement enforcement. This does **not** permit altering historical Charged Terms.

### Legacy `subscription_plans`

Current Checkout dependency is a **LEGACY COMPATIBILITY CHARGE LAYER**. It is not the target catalog SSOT.

This ADR does **not** delete, migrate, rewrite Checkout, auto-synchronize, or change production `subscription_plans` data.

Eventual transition to Live Plan Offer list price requires a **separate approved Checkout Cutover program**.

### Source-of-truth defect (not fixed here)

```
Live Plan Professional = 26.40 USD
Legacy Checkout price  = 39.00 USD
```

Classified as a **SOURCE-OF-TRUTH DEFECT**. Architecture: future Checkout must use the Live Plan Offer list price. Current legacy behavior remains untouched until cutover.

## Scope

**In:** Price terminology, event classes, New Checkout and Renewal policy, current-period lock, increase/decrease behavior, USD subscription currency, legacy charge-layer classification.  
**Out:** Checkout Cutover Design (dual-write, rollback, provider amount path, customer messaging), implementation, FX policy, refund-to-binding.

## Consequences

+ Implementers cannot treat 26.40 and 39.00 as “the same price.”  
+ History remains on Charged Terms for the current period; Renewal uses the current Offer List Price.  
+ No lifetime lock; no mid-period charge or catalog-decrease refund.  
− Dual book remains until cutover.  
− Customers may still be charged a different amount than Pricing shows until Checkout Cutover.

## Invariants

- **I-PRICE-01** A customer MUST be charged the applicable Live Plan Offer List Price presented for the qualifying New Checkout or Renewal event.
- **I-PRICE-02** Charged Terms MUST remain immutable for the current subscription period.
- **I-PRICE-03** A Live Plan price increase MUST NOT create a retroactive charge for the current subscription period.
- **I-PRICE-04** A Live Plan price decrease MUST NOT create an automatic refund or credit for the current subscription period.
- **I-PRICE-05** At Renewal, the current Live Plan Offer List Price becomes the Charged Terms for the new subscription period.
- **I-PRICE-06** The renewal price MAY be higher, lower, or equal to the previous Charged Terms.
- **I-PRICE-07** New capabilities added to the current Live Plan may become available to existing subscribers without an additional charge during their current subscription period, subject to server-side entitlement enforcement.
- **I-PRICE-10** Restaurant/menu currency MUST NOT redefine subscription billing currency.
- Catalog edit ≠ Charged Terms mutation (no automatic catalog→period sync).
- Checkout **target** = Offer list price (USD). Current checkout remains the legacy charge layer until cutover.
- `subscription_plans` is not catalog authority.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| One mutable price for all semantics | Rewrites history |
| Permanent dual book | Commercial inconsistency |
| Implement cutover in this ADR | Cutover design is an **open decision** |
| Lifetime price lock | Rejected: lock is period-only; Renewal uses current Offer List Price |
| Mid-period catalog sync onto Charged Terms | Rewrites the current period; violates I-PRICE-02…04 |
| Reopen USD vs SAR for subscriptions | Explicitly closed: subscription/MRR = USD |

## Ownership boundaries

| Semantic | Owner |
|----------|-------|
| Offer list price | Live Plan (ADR-034) |
| Current checkout charge | `subscription_plans` until cutover |
| Charged Terms | Binding / subscription contract |
| Operational settlement | Check (ADR-020) |

## Migration implications

Gated. No code in this program. Cutover program must be approved after a dedicated **Checkout Cutover Design**.

## Open decisions

1. **Checkout cutover design** (dual-write, rollback, provider amount path, customer messaging). Not decided here.
