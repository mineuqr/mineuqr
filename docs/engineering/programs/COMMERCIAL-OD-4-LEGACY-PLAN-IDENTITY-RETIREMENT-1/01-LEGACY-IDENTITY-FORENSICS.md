# 01 — LEGACY IDENTITY FORENSICS

Git baseline: `17d990dd` on `main` = `origin/main`.

## Artifacts in scope

| Artifact | Classification | OD-4 action |
|----------|----------------|-------------|
| `LEGACY_PLAN_BRIDGE` | B — webhook leftover read still required | **RETAIN** |
| `PLAN_ID_TO_CATALOG_PLAN` | B/D — CommercialContext no longer uses it; `isCanonicalCurrentPlan(number)` still imports it | **NOT REMOVED** (client helper + tests) |
| `bindings.legacyPlanId` column | B — schema; writers stopped passing integers | **COLUMN RETAINED** |
| `resolveCanonicalLivePlanId` integer branch | B — webhook only | **RETAIN** |
| `parseWebhookPlanRef` integer | B — webhook | **RETAIN** |
| `PublicCatalogOffering.legacyPlanId` | B — live Production API still returns it | **RETAIN** until consumer search + deploy |
| Trial `30002` fallback | E — already removed in OD-3 | **GONE** |
| `resolveLivePlanById` | A — new canonical UUID resolver | **ADDED** |
| `subscription_plans` | C/SAFE DELETE | **UNTOUCHED** |
| 0088 / `KNOWN_INTEGER_TO_CODE` | C — historical migration safety | **RETAIN** |
| Commercial test fixtures `30001/30002/30003` | D | **PARTIALLY CLEANED** |

## Integer writers (runtime)

After this program’s code edits, new bind writes pass `planId` UUID and `legacyPlanId: null` (column may still exist).

Public/admin checkout already UUID-only (`livePlanUuidInput`).

## Integer readers (runtime)

| Reader | Class | Status |
|--------|-------|--------|
| PayPal/Tap `parseWebhookPlanRef` | B | **RETAINED** — in-flight unproven |
| `resolveCanonicalLivePlanId` leftover branch | B | **RETAINED** |
| `resolveLivePlanDisplayByLegacyId` | B | **RETAINED** (display of leftover webhook refs) |
| `resolveSubscriptionPlanView` leftover branch | B | **RETAINED** |
| `PLAN_ID_TO_CATALOG_PLAN` / `isCanonicalCurrentPlan(number)` | D/B | **RETAINED** — Pricing uses ByCode |
| CommercialContext integer map | F | **REMOVED** from builder |

## Production note

OD-3 certified 7/7 UUID subscriptions. Unbound path previously discarded UUID resolution inside `buildCommercialContext`. This program routes unbound UUID → Live Plan capabilities.
