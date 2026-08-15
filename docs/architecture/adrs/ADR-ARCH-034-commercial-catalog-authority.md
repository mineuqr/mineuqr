# ADR-ARCH-034: Commercial Catalog Authority

> [← ADR-ARCH-002](./ADR-ARCH-002.md) · [← ADR-ARCH-003](./ADR-ARCH-003.md) · [← ADR-ARCH-006](./ADR-ARCH-006.md) · [→ ADR-ARCH-035](./ADR-ARCH-035-commercial-price-semantics.md) · [→ ADR-ARCH-036](./ADR-ARCH-036-mrr-constitution.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|-------|-------|
| **Status** | **Accepted** (governance) |
| **Owner** | Architecture Authority |
| **Program** | COMMERCIAL-ADR-REGISTRATION-1 · COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-PRICING-POLICY-UPDATE-1 |
| **Date** | 2026-08-15 |
| **Revision** | **1.1** |
| **Supersedes** | — |
| **Refines** | ADR-ARCH-002 (SSOT by semantic) · ADR-ARCH-003 (ownership) · ADR-ARCH-006 (UI presentation) · Commercial Entitlement Enforcement Constitution v1.0 |
| **Does not modify** | ADR-ARCH-001 / 007 Order · ADR-ARCH-020 Check money · ADR-ARCH-022 / 026 Settlement · Owner Access Mode · Frozen account state · Checkout runtime · MRR runtime |
| **Related ADRs** | ADR-ARCH-002 · 003 · 006 · 020 · 035 · 036 |
| **Related programs** | COMMERCIAL-CATALOG-ARCHITECTURE-1 · COMMERCIAL-CATALOG-PLANS-MRR-UI-AUDIT-CLEANUP-1 · COMMERCIAL-LIVE-PLANS-* · COMMERCIAL-ENTITLEMENT-ENFORCEMENT-GOVERNANCE-1 |
| **Implementation status** | **Governance only** — this ADR authorizes no schema, Checkout, MRR, Limits, or entitlement code change. |
| **Numbering note** | Next free constitutional number after ADR-ARCH-033. Unpublished RBAC / Tenant Identity / Subscription Platform *recommendations* had suggested 034–036 but were never registered. Those recommendations are not ADRs and are not superseded here. |

---

## Context

Live Plans already persist catalog identity, capabilities, limits, and public list prices (`commercial_plans` and related tables; `saveLive`). Customer contract state lives on the subscription instance plus Charged Terms (`commercial_subscription_bindings`). Checkout and current MRR still read `subscription_plans`.

## Problem

Without a registered catalog authority, implementers may treat Live Plan, `subscription_plans`, Charged Terms, or UI flags as interchangeable sources of truth.

## Decision

**Live Plan is the canonical commercial catalog authority.**

A Live Plan represents:

1. Catalog identity  
2. Sellable product definition  
3. Entitlement template  

It is **not** the customer contract.

The customer contract is:

```
Subscription Instance + Charged Terms
```

### Live Plan owns

- Plan identity (code / UUID / commercial name)
- Plan capabilities (composition)
- Plan limits (composition)
- Public list price (catalog / offer list price)
- Sellable catalog definition
- Entitlement template (what an ACTIVE bound account receives **now** — capabilities/limits follow the current Live Plan; new capabilities may apply during the current period without an additional charge, I-PRICE-07 / ADR-035)

### Live Plan does not own

- Customer-specific historical Charged Terms
- Historical contractual price
- Customer subscription lifecycle
- Customer-specific financial settlement (Check / Settlement Record)
- MRR as an independent persisted financial truth

### Capability vs implementation

A capability declared on a Live Plan is **not** necessarily implemented. Server-side `CanUse(account, capability)` (or the approved hub equivalent: `requireFeature` / `hasFeature`) is authoritative. UI is presentation (ADR-ARCH-006).

Known fully enforced today: `ordering`, `devices`. Other catalog flags must not be represented as fully implemented.

### Limits

Capability = whether a feature is available.  
Limit = how much may be used.  
Limits are part of the Live Plan entitlement template. Pricing presentation of limits is a future UI concern. This ADR does not repair or change limit values or enforcement.

### `isSubscriptionActive`

Coarse trial/active **row-liveness** (with an administrative skip in some mutations). It is **not** the Commercial Hub and must not be mass-replaced under this ADR.

### Price-change invariant

A change to the Live Plan catalog price **MUST NOT** rewrite existing customer Charged Terms.

A new catalog price becomes applicable only at classified commercial events. Currently recognized classes (semantically distinct):

```
New Checkout
Renewal / Re-bind
Upgrade
Downgrade
```

These MUST NOT be treated as one generic “price change” event.

Period lock, no lifetime price lock, New Checkout / Renewal use of the current Offer List Price, and increase/decrease behavior are specified in **ADR-ARCH-035 rev 1.1**. This ADR does not change those rules.

## Scope

**In:** Catalog ownership, Live Plan semantics, relationship to contract and entitlements.  
**Out:** Checkout cutover implementation, MRR calculation, Limits repair, capability enforcement programs.

## Consequences

+ One catalog authority for identity, capabilities, limits, and list price.  
+ Contract history remains on Charged Terms.  
− Dual charge book (`subscription_plans`) remains until ADR-035 cutover.  
− flags_only capabilities remain advertised until per-capability programs.

## Invariants

- I-CATALOG-01 Live Plan is catalog authority.  
- I-CATALOG-02 Capabilities ≠ Limits.  
- Catalog price edit ≠ Charged Terms mutation.  
- UI visibility ≠ authorization.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Restore versioned snapshots | Retired in 0086; dynamic Live Plan is approved |
| Live Plan owns Charged Terms | Collapses catalog with customer contract |
| Delete `subscription_plans` now | Checkout / current MRR still depend on it |

## Ownership boundaries

| Concern | Owner |
|---------|-------|
| Catalog composition | Live Plan / Catalog services |
| Contract amount | Charged Terms / binding |
| Operational money | Check (ADR-020) |
| Recurring metric policy | ADR-ARCH-036 |

## Migration implications

None in this program. Future Checkout and MRR programs must cite this ADR and ADR-035 / 036. No automatic sync from catalog to `subscription_plans`.

## Open decisions

None owned by this ADR. Checkout cutover design remains open under ADR-035.
