# 03 — RUNTIME DEPENDENCY GRAPH

Proven from current code and Production SELECT. Not assumed.

## 1. Canonical graph (proven)

```
                    commercial_plans.id
                          UUID
                           │
             ┌─────────────┼─────────────────────────┐
             ▼             ▼                         ▼
      user_subscriptions  commercial_subscription  Public Catalog
           .planId         _bindings.planId         offering.planId
           varchar(36)     varchar(36)              UUID
             │             │
             │             ├─ chargedAmount / currency / cycle
             │             │         │
             │             │         ▼
             │             │    Charged Terms
             │             │         │
             │             │         ▼
             │             │        MRR
             │             │
             ▼             ▼
        Subscription   Live Plan capabilities / limits
             │             │
             ▼             ▼
        lifecycle     getCommercialEntitlements
                             │
                             ▼
                      requireFeature
```

Evidence:

- Schema: `drizzle/schema.ts` `userSubscriptions.planId` = `varchar({ length: 36 }).notNull()`
- Bindings: `server/db/schema/commercial/bindings.ts` `planId` varchar(36)
- Public catalog: `publicCatalogReadModel.ts` `planId: plan.id` (UUID) plus optional `legacyPlanId`
- Writers: trial, register, admin, PayPal, Tap all persist `resolveCanonicalLivePlanId(...)` UUID
- MRR: `chargedTermsMrr.ts` / `CanonicalMetricsService.computeMrrFromChargedTerms`
- Entitlements: `getCommercialEntitlements` → `resolveOwnerEntitlements` → bound Live Plan

## 2. Compatibility graph (proven, still live)

```
integer planId (public / admin / checkout / webhook / trial fallback)
      │
      ▼
resolveCanonicalLivePlanId
      │  uses LEGACY_PLAN_BRIDGE
      │  then planService.getByCode → commercial_plans.id
      ▼
commercial_plans.id UUID
      │
      ├─ persist user_subscriptions.planId
      └─ bind commercial_subscription_bindings.planId
              + write bindings.legacyPlanId = original integer
```

Checkout price path (integer is **not** price authority):

```
z.number() planId
  → resolveCheckoutOfferFromLivePlan
      → resolvePlanIdFromLegacyPlanId (bridge)
      → pricingService.currentPriceForPlan(live UUID, cycle)
      → PayPal/Tap amount from Live Plan Offer List Price
```

## 3. Leftover graph (exists, not commercial authority)

```
subscription_plans
  ├── drizzle/schema.ts (ORM)
  ├── server/db.ts helpers (UNREACHABLE at production runtime)
  ├── server/seed-plans.mjs (ops write)
  ├── reset / audit scripts (ops)
  ├── historical migrations 0000–0006
  └── Production rows 30001, 30002, 30003
         └── NO FK from user_subscriptions
         └── NO runtime commercial SELECT
```

```
legacyPlanId
  ├── bindings column (written on bind)
  ├── public catalog DTO
  ├── listPlans integer id
  └── bind API input

LEGACY_PLAN_BRIDGE
  └── required resolver / bootstrap / listPlans / trial fallback

PLAN_ID_TO_CATALOG_PLAN
  └── CommercialContext builder + unbound entitlement fallback
```

## 4. Entitlement branch (proven)

```
getCommercialEntitlements(ownerId)
  → resolveOwnerEntitlements
      IF Platform Owner → owner access mode (legacyPlanId null)
      ELSE IF binding exists → loadBoundLivePlan
           → resolveEntitlementsFromLivePlan
           → capabilities/limits from Live Plan
           → catalogPlanFromCode(code, legacyPlanId fallback)
      ELSE unbound
           → buildCommercialContextFromDb
                UUID → planService.get → bridgeByCatalogPlanCode
                digit-string → PLAN_ID_TO_CATALOG_PLAN
           → getCommercialEntitlementsFromContext
```

No branch reads `subscription_plans`.

`resolveTableOrderingEntitlement` / `BASIC_FREE_PLAN_ID` is **not** on this graph (test-only).

## 5. What is not on the financial graph

```
subscription_plans.priceMonthly / priceYearly
monthlyEquivalentPlanPrice          ← deleted from runtime
```

Invoice historical amount → Charged Terms.  
MRR → Charged Terms.  
Checkout display/charge → Live Plan Offer List Price.

## 6. No third catalog

Grep of `drizzle/schema.ts`: no `subscription_plans_v2`, no `commercial_plans_legacy`. One commercial catalog: `commercial_plans`. One canonical identity: UUID.

## 7. Expected vs proven

The expected model in the program brief is **true**, with these proven additions:

- Compatibility integer still **enters** at public/admin/checkout/webhook edges.
- `bindings.legacyPlanId` is still **written**.
- Unbound entitlements still use bridge maps, not the leftover table.
- Leftover table still **exists** in Production with 3 catalog rows and is unused by runtime.
