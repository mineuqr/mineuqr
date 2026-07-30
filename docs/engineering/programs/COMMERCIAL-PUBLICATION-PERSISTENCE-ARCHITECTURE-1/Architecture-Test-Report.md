# Architecture Test Report

**Suite:** `server/commercial-catalog/__tests__/commercialPublicationPersistence.architecture.test.ts`

| Test | Proves |
|------|--------|
| Program id wired | Persistence program + publish calls persist |
| Memory cannot masquerade | Memory-only publish lost after durable hydrate |
| Survives restart | ensureCatalogReady restores published offerings |
| Admin = Public SSOT | Health published count matches public list |
| Rollback atomic | Persist throw → draft remains |
| No duplicate identities | Idempotent upsert single version id |
| Cache + durable | After invalidate, offerings from durable |

Related suites updated for async durable publish:

- `commercialCatalogPublicPublishing.test.ts`
- `commercialCapabilityOperationalValidation.test.ts`
