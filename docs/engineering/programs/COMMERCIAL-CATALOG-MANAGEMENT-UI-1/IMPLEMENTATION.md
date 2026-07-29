# IMPLEMENTATION

**Program:** COMMERCIAL-CATALOG-MANAGEMENT-UI-1

## Host

`/admin/platform/commercial-catalog` → `PlatformOpsCommercialCatalogComposition`

## Module files

| Path | Role |
|------|------|
| `client/.../PlatformOpsCommercialCatalogComposition.tsx` | Tabbed management shell |
| `commercial-catalog/CatalogManagementPanels.tsx` | Entity CRUD panels |
| `commercial-catalog/CatalogEntityPanel.tsx` | Toolbar + table chrome |
| `commercial-catalog/CatalogFormDialog.tsx` | Dialog/forms |
| `commercial-catalog/useCatalogManagementData.ts` | Shared queries + invalidation |
| `commercial-catalog/catalogManagementObservability.ts` | UI CRUD/publication metrics |
| `server/.../commercialCatalogRouter.ts` | + `updateMigrationPolicy` |

## CRUD inventory

| Entity | List | Create | Edit / Archive | Lifecycle |
|--------|------|--------|----------------|-----------|
| Plans | ✓ | ✓ | Edit + Archive (`isHidden`) | — |
| Plan Versions | ✓ | ✓ + Clone | Draft touch | Publish / Deprecate / Retire |
| Pricing | ✓ | ✓ | Immutable rows (new price for change) | — |
| Billing Cycles | ✓ | ✓ | Create-only (foundation service) | — |
| Feature Bundles | ✓ | ✓ visual key editor | Create-only | — |
| Limit Profiles | ✓ | ✓ numeric/unlimited | Create-only | — |
| Trial Policies | ✓ | ✓ | Create-only | — |
| Regional Policies | ✓ | ✓ | ✓ update | — |
| Promotions | ✓ | ✓ | Create-only | — |
| Migration Policies | ✓ | ✓ | ✓ update | — |
| Retirement Policies | ✓ | ✓ | Create-only | — |
| Publication | ✓ lanes | — | — | Publish / Deprecate / Retire |
| Validation | ✓ CC-16 | — | — | — |
| Health | ✓ metrics | — | — | — |

Hard delete of draft plans is intentionally **not** exposed — Catalog preserves identity history; Archive replaces delete.
