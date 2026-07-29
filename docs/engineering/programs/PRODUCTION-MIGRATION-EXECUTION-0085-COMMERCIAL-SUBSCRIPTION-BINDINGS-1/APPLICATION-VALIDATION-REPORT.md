# APPLICATION-VALIDATION-REPORT — 0085

| Check | Result |
|-------|--------|
| Catalog health initialize (`ensureCatalogReady`) | **OK** |
| Snapshot service present | **OK** |
| `getSubscriptionCommercialBinding` callable | **OK** (null for unknown id) |
| `APP_CATALOG_SMOKE` | **OK** |
| `BINDING_LOOKUP_SMOKE` | **OK** |
| `RUNTIME_AUTHORITY_SMOKE` | **OK** |
| Direct SQL SELECT on bindings table | **OK** |
| Application deploy | **Not performed** (schema-only program) |

Isolated smoke may log audit persist failures when the full DB pool is not initialized the same way as the server process; assertions still passed.
