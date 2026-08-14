# STARTUP-HYDRATION-AUDIT.md

## Server listen (`server/_core/index.ts`)

After `server.listen`:

```
ensureCatalogReady()
  → bootstrapPersistentCommercialCatalog()
    → backend.hydrateInto (SELECT live tables)
    → if store not empty: already_initialized, return
    → else seed three live plans and persistFullCatalog
```

Production already has 3 plans → **hydrate only, no persist, no bootstrap seed**.

Does **not**:

- hydrate dropped version/snapshot tables
- publish versions
- recreate retired versions
- recreate snapshots
- treat bootstrap as publication

On hydrate/DB error, listen path **warns and skips** (`adoption seed skipped`). It does not crash the process. Subsequent requests retry via `ensureCatalogReady`.

## Vercel

`scripts/vercel-handler.ts` does not call `ensureCatalogReady` at module load. First catalog/public/admin call hydrates the same way.

## Bindings

Startup does not bind subscriptions. Owner remains unbound.
