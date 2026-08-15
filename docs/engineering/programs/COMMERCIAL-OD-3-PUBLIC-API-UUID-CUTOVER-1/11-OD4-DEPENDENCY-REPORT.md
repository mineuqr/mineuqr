# 11 — OD-4 DEPENDENCY REPORT

Bridges **remain**. OD-3 reduced public usage; it did not retire them.

## LEGACY_PLAN_BRIDGE — remaining callers

| Caller | Role after OD-3 |
|--------|-----------------|
| `resolveCanonicalLivePlanId` integer branch | Webhook leftover read |
| `resolvePlanIdFromLegacyPlanId` | Same |
| `resolveCheckoutOfferFromLivePlan` | Reverse-map `legacyPlanId` on offer DTO only |
| `isKnownLegacyPlanId` | Still exported; PayPal no longer gates on it |
| `persistentCatalogBootstrap` | Seeds by bridge **codes** |
| `entitlementResolver.catalogPlanFromCode` | Fallback leftover integer |
| `resolveLegacyPlanIdFromPlan` | Bind reverse-map |
| `publicCatalogReadModel.legacyPlanId` | Compatibility DTO field |
| 0088 safety tests | Historical mapping alignment |

## PLAN_ID_TO_CATALOG_PLAN — remaining callers

| Caller | Role after OD-3 |
|--------|-----------------|
| `buildCommercialContext` | Digit-string / leftover integer row |
| `buildCommercialContextFromDb` | Unbound fallback |
| `planIdMapping.test.ts` | Contract |

## Writers of `bindings.legacyPlanId`

Trial, register, admin, PayPal/Tap — all reverse-map from UUID. No new writer type.

## OD-4 blockers

- Webhook leftover integer **read**
- Bind reverse-map writes
- Unbound CommercialContext integer/digit-string branch
- Catalog bootstrap alignment
- Public DTO `legacyPlanId`
- AA approval

**OD-4: BLOCKED** until leftover reads/writes above are retired and Production UUID behavior is certified after deploy.
