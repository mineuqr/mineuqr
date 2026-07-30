# Publication Consistency Report

| Consumer | Path | Same durable catalog? |
|----------|------|------------------------|
| Admin health / lists | `ensureCatalogReady` → hydrate | Yes |
| Public Pricing | `listOfferings` → ensure → project | Yes |
| Adoption APIs | `listPublishedPlanOfferings` | Yes |
| Bootstrap CLI | hydrate + publish + rehydrate | Yes |

Architecture tests prove admin health published count equals public offering IDs after restart simulation.
