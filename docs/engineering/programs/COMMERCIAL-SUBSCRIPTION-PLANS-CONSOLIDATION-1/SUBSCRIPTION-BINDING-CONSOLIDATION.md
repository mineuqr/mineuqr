# SUBSCRIPTION-BINDING-CONSOLIDATION.md

## Current bind path (unchanged this program)

```
Trial / register / admin / webhook activation
    ↓
user_subscriptions.planId = integer handle
    ↓
bindSubscriptionToLivePlan / ensureLivePlanBoundForSubscription
    ↓
Live Plan UUID + chargedTermsForPlan(current Offer Price)
    ↓
commercial_subscription_bindings
```

| Question | Answer |
|----------|--------|
| Plan identity | Live Plan UUID on binding; integer on `user_subscriptions.planId` |
| Price written to Charged Terms | **Live Plan** at bind — not `subscription_plans` |
| Billing cycle | Subscription row + binding cycle codes |
| Is `subscription_plans` required to bind? | **No** for Charged Terms. Integer handle still used to *find* the Live Plan via `LEGACY_PLAN_BRIDGE` |
| Does Live Plan supply bind data? | **Yes** |

## No customer contract migration

Bindings were **0** on 2026-08-14. No real Charged Terms to preserve. This program does **not** backfill, re-bind, or grandfather.

## Independence (I-CONSOLIDATION-04 / 05)

After bind, catalog edits must not rewrite `chargedAmount`. Existing `bindSubscriptionToLivePlan` writes current offer at the event; later `saveLive` price edits do not update existing binding amounts (no catalog→binding sync).

Renewal (`event=renewal`) writes **new** Charged Terms from current offer (I-CONSOLIDATION-06). Not implemented as a new flow here.

## Residual

`legacyPlanId` on the binding and `user_subscriptions.planId` remain compatibility identifiers. They are not a second price book.
