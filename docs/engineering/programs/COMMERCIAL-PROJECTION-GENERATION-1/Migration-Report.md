# Migration Report

**Program:** COMMERCIAL-PROJECTION-GENERATION-1

## Identifier migration

| Legacy Identifier | Projection Identifier | Strategy |
|-------------------|----------------------|----------|
| `ordering` | `ordering` | Direct |
| `reports` / `excelExport` | `reporting` | Merged alias |
| `callWaiter` | `waiter` | Alias |
| `requestBill` | `checkManagement` | Alias |
| `cart` / `checkout` / `orderTracking` | `ordering` | Alias into parent |
| `qrMenu` … `customFonts` (deprecated facets) | — | Compat-only / dropped from Catalog |
| *(none)* | `kitchen`, `printing`, `register`, … | New Projection IDs |

## Bound subscriptions

- Existing Snapshot feature strings remain readable.  
- Resolver expands aliases → Projection entitlements.  
- No re-bind required for continuity of `ordering` / reporting aliases.  
- Deprecated facet keys remain evaluable as Runtime compat flags.

## Seed / fresh catalogs

`seedAdoptionCatalog` DEFAULT_FEATURES now uses Projection IDs only.

## Removal

Legacy FEATURE_KEYS as **Commercial SSOT** removed.  
Legacy strings remain only in Compat module until AA retirement program.
