# Publication Consistency Report

| Consumer | Path | Same durable authority? |
|----------|------|-------------------------|
| Admin health / status | `ensureCatalogReady` → store | Yes |
| Admin listPlans / listVersions | `ensureCatalogReady` → store | Yes |
| Public Pricing | `listOfferings` → `ensureCatalogReady` → project | Yes |
| listPublishedOfferings (adoption) | `ensureCatalogReady` | Yes |
| Public cache | Rebuilt after durable success only | Yes (non-SSOT) |

Memory-only `PublicationService.publish` is no longer the admin success path; `CatalogPublishingService.publish` requires durable persist.
