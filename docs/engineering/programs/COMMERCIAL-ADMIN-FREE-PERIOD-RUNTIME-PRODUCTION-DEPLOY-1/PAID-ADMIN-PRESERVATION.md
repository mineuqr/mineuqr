# PAID ADMIN PRESERVATION

**P0 HARD GATE — PASS**

When `freePeriod` is absent, `applyAdminUserSubscriptionCreate` still:

1. `resolveLivePlanById` (UUID)
2. `resolveChargedTermsForAdminCreate` → `currentPriceForPlan(planId, billingCycleCode)`
3. create subscription
4. `persistAdminCreateChargedTerms` → Binding + Snapshot #1
5. fail closed / compensate-delete if financial persist fails

The free-first branch is an `if (freePeriod)` that calls `persistAdminFreeFirstConcession` and **does not** call `persistAdminCreateChargedTerms`. The `else` paid path is unchanged.

No Production paid subscription was created to prove this. Proof is the deployed source plus passing `subscriptionAudit` / `adminChargedTermsCompletion` tests.

Yearly uses the yearly Live Plan offer. Catalog smoke: Professional monthly `29.00`, yearly `349.00` (not `29 × 12`).
