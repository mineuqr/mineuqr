# REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1 — Implementation Report

**Status:** Implemented + historical rollups rebuilt  
**Date:** 2026-07-19  
**Priority:** P0 — Production Correctness  
**Related:** REPORTING-BUSINESS-DAY-ADOPTION-1, REPORTING-BUSINESS-DAY-BACKFILL-1, REPORTING-DASHBOARD-KPI-FORENSICS-2

---

## Final implementation status

**COMPLETE.** Incremental P-10 materialization and rebuild/backfill now share one canonical Business Day membership helper keyed by `order.createdAt`. Production rollups were rebuilt; tenant `720007` reconciles to the write model with zero dayKey invariant violations on recent days.

No Revenue, Tax, Settlement, Check, Payment Analytics, Business Day architecture, or Dashboard/Excel/PDF presentation changes.

---

## 1. Repository investigation

| Location | Prior dayKey source | Disposition |
|----------|---------------------|-------------|
| `OrderReadProjectionMaterializer.adjustAnalytics` | `envelope.occurredAt` (Created→createdAt, Completed→**servedAt**) | **Unified** → `orderAnalyticsBusinessDayKey(createdAt)` |
| `OrderReadProjectionMaterializer.rebuildRollupsForRestaurant` (P-10) | `order.createdAt` via `dayKeyFromTimestamp` | **Unified** → same helper |
| `OrderReadBusinessDayRollupBackfillService` | delegates to rebuild | Inherits unification |
| `OrderReadProjectionBackfillService` (day filter) | `createdAt` | Unchanged; consistent |
| `orderReadReportingAdapter` | reads persisted `dayKey` | No assignment |
| `OrderSalesMetricsService` | reads P-10 by today/month keys | No assignment |
| Dashboard / Excel / PDF | DTO only | No assignment |

No other P-10 writers found.

---

## 2. Materialization flow diagrams

### Incremental

```
Outbox OrderCreated | OrderCompleted
  → P-10 consumer → adjustAnalytics
  → load order.createdAt
  → orderAnalyticsBusinessDayKey
  → upsert order_read_analytics_daily
```

### Rebuild / Backfill / Recovery

```
listOrderIdsForRestaurant
  → loadByOrderId
  → orderAnalyticsBusinessDayKey(order.createdAt)
  → in-memory aggregate
  → DELETE all P-06/P-10 for restaurant
  → UPSERT BD-keyed rows
```

Backfill CLI: `scripts/order-read-business-day-rollup-backfill-execute.ts` → `rebuildRollupsForRestaurant`.

---

## 3. Business Day ownership map

See `ARCHITECTURE.md`. Resolver ownership unchanged (`resolveBusinessDayKey`). New module only selects the **governing timestamp** for Order Analytics.

---

## 4. Event ownership matrix

See `ARCHITECTURE.md`. Canonical: **all P-10 metrics for an order live on the creation Business Day.**

---

## 5. Files modified

| File | Change |
|------|--------|
| `server/order/read/projections/materializers/orderAnalyticsDayKey.ts` | **Added** — canonical helper |
| `server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts` | `adjustAnalytics` + rebuild P-10 use helper |
| `server/order/read/projections/materializers/projectionStatus.ts` | Doc pointer to canonical helper |
| `server/order/read/projections/materializers/__tests__/OrderReadProjectionMaterializer.analyticsDayKeyUnification.test.ts` | **Added** — parity / late completion |
| `shared/reporting-platform/__tests__/reportingOrderAnalyticsDayKeyUnification.architecture.guards.test.ts` | **Added** — architecture guards |
| `docs/engineering/programs/REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1/*` | Architecture, implementation, validation, execution |

---

## 6. Canonical unification design

```ts
export function orderAnalyticsBusinessDayKey(
  orderCreatedAt: string,
  workingHours?: NormalizedWorkingHours
): string {
  return resolveBusinessDayKey(orderCreatedAt, workingHours);
}
```

**ADR:** Creation-day ownership matches certified rebuild/backfill semantics and preserves `completedOrderCount ≤ orderCount` per dayKey. Serve-day ownership was rejected because it diverged from rebuild and broke that invariant in production (FORENSICS evidence: BD `2026-07-19` had completed 4 > orderCount 1).

---

## 7. Aggregator unification evidence

- `adjustAnalytics` body contains `orderAnalyticsBusinessDayKey` and does **not** reference `envelope.occurredAt`.
- Rebuild P-10 path calls `orderAnalyticsBusinessDayKey(order.createdAt, hours)`.
- Architecture guards enforce both (see test inventory).

---

## 8. Rollup rebuild execution

| Run | Scope | Result |
|-----|-------|--------|
| Canary | tenant `720007` | `ordersScanned=295`, `dayKeysWritten=34`, status completed (`81eda14e-…`) |
| Full fleet | 6 restaurants | `ordersScanned=295`, `dayKeysWritten=34`, status completed (`2ebc057c-…`) |

See `EXECUTION-REPORT.md`.

---

## 9. Historical reconciliation (post-rebuild)

Tenant `720007` @ `2026-07-19` (after canary):

| Metric | Dashboard / P-10 | Write model | Delta |
|--------|------------------|-------------|-------|
| Today's Orders | 3 | 3 | 0 |
| Today's Completed | 3 | 3 | 0 |
| Today's Order Sales | 50.00 | 50.00 | 0 |
| Month Orders | 89 | 89 | 0 |
| Month Completed | 82 | 82 | 0 |
| Month Order Sales | 3808.00 | 3808.00 | 0 |
| Invariant recent days | completed ≤ orderCount | — | OK |
| Today's Check Revenue | 50.00 | (Check SSOT) | aligned with served create-day sales |

Pre-fix (FORENSICS): Orders 1 / Sales 80.00 / completed 4 > orderCount 1.

---

## 10. Dashboard reconciliation

Dashboard Order Sales cards and Excel Executive Order Sales both read P-10 via Reporting Platform. After rebuild they share the corrected rows. PDF remains suspended (PERIOD-CONSISTENCY-1) — out of scope.

Presentation labels (Orders vs Completed Orders) unchanged — not this program.

---

## 11. KPI determinism validation

Automated: incremental late-completion stream equals rebuild totals (unit tests).  
Runtime: dashboard summary equals write-model aggregation by `createdAt` BD.

---

## 12. Performance analysis

| Concern | Result |
|---------|--------|
| Extra load on `OrderCreated` | One `loadByOrderId` (same as Completed already required for amount) |
| N+1 | Unchanged — still one load per analytics event |
| Rebuild cost | Unchanged delete+scan path |
| Tenant regression | Full fleet: empty tenants 0 orders; active tenant same scan size |

---

## 13. Regression analysis

| Scenario | Coverage |
|----------|----------|
| Cross-midnight late serve | Unit: create BD-1, serve BD-2 → metrics on BD-1 |
| Incremental = rebuild | Unit parity test |
| Architecture regression to occurredAt | Guard test |
| Revenue formula | Guard unchanged |
| Opening hours | Still via `restaurantOpeningTimeResolver` |

---

## 14. Expanded automated test inventory

| Suite | Cases |
|-------|-------|
| `OrderReadProjectionMaterializer.analyticsDayKeyUnification.test.ts` | helper created≠served; late completion; incremental=rebuild; idempotent rebuild |
| `reportingOrderAnalyticsDayKeyUnification.architecture.guards.test.ts` | helper; adjustAnalytics; rebuild; formulas; backfill delegate |
| Existing BD rebuild tests | Still green |

---

## 15. SaaS scalability assessment

Unification is O(1) per event (same as prior Completed path). Determinism enables safe fleet rebuilds and multi-region replay without path-dependent analytics. No new tables or dual writers.

---

## 16. Risks discovered

| Risk | Mitigation |
|------|------------|
| Historical jobs that assumed serve-day sales | Rebuild rewrote P-10 to creation-day; document in ARCHITECTURE |
| P-06 incremental vs snapshot still diverge | Explicitly out of scope; document |
| Missed `OrderCreated` before Completes | completed may exist without count until create arrives or rebuild; rebuild heals |

---

## 17. Architectural decisions recorded

1. **Creation Business Day owns all P-10 metrics** for an order.  
2. **Single helper** `orderAnalyticsBusinessDayKey` — no alternate branches.  
3. **Business Day math stays in** `@shared/utils/businessDay`.  
4. **P-06 not unified** in this program.

---

## 18. Final status

**Ready for independent architecture review / PRODUCTION CERTIFICATION.**  
Deterministic Order Analytics dayKey materialization is guaranteed across incremental and rebuild/backfill paths.
