# LEGACY-QUOTA-ISOLATION.md

## Isolated (not Live Plan runtime quota)

| Source | Remaining legitimate use | Not used for |
|--------|--------------------------|--------------|
| `PLAN_LIMITS` / `getLimitsForPlan` | Legacy Bridge unbound path; bootstrap seed; matrix unit tests | Bound Live Plan customer restaurant create |
| `subscription_plans.maxRestaurants` | Legacy checkout / subscription DTO compatibility | Live Plan customer runtime quota |
| Hardcoded Basic fallback (`no subscription → 1`) | **Removed** from `resolvePlanLimitsForUser` | — |
| `role === admin` skip | **Removed** | — |

## Live Plan runtime

Bound customers:

`loadBoundLivePlan` → `resolveLivePlanCapabilities` → `commercialCatalogStore.limitValues` for the plan’s `limitProfileId`.

`assertRestaurantCreateAllowed` → `checkLimit` → `resolveOwnerEntitlements`.

## Intentionally not deleted

- `subscription_plans.maxRestaurants` column and checkout 19 / 39 / 99 USD
- `PLAN_LIMITS` constant (Legacy Bridge + bootstrap seed)

Do not treat either as the Live Plan quota authority.

## Residual (out of scope)

`adoptionService` still projects catalog limits into the legacy plan DTO with `restaurants ?? 1`. That can collapse Unlimited `null` to `1` on the **legacy listing** shape. It is not the `checkLimit` path. Do not “fix” it here — that would touch checkout/listing compatibility.

`SubscriptionManagement.tsx` may still display `plan.maxRestaurants` from the legacy DTO. Presentation only.
