# 03 — UUID CUTOVER DESIGN

## Canonical pair

```
planId   = commercial_plans.id     (UUID)
planCode = commercial_plans.code   (basic | professional | enterprise)
```

Code is not the primary identity.

## Public/admin input

`livePlanUuidInput` (`adoptionService.ts`):

- string
- matches Live Plan UUID regex (version/variant constrained)
- integers and digit-strings fail Zod (`invalid_live_plan_id`)

Then:

- Checkout: `resolveCheckoutOfferFromLivePlan` → existence + not hidden + Offer List Price
- Admin: `resolveCanonicalLivePlanId` → existence (hidden allowed for CS)

Unknown / malformed / nonexistent: **FAIL CLOSED**. No guess from `code`. No arbitrary UUID mapping.

## Internal persist

Unchanged from OD-2: `user_subscriptions.planId` = UUID.

## Webhook dual-read

`parseWebhookPlanRef` → UUID or leftover integer → `resolveCanonicalLivePlanId` → persist UUID.

## No third identity

`listPlans` `id` is now the UUID. `catalogPlanId` remains the same UUID (pre-existing field, not a new third identity). `planCode` is the business key.
