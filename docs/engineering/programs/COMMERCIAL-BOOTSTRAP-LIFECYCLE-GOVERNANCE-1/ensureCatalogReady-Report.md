# ensureCatalogReady Report

```
ensureCatalogReady()
  → ensureCommercialCatalogAdoptionSeed()
  → bootstrapPersistentCommercialCatalog()
       hydrate durable
       if !uninitialized → already_initialized (no publish)
       else initialize once
```

Retired-all catalogs: hydrate succeeds, bootstrap skips, Admin/Pricing load without CC-16.
(Empty public offerings is expected when no published versions remain.)
