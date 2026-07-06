# ORDER-READ-BACKFILL-1 — Canonical Category Projection Production Backfill
## Production Acceptance Report

**Program:** ORDER-READ-BACKFILL-1  
**Type:** Production Readiness  
**Prerequisite:** ORDER-READ-CATEGORY-PROJECTION-1 (Certified)  
**Date:** 2026-07-06  
**Decision:** **ACCEPTED**

---

## 1. Executive Summary

ORDER-READ-BACKFILL-1 delivers a production-safe data migration path for historical `order_read_order_line_items` rows created before migration `0056`. `OrderReadCategoryBackfillService` upgrades legacy rows to canonical `OrderCategoryProjection` JSON using the certified `OrderCategoryProjectionBuilder` — no runtime, API, or presentation changes. The service is batch-oriented (default 500), idempotent, resumable, and produces a structured backfill report with observability metrics. Verification confirms 100% projection integrity when migration completes successfully.

---

## 2. Backfill Strategy

| Phase | Action |
|-------|--------|
| 1. Deploy migration `0056` | Adds `categoryProjection` JSON column |
| 2. Verify legacy inventory | `orderReadCategoryBackfillVerifier.verify()` |
| 3. Execute backfill | Tenant-scoped or full via CLI script |
| 4. Post-verify | `--verify-only` until `legacyRows === 0` |
| 5. Enable kitchen runtime | Category filter relies on canonical projections only |

Legacy rows are identified by invalid/missing `categoryProjection.categoryId` — not by schema version alone. Already-upgraded rows are excluded from batch selection.

---

## 3. Batch Processing Design

```
listLegacyBatch(batchSize, resumeAfter?)
        │
        ▼
Group by restaurantId
        │
        ▼
OrderCategoryProjectionBuilder.buildCategoryProjectionsForMenuItems()
        │
        ▼
assertCanonicalCategoryProjection() per row
        │
        ▼
updateCategoryProjections() — single DB transaction per batch
        │
        ▼
Advance cursor → next batch
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `batchSize` | 500 | Rows per batch |
| `scope` | — | `full` or `tenant` |
| `resumeAfter` | — | `(restaurantId, orderId, lineItemId)` cursor |

No full-table memory load. One batched category resolution per restaurant per batch (no N² queries).

---

## 4. Validation Strategy

Every migrated row must pass `validateStoredCategoryProjection()`:

- `categoryProjection != null`
- `categoryId` positive integer
- `categoryCode === cat-{categoryId}` (builder convention)
- `categoryName` non-empty
- `version` positive integer (from category `updatedAt`)
- `updatedAt` present

Validation uses the same rules as ORDER-READ-CATEGORY-PROJECTION-1 read path (`parseStoredCategoryProjection` + integrity checks). Partial projections are never written — failed rows are recorded and skipped.

---

## 5. Failure Handling

| Scenario | Behavior |
|----------|----------|
| Category cannot be resolved | Record failure; continue batch; no partial write |
| Built projection fails validation | Record failure; continue batch |
| Batch transaction error | Propagate; ops log `order_read_category_backfill_failed` |
| Unresolved rows after run | `integrityStatus: "invalid"`; `resumeCursor` returned |

Failure summary included in `CategoryBackfillReport.failures[]` with `restaurantId`, `orderId`, `lineItemId`, `menuItemId`, `error`.

---

## 6. Performance Metrics

Observability exposed in report `observability` block:

| Metric | Source |
|--------|--------|
| `rowsPerSecond` | `rowsScanned / durationMs` |
| `batchCount` | Batches processed |
| `averageBatchDurationMs` | Mean batch wall time |
| `failureCount` | Resolution/validation failures |
| `retryCount` | `retry()` invocations |
| `completionPercentage` | `(migrated + skipped) / totalRows` |

Category resolution is batched per restaurant per batch — not per row.

---

## 7. Verification Results

`OrderReadCategoryBackfillVerifier.verify()` returns:

```typescript
{
  ok: boolean;              // legacyRows === 0
  totalRows: number;
  legacyRows: number;
  invalidRows: number;
  integrityPercentage: number;  // 100 when ok
}
```

**Automated test evidence:** 13 program tests passed including idempotency, failure recording, resume cursor, and architecture guards.

---

## 8. Observability

Ops taxonomy events:

- `order_read_category_backfill_started`
- `order_read_category_backfill_completed`
- `order_read_category_backfill_failed`

`OrderReadCategoryBackfillMetrics` singleton tracks batch duration, failures, and retries for monitoring integration.

---

## 9. Files Added

| File | Purpose |
|------|---------|
| `server/order/read/infrastructure/backfill/OrderReadCategoryBackfillService.ts` | Main backfill service |
| `server/order/read/infrastructure/backfill/OrderReadCategoryBackfillVerifier.ts` | Post-migration verification |
| `server/order/read/infrastructure/backfill/OrderReadCategoryBackfillMetrics.ts` | Observability counters |
| `server/order/read/infrastructure/backfill/CategoryBackfillLineItemStore.ts` | Store port |
| `server/order/read/infrastructure/backfill/DrizzleCategoryBackfillLineItemStore.ts` | Drizzle implementation |
| `server/order/read/infrastructure/backfill/InMemoryCategoryBackfillLineItemStore.ts` | Test double |
| `server/order/read/infrastructure/persistence/categoryProjectionValidation.ts` | Canonical validation |
| `server/order/read/infrastructure/backfill/__tests__/OrderReadCategoryBackfillService.test.ts` | Service tests |
| `server/order/read/infrastructure/persistence/__tests__/categoryProjectionValidation.test.ts` | Validation tests |
| `server/order/read/__tests__/orderReadCategoryBackfill.architecture.guards.test.ts` | Architecture guards |
| `scripts/order-read-category-backfill-execute.ts` | Production CLI |
| `docs/engineering/programs/ORDER-READ-BACKFILL-1/PRODUCTION-ACCEPTANCE.md` | This report |

---

## 10. Files Modified

| File | Change |
|------|--------|
| `server/order/read/projections/builders/OrderCategoryProjectionBuilder.ts` | Added `buildCategoryProjectionsForMenuItems()` for backfill batching |
| `server/order/read/readPersistenceComposition.ts` | Wired category backfill service + verifier |
| `server/order/read/index.ts` | Exported backfill types |
| `server/_core/opsTaxonomy.ts` | Category backfill ops events |
| `server/order/read/__tests__/fixtures/categoryProjectionFixtures.ts` | Consistent `categoryCode` derivation |

**Not modified:** Runtime, kitchen client, category filter, APIs, presentation, fleet, provisioning.

---

## 11. Test Results

```
server/order/read/infrastructure/backfill/__tests__/OrderReadCategoryBackfillService.test.ts  — 5 passed
server/order/read/infrastructure/persistence/__tests__/categoryProjectionValidation.test.ts — 3 passed
server/order/read/__tests__/orderReadCategoryBackfill.architecture.guards.test.ts         — 5 passed
```

`npx tsc --noEmit` — clean.

---

## 12. Production Risks

| Risk | Mitigation |
|------|------------|
| Orphaned menu items (deleted) | Failures recorded; manual data repair required |
| Large table scan duration | Batch size tunable; tenant-scoped runs |
| Migration `0056` on existing rows without default | Backfill must run before kitchen category filter in production |
| Re-run during live traffic | Idempotent — upgraded rows skipped |

---

## 13. Deployment Procedure

1. Apply migration `0056_order_read_category_projection.sql`
2. Set `DATABASE_URL` and `ORDER_READ_CATEGORY_BACKFILL_CONFIRM=YES`
3. Verify legacy inventory:
   ```bash
   npx tsx scripts/order-read-category-backfill-execute.ts --scope tenant --restaurant-id <ID> --verify-only
   ```
4. Run tenant backfill (repeat per restaurant or use `--scope full`):
   ```bash
   npx tsx scripts/order-read-category-backfill-execute.ts --scope tenant --restaurant-id <ID>
   ```
5. Confirm `integrityStatus: "valid"` and `legacyRows: 0` in report
6. Enable operational kitchen screens with category filtering

Optional flags: `--batch-size 500`, resume via `resumeAfter` in service API after crash.

---

## 14. Rollback Strategy

| Action | Effect |
|--------|--------|
| Re-run backfill | Safe — idempotent |
| Roll back migration `0056` | Requires column drop; only if no dependent reads |
| Runtime fallback | **Not available** — ORDER-READ-CATEGORY-PROJECTION-1 removed fallbacks |

Rollback of data: restore `order_read_order_line_items` from pre-backfill snapshot if required. Do not reintroduce runtime fallbacks.

---

## 15. Backfill Report

Example report shape produced by `OrderReadCategoryBackfillService.run()`:

```json
{
  "runId": "uuid",
  "status": "completed",
  "rowsScanned": 1240,
  "rowsMigrated": 1180,
  "rowsSkipped": 60,
  "rowsFailed": 0,
  "durationMs": 8420,
  "projectionSchemaVersion": 2,
  "categoryProjectionSchemaVersion": 1,
  "integrityStatus": "valid",
  "failures": [],
  "observability": {
    "rowsPerSecond": 147.3,
    "batchCount": 3,
    "averageBatchDurationMs": 2806,
    "failureCount": 0,
    "retryCount": 0,
    "completionPercentage": 100
  },
  "resumeCursor": null
}
```

---

## 16. Production Acceptance Decision

**ACCEPTED**

ORDER-READ-BACKFILL-1 satisfies production readiness criteria:

- ✓ `OrderReadCategoryBackfillService` implemented with batch, resume, and idempotent semantics
- ✓ Canonical builder used — no alternate projection logic
- ✓ Validation enforces projection integrity before persist
- ✓ Verification API confirms zero legacy rows
- ✓ CLI script with safety confirmation gate
- ✓ Observability metrics and ops events
- ✓ No runtime/API/presentation changes
- ✓ 13 automated tests + architecture guards passing

Historical projections can be upgraded to canonical category projections. Runtime no longer depends on legacy rows once backfill and verification complete.
