# Persistent Catalog Report

## Published artifact graph (per version)

Persisted on publish:

- Plan identity (`commercial_plans`)
- Plan version + `state` / `publishedAt` (`commercial_plan_versions`)
- Prices (`commercial_prices`)
- Billing cycles referenced
- Feature bundle + feature keys (capability mappings)
- Limit profile + values
- Trial / migration / retirement policies (when referenced)
- Regions referenced by prices

Presentation overlay remains a display layer (not a separate DB publication table). Feature keys in the bundle are the persisted capability mapping.

## Backends

| Backend | Use |
|---------|-----|
| `DbDurableCatalogBackend` | Production |
| `InMemoryDurableCatalogBackend` | Vitest / architecture tests (auto when `VITEST`) |
