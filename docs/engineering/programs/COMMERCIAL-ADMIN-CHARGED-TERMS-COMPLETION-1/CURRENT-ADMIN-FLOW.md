# CURRENT ADMIN FLOW (before this program)

```
CustomerSuccessAccountsSection
  ↓ display-only price from listPublishedOfferings (current Live Plan OLP)
  ↓ mutate { userId, planId UUID, billingCycle, status, subscriptionEndDate? }
  ↓
admin.createUserSubscriptionByAdmin
  ↓
applyAdminUserSubscriptionCreate
  ↓ resolveCanonicalLivePlanId (UUID or leftover integer)
  ↓ createSubscriptionForRestaurant
  ↓ audit success
  ↓ ensureLivePlanBoundForSubscription (no billingCycleCode)
  ↓ chargedTermsForPlan(..., "monthly" default)
  ↓ fail-soft: bind error → still return success
```

Gaps: yearly → monthly snapshot; create succeeds without Binding; Admin update re-bound and overwrote Charged Terms from current catalog.
