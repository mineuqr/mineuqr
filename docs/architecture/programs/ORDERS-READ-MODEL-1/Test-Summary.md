# ORDERS-READ-MODEL-1 — Test Summary

**Program:** ORDERS-READ-MODEL-1 — Phase 2 (Projection Materialization)  
**Date:** 2026-06-29

---

## Type Check

```
npm run check   → PASS (tsc --noEmit)
```

---

## Phase 2 Unit Tests

Command: `npx vitest run server/order/read`

| Test File | Tests | Result |
|-----------|-------|--------|
| `domain/contracts/__tests__/queryContracts.test.ts` | 3 | PASS |
| `projections/lifecycle/__tests__/ProjectionLifecycleRegistry.test.ts` | 4 | PASS |
| `infrastructure/persistence/inmemory/__tests__/InMemoryOrderReadProjectionStore.test.ts` | 3 | PASS |
| `projections/materializers/__tests__/OrderReadProjectionMaterializer.test.ts` | 3 | PASS |
| `projections/materializers/__tests__/OrderReadProjectionMaterializers.integration.test.ts` | 2 | PASS |
| `infrastructure/backfill/__tests__/OrderReadProjectionBackfillService.test.ts` | 3 | PASS |
| `infrastructure/registry/__tests__/OrderProjectionConsumerRegistry.test.ts` | 4 | PASS |
| `infrastructure/registry/__tests__/CompositeEventDispatchDelegate.test.ts` | 2 | PASS |
| `__tests__/readComposition.test.ts` | 2 | PASS |

**Total: 9 files, 26 tests — all PASS**

---

## Phase 2 New Tests

| File | Tests | Concern |
|------|-------|---------|
| `InMemoryOrderReadProjectionStore.test.ts` | 3 | Repository upsert, active filter, KPI get/create |
| `OrderReadProjectionMaterializer.test.ts` | 3 | Sync, timeline, KPI increment |
| `OrderReadProjectionMaterializers.integration.test.ts` | 2 | Consumer registration (7), idempotent dispatch |
| `OrderReadProjectionBackfillService.test.ts` | 3 | Tenant, partial, retry |

---

## Coverage by Concern

| Concern | Tests |
|---------|-------|
| Projection store (in-memory) | `InMemoryOrderReadProjectionStore.test.ts` |
| Materializer sync / timeline / KPI | `OrderReadProjectionMaterializer.test.ts` |
| Seven consumers registered | `OrderReadProjectionMaterializers.integration.test.ts` |
| Backfill scopes + retry | `OrderReadProjectionBackfillService.test.ts` |
| Lifecycle `materializing` state | `ProjectionLifecycleRegistry.test.ts` |
| Idempotent consumer skip | `OrderProjectionConsumerRegistry.test.ts` |
| Feature flag default (integration-only) | `readComposition.test.ts` |

---

## Full Suite

Command: `npm test` (full Vitest)

| Metric | Result |
|--------|--------|
| Test files | 192 |
| Tests | ~1135 |
| Read module regressions | None |
| Pre-existing flake | `sessionRevocation.test.ts` may timeout under full parallel load (passes in isolation) |

---

## Exit Criteria (Phase 2)

| Criterion | Status |
|-----------|--------|
| Repository tests | ✓ |
| Materializer tests | ✓ |
| Backfill tests | ✓ |
| `npm run check` passes | ✓ |
| No production wiring (flag off) | ✓ |
| Publisher unchanged | ✓ |
