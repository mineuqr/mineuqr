# SUBSCRIPTION-AUDIT.md

## Tables

| Table | Role |
|-------|------|
| `user_subscriptions` | Instance: `planId` (legacy int), status, billingCycle, period, trialEndsAt, payment refs |
| `commercial_subscription_bindings` | Live `planId` UUID + charged terms + cycle |
| `subscription_plans` | Legacy plan rows for checkout / MRR / DTO |

## Identity chain

```
Subscription (user_subscriptions)
  → Binding (commercial_subscription_bindings)
  → Live Plan (capabilities + limits + catalog prices)
  → Entitlements (resolveOwnerEntitlements)
  → Limits (checkLimit)
  → MRR (currently subscription_plans, not binding)
```

## Competing plan identity

| Source | Type | Status |
|--------|------|--------|
| `commercial_plans.code` | string | **CANONICAL** catalog |
| Binding `planId` | UUID | **CANONICAL** runtime for bound customers |
| `user_subscriptions.planId` | int 30001–30003 | **LEGACY_COMPATIBILITY** payment / MRR key |
| `LEGACY_PLAN_BRIDGE` | map | **LEGACY_COMPATIBILITY** |
| Owner simulation code | string | Owner path only |

## Lifecycle

- Trial: Professional live plan + status `trial` + 14-day policy; commercial plan **TRIAL** (not PROFESSIONAL).
- Paid activation / renewal / admin change: `ensureLivePlanBoundForSubscription` re-captures **current catalog** price into charged terms.
- Expiry / entitlements off: account state **FROZEN**.
- Never-subscribed: **NONE**.
- Cancel: DB status exists; Subscription UI cancel is a **stub** (no API).
