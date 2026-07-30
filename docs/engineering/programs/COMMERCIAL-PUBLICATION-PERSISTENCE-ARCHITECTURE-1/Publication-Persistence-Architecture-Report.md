# Publication Persistence Architecture Report

**Program:** COMMERCIAL-PUBLICATION-PERSISTENCE-ARCHITECTURE-1

## Canonical pipeline

```
Discovery → Projection → Presentation (display)
                ↓
        CatalogPublishingService.publish
                ↓
        Memory provisional update
                ↓
        DurablePublicationBackend.persistPublishedVersion  (atomic)
                ↓
        commercial_* / durable authority
                ↓
        invalidateCatalogReadyGate + invalidatePublicCatalogCache
                ↓
        ensureCatalogReady() hydrates from durable authority
                ↓
        Public Pricing / Admin / APIs
```

## Authority

| Concern | Authority |
|---------|-----------|
| Publication success | Durable backend persist completion |
| Runtime catalog cache | `commercialCatalogStore` (non-authoritative) |
| Hydration source | `getDurablePublicationBackend().hydrateInto` |

## Key modules

| Module | Role |
|--------|------|
| `publicationPersistence.ts` | Durable backend + version subgraph persist |
| `catalogPublishingService.publish` | Provisional memory → durable → success/rollback |
| `seedAdoptionCatalog` | Hydrates via durable backend; seed writes durable |
| Admin `health` / `listPlans` / `listVersions` | Call `ensureCatalogReady()` |
