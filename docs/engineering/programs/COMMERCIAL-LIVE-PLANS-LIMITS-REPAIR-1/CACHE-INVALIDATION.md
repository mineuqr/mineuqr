# CACHE-INVALIDATION.md

After a successful `saveLive` (including limit-only saves):

| Cache | Invalidation |
|-------|----------------|
| Catalog ready gate | `invalidateCatalogReadyGate()` |
| Public pricing catalog | `invalidatePublicCatalogCache()` |
| Entitlement / quota resolution | `invalidateEntitlementCache()` (all owners) |

The next `resolveOwnerEntitlements` / `checkLimit` load reads the new `commercial_limit_values`.

## Example

Professional `restaurants = 5` → administrator saves `10`:

1. Atomic persist
2. Entitlement cache cleared
3. Professional subscribers resolve `restaurants = 10`
4. Sixth restaurant allowed; eleventh denied

No process restart is required.

## Test

`commercialLivePlans.limits.repair.test.ts` — “invalidates entitlement cache after limit save”: a stale cached Professional `5` is gone after `saveLive` writes `10`.
