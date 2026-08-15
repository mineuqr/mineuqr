# DATABASE-CONSOLIDATION.md

No destructive migration in this program. No third plan table.

## `subscription_plans`

Still in `drizzle/schema.ts`. ORM accessors remain (`getSubscriptionPlans`, `getSubscriptionPlanById`, `createSubscriptionPlan`).

## References (no formal FK)

| Column | Runtime-critical? | Migrate to |
|--------|-------------------|------------|
| `user_subscriptions.planId` (int) | Yes — activation / admin / trial | Live Plan UUID on binding; integer until identity cutover |
| `commercial_subscription_bindings.legacyPlanId` | Compatibility | Drop after identity cutover |
| `commercial_subscription_bindings.planId` | Yes — already Live Plan UUID | Already correct |

## Scripts

Reset scripts **PRESERVE** `subscription_plans`. `seed-plans.mjs` can wipe/reseed — do not run against production. Update preserve-lists only in SAFE DELETE.

## Action

**RETAIN TEMPORARILY** until MRR + residual reads are gone. Then archive-or-drop in COMMERCIAL-SUBSCRIPTION-PLANS-SAFE-DELETE-1. Historical customer retention is **not** a blocker (no real contracts).
