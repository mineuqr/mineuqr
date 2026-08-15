# MRR-SOURCE-MIGRATION

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1

## Target

```
LIVE PLAN                 Catalog Authority (not an MRR input)
    │
CHECKOUT                  Creates Charged Terms at classified events (out of scope)
    │
SUBSCRIPTION              Lifecycle / eligibility inputs
    │
CHARGED TERMS             Canonical recurring contract amount
    │
MRR                       Derived monthly-equivalent sum
```

## Implementation

| Piece | File |
|-------|------|
| Batch loader | `server/commercial/metrics/chargedTermsMrr.ts` → `loadChargedTermsForMrr` |
| Monthly equivalent | `monthlyEquivalentFromChargedTerms` |
| Aggregate | `computeMrrFromChargedTerms` |
| CMS wiring | `CanonicalMetricsService.computeMrrFromStates` |

### Query pattern

1. Filter owner states with `countsInMrr === true` and a `subscriptionId`.
2. One `IN (subscriptionIds)` select from `commercial_subscription_bindings` of `subscriptionId`, `chargedAmount`, `chargedCurrency`, `billingCycleCode`.
3. Pure sum. No N+1. No `subscription_plans` join. No Live Plan read. No payment / check read.

### Missing Charged Terms

**Classification:** `INCOMPLETE_CHARGED_TERMS`  
**Contribution:** `0`  
**Fallbacks forbidden:** Live Plan list price, `subscription_plans.price`, checkout amount, provider amount.

This is explicit and deterministic. It does not invent a contract.

### Removed from CMS

- `getSubscriptionPlans`
- `getSubscriptionPlanById`
- `monthlyEquivalentPlanPrice`
- `planId != null` as a price-lookup gate (legacy catalog identity)

Eligibility gate is now `countsInMrr` (hub) plus `subscriptionId` (required to load the contract row).

## Determinism

Same qualifying owner states + same Charged Terms rows → same MRR.

Not used: current time, payment timestamps, provider responses, current catalog price.

## Unchanged ownership

| Concern | Owner | This program |
|---------|-------|--------------|
| Live Plan | Catalog | Unchanged |
| Subscription lifecycle | Subscription | Unchanged |
| Charged Terms write | Binding events | Unchanged |
| Payment transaction | Payment | Unchanged |
| Check / Settlement / Check Revenue | Check (ADR-020) | Unchanged |
| MRR | Derived from Charged Terms | **Source migrated** |
