# Catalog Adoption Report

**Program:** COMMERCIAL-PROJECTION-GENERATION-1

## Changes

| Surface | Adoption |
|---------|----------|
| `assertCommercialCapabilityFilterKeys` | Projection IDs + alias normalize; rejects deprecated-only |
| `FeatureBundleService.create` | Stores **normalized Projection IDs** |
| `publicCatalogReadModel` | `normalizeFeatureKeysForProjection` on offerings |
| `seedAdoptionCatalog` | Projection feature lists |
| Admin UI `CATALOG_FEATURE_KEYS` | Re-exports Projection FILTER_KEYS |
| Capability experience picker | Groups by Projection category |

## Does not redesign

Catalog aggregates, publishing workflow, snapshot capture schema, pricing model unchanged.

## Validation

Operational validation suite updated for 15 Projection keys; public offerings emit Projection IDs.
