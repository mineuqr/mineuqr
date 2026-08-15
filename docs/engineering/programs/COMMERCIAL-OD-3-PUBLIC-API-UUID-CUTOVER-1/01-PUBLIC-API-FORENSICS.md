# 01 — PUBLIC API FORENSICS

Repository search before/after implementation. Classification after OD-3.

## Public / admin contracts (migrated)

| Location | Before | After |
|----------|--------|-------|
| `subscription.createCheckoutSession` | `planId: z.number()` | `livePlanUuidInput` |
| `subscription.createTapCheckout` | `planId: z.number()` | `livePlanUuidInput` |
| `admin.createUserSubscriptionByAdmin` | `planId: z.number()` | `livePlanUuidInput` |
| `admin.updateUserSubscriptionByAdmin` | `planId: z.number().optional()` | `livePlanUuidInput.optional()` |
| Retired restaurant-scoped admin inputs | `z.number()` | UUID schema (still retired) |
| `listPlans[].id` | leftover integer | Live Plan UUID |
| `Pricing.tsx` checkout | `offering.legacyPlanId` | `offering.planId` UUID |
| Customer Success | `parseInt(subPlanId)` | UUID string |
| PayPal `CreateOrderParams.planId` | `number` | `string` UUID |
| PayPal `custom_id.planId` write | integer | UUID |
| Tap `metadata.plan_id` write | integer string | UUID string |
| Trial fallback | `resolveCanonicalLivePlanId(30002)` | fail closed `trial_plan_unresolved` |
| Admin stats `subscriptionsByPlan.planId` | reverse-mapped integer | stored UUID |

## Remaining leftover integer (classified, not removed)

| Location | Why it remains |
|----------|----------------|
| Webhook **read** of integer metadata | In-flight PayPal/Tap payloads |
| `LEGACY_PLAN_BRIDGE` / `PLAN_ID_TO_CATALOG_PLAN` | OD-4 |
| `bindings.legacyPlanId` writes via reverse map | Existing bind compatibility; not a new writer type |
| `ensureLivePlanBoundForSubscription({ legacyPlanId })` | Internal bind API |
| `PublicCatalogOffering.legacyPlanId` | Compatibility field; no remaining client checkout/CS consumer |
| `isCanonicalCurrentPlan(catalogPlanId: number)` | Unused by Pricing (uses ByCode); leftover helper |
| `BASIC_FREE_PLAN_ID` / `resolveTableOrderingEntitlement` | Dead / test-only |
| 0088 / seed / reset / historical tests | Historical / OD-4 / SAFE DELETE |
| `commercialAuthority.planId: string \| number \| null` | Type allows leftover digit-string rows; Production storage is UUID |

## Not used as fallback

`getSubscriptionPlans` / `getSubscriptionPlanById` / `subscription_plans` — still unused by commercial runtime.
