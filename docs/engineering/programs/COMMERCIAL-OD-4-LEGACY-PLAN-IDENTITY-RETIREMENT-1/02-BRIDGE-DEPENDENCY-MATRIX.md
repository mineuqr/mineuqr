# 02 — BRIDGE DEPENDENCY MATRIX

## LEGACY_PLAN_BRIDGE

| Caller | Class | Keep? |
|--------|-------|-------|
| `resolveCanonicalLivePlanId` leftover branch | Webhook dual-read | YES |
| `resolvePlanIdFromLegacyPlanId` | Webhook / leftover view | YES |
| `parseWebhookPlanRef` → leftover integer | Webhook | YES |
| `resolveLivePlanDisplayByLegacyId` | Leftover display | YES |
| `0088` safety tests | Historical | YES |
| Trial policy | Removed this program | NO |
| Checkout offer DTO | Removed this program | NO |
| `ensureLivePlanBoundForSubscription` | Now UUID | NO |

**Cannot delete the bridge** while webhook leftover read remains.

## PLAN_ID_TO_CATALOG_PLAN

| Caller | Class | Keep? |
|--------|-------|-------|
| `buildCommercialContext` | Removed this program | NO |
| `buildCommercialContextFromDb` | Removed this program | NO |
| `isCanonicalCurrentPlan(catalogPlanId: number)` | Client helper unused by Pricing | YES until helper deleted |
| `planIdMapping.test.ts` | Test | YES |

Not deleted. No longer used for CommercialContext / FromDb.

## Unbound CommercialContext

Target: UUID → `commercial_plans` → capabilities.

Implemented in `resolveOwnerEntitlements` unbound path via `resolveLivePlanCapabilitiesByPlanId`.
Integer stored identity fails closed.
