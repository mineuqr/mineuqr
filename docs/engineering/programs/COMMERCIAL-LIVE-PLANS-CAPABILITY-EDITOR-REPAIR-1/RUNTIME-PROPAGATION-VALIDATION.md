# RUNTIME-PROPAGATION-VALIDATION.md

Fixture: Professional subscribers A and B resolve from the **same current Live Plan keys**. No snapshot, version, publication, or rebind.

## Add

`saveLive` adds `expo` (plus presentation rules) to Professional.

Expected and observed in `commercialLivePlans.capabilityEditor.repair.test.ts`:

- A receives `expo`
- B receives `expo`
- Public catalog Professional `featureKeys` includes `expo`
- Basic and Enterprise compositions stay independent (add-on Professional does not rewrite their stored keys)

## Remove

`saveLive` removes `expo`.

- A no longer receives `expo`
- B no longer receives `expo`

## Cache

After `saveLive`:

- `invalidateCatalogReadyGate`
- `invalidatePublicCatalogCache` — next `projectPublicCatalogOfferings()` sees the new keys
- `invalidateEntitlementCache()` — seeded stale cache entry is gone

## Bound vs unbound

There are still **no real customer bindings**. Unbound owners continue to use `planFeatureMatrix` until bound. The Plan Editor still owns Live Plan authority for the next bound read.

## Manual browser walkthrough

The 17-step in-app scenario was **not** run against production (this program forbids production writes and does not deploy). Automated save / reload-equivalent / independence / Public Pricing tests cover the same authority path.
