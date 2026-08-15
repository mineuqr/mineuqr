# MRR-DEPENDENCY.md

## Current (unchanged)

`CanonicalMetricsService.computeMrrFromStates`:

1. Owner states from CRS / hub (`countsInMrr`, `planId`, `billingCycle`)
2. Price from `getSubscriptionPlans()` / `getSubscriptionPlanById`
3. `monthlyEquivalentPlanPrice` (`priceMonthly` or `priceYearly / 12`)

Does **not** read Charged Terms. **Non-compliant with ADR-ARCH-036** (I-CONSOLIDATION-07).

Deprecated `getAdminStatistics` / `getRevenueByMonth` use the same table.

## Why not implemented here

This program must not silently rewrite MRR architecture. Removing the table **requires** an MRR cutover, but mixing that implementation here is forbidden unless required to drop the table in the same program. Drop is **not** authorized here.

## Required future program

**COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1**

```
Qualifying ACTIVE paid subscription
    ↓
Charged Terms (USD)
    ↓
Monthly equivalent
    ↓
MRR
```

No real customer Charged Terms to migrate. Implementation may start from empty/test bindings. Must not invent FX. Must not use `subscription_plans.price`. Must not use current catalog unless it has become Charged Terms at a classified event.

This **blocks SAFE DELETE**.
