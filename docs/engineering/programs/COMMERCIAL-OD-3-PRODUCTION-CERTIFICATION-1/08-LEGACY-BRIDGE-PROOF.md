# 08 — LEGACY BRIDGE PROOF

Bridges **remain**. They are not canonical identity authorities. They were not removed.

## LEGACY_PLAN_BRIDGE

| Runtime use | Classification |
|-------------|----------------|
| `resolveCanonicalLivePlanId` integer branch | ACTIVE COMPATIBILITY — webhook leftover read |
| `resolvePlanIdFromLegacyPlanId` | ACTIVE COMPATIBILITY |
| `resolveCheckoutOfferFromLivePlan` DTO `legacyPlanId` | ACTIVE COMPATIBILITY — not price authority |
| `resolveLegacyPlanIdFromPlan` bind reverse-map | ACTIVE COMPATIBILITY |
| `publicCatalogReadModel.legacyPlanId` | ACTIVE COMPATIBILITY — DTO only |
| `persistentCatalogBootstrap` seeds by **codes** | HISTORICAL / bootstrap alignment |
| `isKnownLegacyPlanId` (PayPal no longer gates on it) | DEAD for new checkout write |
| 0088 / residual tests | HISTORICAL |

**OD-4 TARGET:** leftover integer read, bind reverse-map, public DTO field.

## PLAN_ID_TO_CATALOG_PLAN

| Runtime use | Classification |
|-------------|----------------|
| `buildCommercialContext` digit-string / leftover integer row | ACTIVE COMPATIBILITY — unbound fallback |
| `buildCommercialContextFromDb` unbound path | ACTIVE COMPATIBILITY |
| `planIdMapping.test.ts` | HISTORICAL contract |

**OD-4 TARGET:** unbound integer / digit-string CommercialContext branch.

## Canonical authority after OD-3

Normal public/admin/checkout/trial/new-webhook identity:

```
planId UUID → commercial_plans.id
```

Bridges are compatibility only. They must not be treated as commercial law.

## Decision

**BRIDGE GATE: PASS** (remain; classified; not canonical)
