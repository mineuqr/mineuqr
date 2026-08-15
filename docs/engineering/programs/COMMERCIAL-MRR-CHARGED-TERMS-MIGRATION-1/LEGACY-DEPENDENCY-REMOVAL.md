# LEGACY-DEPENDENCY-REMOVAL

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1

## Canonical MRR → `subscription_plans`

| Question | Answer |
|----------|--------|
| Does `CanonicalMetricsService` still read `subscription_plans`? | **NO** |
| Hidden fallback Charged Terms → `subscription_plans.price`? | **NO** |
| Hidden fallback Charged Terms → Live Plan list price? | **NO** |

## What was removed from the MRR path

- `getSubscriptionPlans`
- `getSubscriptionPlanById` inside `computeMrrFromStates`
- `monthlyEquivalentPlanPrice` (legacy catalog helper)

`monthlyEquivalentPlanPrice` / `computeAdminMrr` remain in `server/adminKpiCalculations.ts` for **deprecated** `getAdminStatistics` only.

## Remaining `subscription_plans` dependencies (SAFE DELETE still blocked)

| Area | Examples |
|------|----------|
| Legacy identity / DTO | `user_subscriptions.planId`, `OwnerCommercialState.planId`, `LEGACY_PLAN_BRIDGE` |
| Unbound display name | `CommercialReadService` may still call `getSubscriptionPlanById` for name when unbound |
| Checkout identity | Numeric `planId` is a compatibility handle; price already from Live Plan |
| Webhooks | `paypal-webhook.ts`, `tap-webhook.ts` — `getSubscriptionPlanById` |
| Trial fallback | `create-trial-subscription.ts` comments / legacy resolve |
| Admin invoice / notifications | `routers.ts` plan name / amount reads |
| Deprecated statistics | `getAdminStatistics`, `getRevenueByMonth`, `computeAdminMrr` |
| Limits helper | `subscriptionPlanLimits.ts` (legacy table fields) |
| ORM / seed / reset / scripts | Drizzle schema, seeds, reset scripts |
| Tests | Many suites still mock `getSubscriptionPlanById` / `getSubscriptionPlans` |

## Reassessment

- **MRR dependency removed:** YES
- **Safe delete `subscription_plans`:** **NO**
- Residual dependencies have **not** independently disappeared.

SAFE DELETE remains a future gated program.
