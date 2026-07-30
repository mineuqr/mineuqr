# Architecture Test Report

**Suite:** `server/commercial-catalog/__tests__/commercialPersistentCatalogBootstrap.architecture.test.ts`

| Test | Result |
|------|--------|
| Program + Projection/Presentation feature derivation | Pass |
| Bootstrap only when empty; skip when published | Pass |
| Idempotent — no duplicate plans/versions/cycles/prices | Pass |
| Restart hydrate — Admin = Public offerings | Pass |
| ensureCatalogReady delegates; no DEFAULT_FEATURES seed | Pass |

Related persistence suite: still green (12 tests across bootstrap + persistence files in last run).
