# FINAL-IDENTITY-SCAN

Post-implementation scan of COMMERCIAL-LIVE-PLAN-IDENTITY-CONSOLIDATION-1.  
Cutover was **not** executed. Remaining references are expected.

Classification:

- **A** Canonical internal plan ID
- **B** Legacy compatibility ID
- **C** External provider plan ID
- **D** Customer subscription ID
- **E** Financial document ID
- **F** Payment transaction ID
- **G** Historical data ID
- **H** Test / fixture ID
- **I** Obsolete ID
- **J** Unknown / architecture decision required

## Summary table

| Reference | Classification | Runtime? | Owner | Why Remaining | Removable? |
|-----------|----------------|----------|-------|---------------|------------|
| `commercial_plans.id` | A | Yes | Catalog | Canonical PK | No |
| `commercial_plans.code` | A | Yes | Catalog | Stable unique key | No |
| `commercial_prices.planId` | A | Yes | Catalog | FK-like UUID to Live Plan | No |
| `user_subscriptions.planId` | B | Yes | Subscription | Int column, no FK | After ALTER + OD-1/2 |
| `user_subscriptions.id` | D | Yes | Subscription | Customer instance | No |
| `bindings.planId` | A | Yes | Binding | Live Plan UUID | No |
| `bindings.legacyPlanId` | B | Yes | Binding | Compat copy | After cutover |
| `LEGACY_PLAN_BRIDGE` | B | Yes | Adoption | Integer ↔ code | After cutover |
| `PLAN_ID_TO_CATALOG_PLAN` | B | Yes (client/shared) | Mapping | Duplicate integers | After cutover (OD-4) |
| Checkout/admin `planId: number` | B | Yes | API | Consumers (`routers.ts`) | After API cutover (OD-3) |
| Offering `legacyPlanId` | B | Yes | Public catalog | Pricing checkout handle | After API cutover |
| Offering `planId` string | A | Yes | Public catalog | UUID | No |
| `OwnerCommercialState.planId` | B | Yes | Hub / CRS | Integer from row | With column |
| `OwnerCommercialState.planCode` | A | Yes | Hub | Catalog key | No |
| Trial 30002 fallback | B | Yes | Trial | Writes int column | After ALTER |
| PayPal `custom_id.planId` | B | Yes | Payment (our metadata) | Echo of checkout integer | After checkout |
| Tap `metadata.plan_id` | B | Yes | Payment (our metadata) | Echo of checkout integer | After checkout |
| PayPal / Tap charge / order ids | F | Yes | Provider | External | No |
| Invoice / check / order ids | E / F | Yes | Finance | External to plan | No |
| `subscription_plans` schema | B / I | Schema only | ORM | Leftover table | Separate SAFE DELETE |
| `getSubscriptionPlans` / `getSubscriptionPlanById` / `createSubscriptionPlan` | B / I | Helper only | `server/db.ts` | Unused by routers | Separate SAFE DELETE |
| Test fixtures 30001/30002/30003 | H | Tests | Tests | Compat | After cutover |
| Test leftovers `planId: 1` / `102` | H | Tests | Tests | Unmapped vs bridge | Fail-closed if migrated |
| Docs / ADRs mentioning integers | G | No | Docs | History | Keep |
| `subscription_plan_id` / `legacy_plan_id` snake_case | — | No | — | **Zero matches** | N/A |

No unexplained identity. No Class **C** (external provider *plan* product id) is in use — providers receive MineuQR’s integer, not a PayPal/Tap catalog plan id. No Class **J** leftover after OD-1…OD-5 are recorded as open decisions rather than unknown runtime ids.

## Runtime / schema occurrences (non-doc)

| Location | Reference | Class |
|----------|-----------|-------|
| `server/db/schema/commercial/tables.ts` | `commercial_plans.id` UUID PK + unique `code` | A |
| `server/db/schema/commercial/tables.ts` | `commercial_prices.planId` UUID | A |
| `server/db/schema/commercial/bindings.ts` | `planId` UUID + `legacyPlanId` int | A + B |
| `drizzle/schema.ts` `user_subscriptions.planId` | int NOT NULL | B |
| `drizzle/schema.ts` `subscription_plans` | leftover table | B / I |
| `server/services/commercial-catalog/legacyPlanBridge.ts` | `LEGACY_PLAN_BRIDGE` 30001–30003 | B |
| `src/lib/commercial/planIdMapping.ts` | `PLAN_ID_TO_CATALOG_PLAN` | B |
| `server/services/commercial-catalog/adoptionService.ts` | resolve/display/checkout via legacy handle → Live Plan | B → A |
| `server/services/commercial-catalog/persistentCatalogBootstrap.ts` | seed loop over bridge | B |
| `server/create-trial-subscription.ts` | fallback 30002 | B |
| `server/routers.ts` | `planId: z.number()` (checkout/admin) | B |
| `client/src/pages/Pricing.tsx` | `planId={legacyPlanId}` | B |
| `server/paypal-webhook.ts` / `server/tap-webhook.ts` | echoed integer + Live Plan bind | B |
| `server/subscription-runtime/entitlementResolver.ts` | Live Plan entitlements; unbound uses bridge | A (bound) / B (unbound) |
| `server/db.ts` | unused `getSubscriptionPlan*` helpers | B / I |
| `shared/commercial-projection/legacyRetirement.ts` | documents bridge as artifact | G |

## 30002

Normative Professional integer. Not a provider id. Not a customer contract id.  
Used as trial fallback, bridge entry, mapping entry, and fixtures.

## Proof commercial authority is not the leftover table

Routers do **not** call `getSubscriptionPlanById` / `getSubscriptionPlans`.  
Checkout uses `currentPriceForPlan`. MRR uses Charged Terms. Entitlements use Live Plan / Commercial Hub.
