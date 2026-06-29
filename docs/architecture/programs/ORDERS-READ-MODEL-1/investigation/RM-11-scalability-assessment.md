# RM-11 — Scalability Assessment

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Evaluation Criteria

Assess whether current Read Side supports:
- Thousands of restaurants (multi-tenant SaaS)
- Thousands of concurrent orders (per platform / per tenant)
- Operational dashboards
- Kitchen display
- Printing workspace
- Future reporting

---

## Thousands of Restaurants

| Factor | Assessment | Evidence |
|--------|------------|----------|
| Tenant isolation | **Adequate** | Queries filter by `restaurantId` |
| Per-tenant load | **Owner-scoped** | Each dashboard polls only selected restaurant |
| Cross-tenant read leakage | **Guarded** | `assertRestaurantAccess` on procedures |
| Platform-wide order analytics | **Not in restaurant read path** | Commercial admin separate |

**Verdict:** Multi-tenant isolation is structurally sound. Scale is per-restaurant, not cross-tenant aggregate reads in owner UI.

---

## Thousands of Concurrent Orders

| Factor | Assessment | Evidence |
|--------|------------|----------|
| Owner order list query | **Does not scale** | Full history, no pagination, N+1 items |
| Poll frequency | **Fixed 10s** | No backpressure or adaptive polling |
| Active order filtering | **Client-side only** | Server filter param unused |
| Write path concurrency | **Certified** | Optimistic concurrency on aggregate — separate from read |
| DB connection per poll | **Linear with active owners** | Standard pool limits apply |

**Bottleneck:** `getOrdersWithItemsByRestaurant` payload size grows with total historical orders, not just active orders.

**Estimated failure mode:** Slow polls, large JSON payloads, UI jank from full list render — not DB tenant isolation failure.

---

## Operational Dashboards

| Capability | Ready? | Gap |
|------------|--------|-----|
| Home snapshot KPIs | **Partial** | Order KPIs client-derived; ops metrics server-side |
| Sessions board | **Partial** | Server board + client order.list join |
| Activity feed | **Yes** | Bounded limit, server projection |
| Settlement reports | **Yes** | Server analytics module |
| Order operations tab | **Functional at low scale** | No active-only read model |
| Real-time alerts | **Delayed** | 10s notification poll |

**Verdict:** Usable for small/medium order volumes; **not architecturally scaled** for high-throughput operations.

---

## Kitchen Display

| Requirement | Current state |
|-------------|---------------|
| Kitchen queue read API | **Missing** |
| Status-sorted order view | **Missing** |
| Station routing | **Missing** |
| Event-driven queue update | Consumer telemetry only |
| ADR-ARCH-012 compliance path | Events exist; **read models do not** |

**Verdict:** **Not supported.** KITCHEN-DISPLAY-1 requires new read projections.

---

## Printing Workspace

| Requirement | Current state |
|-------------|---------------|
| Print queue read API | **Missing** |
| Job status / retry view | **Missing** |
| Print history | **Missing** |
| Event integration | `OrderPrintingConsumer` dispatches to log port only |

**Verdict:** **Not supported.** PRINTING-1 / PRINT-WORKSPACE-1 require new read models.

---

## Future Reporting

| Type | Ready? | Evidence |
|------|--------|----------|
| Settlement reporting | **Yes** | `settlementMetrics.ts` |
| Order sales reporting | **No** | Client Excel from `buildMonthlyReport` |
| Historical analytics store | **No** | No `order_analytics` facts table |
| Event-sourced analytics projection | **No** | No analytics consumer |

**Verdict:** Session-settlement reporting scales; **order revenue reporting does not** architecturally.

---

## Architectural Bottlenecks

| ID | Bottleneck | Affected programs |
|----|------------|-------------------|
| BOT-01 | `order.list` full scan + N+1 | ORDERS-WORKSPACE-1, all owner ops |
| BOT-02 | Client KPI computation | ORDERS-WORKSPACE-1, reporting |
| BOT-03 | No materialized order projections | All read-dependent programs |
| BOT-04 | Polling instead of push | Real-time ops, kitchen, print |
| BOT-05 | Shared `db.ts` read/write | Independent evolution blocked |
| BOT-06 | No kitchen/print read layer | KITCHEN-DISPLAY-1, PRINTING-1 |

---

## Scalability Matrix

| Workload | 10 orders/day | 100 active orders | 1000+ historical orders |
|----------|---------------|-------------------|-------------------------|
| `order.list` poll | OK | OK | **Degraded** |
| Client `buildOrderStatistics` | OK | OK | **Degraded** |
| Ops board/feed | OK | OK | OK |
| Settlement analytics | OK | OK | OK (date filtered) |
| Kitchen display | N/A | **Not available** | **Not available** |

---

## Conclusion

The Read Side **scales for session/settlement operational views** but **does not scale for order-centric operational workloads** at high order volume. Kitchen and printing read surfaces are **absent**. Platform multi-tenancy is sound; per-restaurant order read patterns are the primary bottleneck.
