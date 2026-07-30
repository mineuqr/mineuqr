# Persistent Catalog Bootstrap Report

## Canonical sources

| Layer | Use in bootstrap |
|-------|------------------|
| Commercial Projection | Feature vocabulary via `listProjectionIdsForCommercialPlan` |
| Presentation Overlay | `applyCommercialPresentationRules` (foundation/deps) |
| LEGACY_PLAN_BRIDGE | Existing plan identity continuity (not invented) |
| LEGACY_PLAN_COMMERCIAL_PRICE_TERMS | Existing CC-16 price facts for bridge codes |
| PLAN_LIMITS | Existing limit matrix |
| CatalogPublishingService.publish | Durable publication (no forked publish logic) |

## Entry points

| Path | Role |
|------|------|
| `bootstrapPersistentCommercialCatalog()` | Idempotent bootstrap |
| `ensureCommercialCatalogAdoptionSeed()` | Delegates to bootstrap |
| `ensureCatalogReady()` | Runtime gate |
| `scripts/bootstrap-persistent-commercial-catalog.mts` | Controlled CLI |

## Removed

Hardcoded `DEFAULT_FEATURES` / `DEFAULT_PRICES` / `DEFAULT_LIMITS` tables inside seedAdoptionCatalog.
