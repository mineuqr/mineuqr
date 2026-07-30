# Publication Validation Report

| Check | Evidence |
|-------|----------|
| Publish writes durable data | `persistPublishedVersionPublication` in publish path |
| Admin success after persist | Router awaits `catalogPublishingService.publish`; throws on persist fail |
| Pricing reads same catalog | Both hydrate via durable backend |
| Memory not authority | Architecture test: memory-only publish lost after hydrate |
| Persist failure → not published | Rollback test |
| Cache after success only | Invalidation after persist; test rehydrates from durable |
