# ADMIN CREATE FORENSICS

## Execution graph (current code)

```
CustomerSuccessAccountsSection
  (openCreateSubDialog: billingCycle default "monthly")
  ↓
SubscriptionAdminFormFields
  + useSubscriptionFormPreview
  + formatPlanPriceForCycle / formatAdminSubscriptionPrice
  ↓ display-only price from commercialCatalog.listPublishedOfferings
     (Live Plan Offer List Price: priceMonthly / priceYearly)
  ↓ mutate payload: { userId, planId, billingCycle, status, subscriptionEndDate? }
     NO amount
  ↓
admin.createUserSubscriptionByAdmin
  (livePlanUuidInput, billingCycle enum, optional status/end date)
  ↓
applyAdminUserSubscriptionCreate
  ↓ assertProtectedUserSubscriptionModifiable
  ↓ restaurantId must be 0
  ↓ ownerHasEntitledAccountSubscription → CONFLICT if entitled
  ↓ resolveCanonicalLivePlanId(planId)
  ↓ buildAdminSubscriptionInsert
       restaurantId: 0
       planId: live UUID
       status: input or "active"
       billingCycle: input
       currentPeriodStart: now
       currentPeriodEnd: subscriptionEndDate OR yearly +1y OR monthly +1m OR trial +14d
       NO chargedAmount
  ↓ createSubscriptionForRestaurant
  ↓ audit subscription_created_by_admin
       after/metadata: plan, status, startDate, expiration
       NO amount, NO billingCycle
  ↓ ensureLivePlanBoundForSubscription({
       subscriptionId, planId: livePlanId, event: "plan_selected", actorId
     })
       billingCycleCode NOT passed
  ↓ bindSubscriptionToLivePlan
       chargedTermsForPlan(planId, billingCycleCode ?? "monthly")
  ↓ on success: Binding + Charged Terms from CURRENT catalog
  ↓ on failure: catch → return null (create still succeeds)
  ↓
MRR: only if later Charged Terms exist and owner is commercially qualifying
```

## Proven ownership

| Step | Owner | Amount? |
|------|--------|---------|
| UI route | Admin Customer Success accounts (`CustomerSuccessAccountsSection`) | Display only |
| Catalog query | `commercialCatalog.listPublishedOfferings` → `listLivePlanOfferings` | Current global Offer List Price |
| Procedure | `admin.createUserSubscriptionByAdmin` | No amount input |
| Service | `applyAdminUserSubscriptionCreate` | No amount persist |
| Plan identity | `resolveCanonicalLivePlanId` → `commercial_plans.id` | — |
| Price source for display | `commercial_prices` via offering `priceMonthly` / `priceYearly` | Not written |
| Billing cycle | Admin form `billingCycle` → `user_subscriptions.billingCycle` | Persisted |
| Status | Admin form / default `active` | Persisted |
| Period | `computeAdminSubscriptionPeriodEnd` | Persisted |
| Binding | `ensureLivePlanBoundForSubscription` **since `fe209565` 2026-08-15 01:10:41 +0300** | Fail-soft |
| Charged Terms | `chargedTermsForPlan(..., billingCycleCode ?? "monthly")` | Catalog snapshot at bind, **not** Admin input |

## Intended vs proven

Current code **intends** a Binding + Charged Terms on Admin create (`ensureLivePlanBoundForSubscription` is called).

That intent is **not** an invariant:

1. Bind writers did not exist at 780001 create time (2026-06-21). Table `commercial_subscription_bindings` was added in `0085` (commit `3ad80639`, 2026-07-29). Charged Terms columns arrived with live-plan cutover (`fe209565` / `0086`, 2026-08-15).
2. Bind is fail-soft: exception → `null`; subscription row remains.
3. `billingCycleCode` is omitted → yearly Admin creates would snapshot **monthly** catalog price if bind succeeded.

Do not assume every Admin-created row has a Binding. Production proves both outcomes: 750001/780001 (no bind) and 810001/840001 (bind present, created 2026-08-15 after cutover).

## Create guard and duplicates

`ownerHasEntitledAccountSubscription` blocks create only when CRS `isEntitled` is true. A row with `status = active` and an **elapsed** `currentPeriodEnd` is not entitled, so a second account-level row can be created. That is how user `14760004` accumulated multiple `restaurantId = 0` rows. See `MULTI-SUBSCRIPTION-FORENSICS.md`.
