# CACHE-AUTHORITY-AUDIT.md

## Caches

| Cache | Default | SSOT? | Invalidation |
|-------|---------|-------|----------------|
| In-process `commercialCatalogStore` | always | Runtime cache of DB | Re-hydrate after persist; `invalidateCatalogReadyGate` forces next `ensureCatalogReady` |
| Public catalog cache | **OFF** unless `PUBLIC_CATALOG_CACHE=1` | Never | `invalidatePublicCatalogCache()` on `saveLive`, `createPrice`, bootstrap |
| Entitlement decision cache | **OFF** unless `useCache: true` | Never | `invalidateEntitlementCache()` on `saveLive` (full clear) and lifecycle notify |

Public cache TTL (if enabled): `PUBLIC_CATALOG_CACHE_TTL_MS` default 30s, plus explicit invalidate on save.

Entitlement cache TTL: 5s, and `resolveOwnerEntitlements` does **not** enable it unless callers opt in.

## Plan edit path

```
saveLive
  → validate
  → persistLivePlan (DB commit)
  → invalidateCatalogReadyGate
  → invalidatePublicCatalogCache
  → invalidateEntitlementCache (all)
```

Next public/admin read calls `ensureCatalogReady` → hydrate from DB.

There is **no** version cache and **no** snapshot cache.

## Ambiguity

**None.** Default caches are off; when on, saveLive always clears them. Gate: **PASS**.
