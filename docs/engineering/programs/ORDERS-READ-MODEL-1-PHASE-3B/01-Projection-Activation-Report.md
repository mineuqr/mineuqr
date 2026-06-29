# ORDERS-READ-MODEL-1 Phase 3B — Projection Activation Report

**Program:** ORDERS-READ-MODEL-1 Phase 3B  
**Date:** 2026-06-29

---

## Objective

Activate the production projection pipeline using existing architecture — no redesign.

---

## Activation Changes

| Component | Before (Phase 3A) | After (Phase 3B) |
|-----------|-------------------|------------------|
| Publisher dispatch delegate | `orderEventConsumerRegistry` only | `createOrderEventDispatchDelegate()` |
| Projection dispatch | Disabled by default | **Enabled** (default on outside `NODE_ENV=test`) |
| Lifecycle states P-01–P-06, P-10, P-11 | `materializing` | `queryable` |
| `db:order-read:backfill` npm script | Absent | Added |
| Phase 3A projection guard | Blocked `ORDER_READ_PROJECTIONS_ENABLED=true` | Removed |

---

## Files Modified

| File | Change |
|------|--------|
| `server/order/eventInfrastructureComposition.ts` | Publisher uses `orderEventDispatchDelegate` from `createOrderEventDispatchDelegate()` |
| `server/_core/env.ts` | `orderReadProjectionsEnabled` defaults on unless `ORDER_READ_PROJECTIONS_ENABLED=false` or test |
| `server/order/read/readComposition.ts` | Phase 3B comments |
| `server/order/read/infrastructure/registry/CompositeEventDispatchDelegate.ts` | Phase 3B comments |
| `server/order/read/projections/lifecycle/ProjectionLifecycleRegistry.ts` | Lifecycle `queryable` for active projections |
| `scripts/order-read-backfill-execute.ts` | dotenv, arg parse fix, remove Phase 3A guard |
| `scripts/lib/order-read-staging-logic.mjs` | Phase 3B guards |
| `server/order/read/infrastructure/backfill/OrderReadProjectionBackfillService.ts` | `lastEventId` uses `runId` (fits `varchar(36)`) |
| `package.json` | `db:order-read:backfill` script |

---

## Rollback

Set `ORDER_READ_PROJECTIONS_ENABLED=false` to restore integration-only dispatch without code changes.

---

## Verdict

**Projection dispatch ACTIVATED** via existing composite delegate pattern.
