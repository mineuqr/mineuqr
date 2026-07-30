# Restart Validation Report

Simulated in architecture tests (clear runtime store → `ensureCatalogReady` / `hydrateInto`):

| Scenario | Result |
|----------|--------|
| Durable publish → clear memory → ensureCatalogReady | Published offerings restored |
| Memory-only publish → clear → hydrate durable | Empty catalog |
| Cache invalidate → rehydrate | Offerings from durable authority |

Production restart: process boot → first `ensureCatalogReady` → `DbDurableCatalogBackend.hydrateInto` → `hydrateCommercialCatalogFromDb`.
