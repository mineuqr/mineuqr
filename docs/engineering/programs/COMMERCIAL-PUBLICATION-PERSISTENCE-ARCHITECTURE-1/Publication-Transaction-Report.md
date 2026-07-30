# Publication Transaction Report

## Atomic publish

1. Capture pre-publish version (+ overlay).
2. `PublicationService.publish` → provisional memory `state=published`.
3. `persistPublishedVersionPublication(versionId)` inside durable backend:
   - **DB:** `db.transaction` upserts plan subgraph (plan, cycles, bundle, limits, policies, regions, version, prices).
   - **Vitest memory:** merge subgraph into durable snapshot.
4. On success: clear overlay, invalidate ready gate, invalidate public cache, return success.
5. On failure: restore prior version in memory, restore overlay, throw `publication_persistence_failed`. Admin receives failure — memory is **not** left published.

## Partial publication

Prohibited. Failed persist rolls back memory; durable transaction aborts (DB) or never commits (memory throw before merge completes).
