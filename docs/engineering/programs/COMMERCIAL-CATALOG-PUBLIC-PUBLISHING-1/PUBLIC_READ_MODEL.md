# PUBLIC_READ_MODEL.md — COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1

## Purpose

Browse-optimized, Catalog-owned, **read-only** projection of publicly discoverable commercial offerings.

## Ownership

| Concern | Owner |
|---------|-------|
| Projection build | `publicCatalogReadModel` |
| Lifecycle / publish | `CatalogPublishingService` |
| Entitlement | Subscription Runtime (never this model) |
| Bound commercial facts | Commercial Snapshots (immutable) |

## Projection functions

| Function | Use |
|----------|-----|
| `listPublicCatalogOfferings` / `projectPublicCatalogOfferings` | Browse list (published only) |
| `getPublicCatalogOffering` / `projectPublicCatalogOffering` | Detail by version id with visibility gates |
| `getPublicVersionVisibility` | Version metadata for public consumers |

`project*` variants skip seed ensure — used by tests and pure projection after Catalog is loaded.

## Determinism

Given the same Catalog store + overlays:

1. Browse list contains only `workflowState === "published"` and non-hidden plans.
2. Sort order is stable by `planCode`.
3. Deprecated versions are addressable by id but absent from browse.
4. Retired / archived / pre-publish states are inaccessible via public get.

## Cache

`publicCatalogCache` may memoize the browse list when `PUBLIC_CATALOG_CACHE=1`.

- TTL: `PUBLIC_CATALOG_CACHE_TTL_MS` (default 30s)
- Invalidate on every publishing lifecycle write
- **Not SSOT** — miss always rebuilds from Catalog

## Non-ownership

The read model does **not**:

- Decide entitlements
- Bind or mutate Subscription Snapshots
- Expose Draft / Internal Review / Approved / Scheduled internals
- Replace `listPublishedPlanOfferings` adoption bridge (admin/compat remains separate)
