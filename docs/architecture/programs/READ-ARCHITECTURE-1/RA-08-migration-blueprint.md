# RA-08 — Migration Blueprint

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Migration Objective

Replace legacy read path:

```
order.list → getOrdersWithItemsByRestaurant → orders + order_items (write tables)
```

With certified read path:

```
order.read.* → Query Application Service → Read Service → Projection Repository → Projection Store
```

**Constraints:**
- Zero downtime requirement for production restaurants.
- Write path unchanged (ORDER-1 / ORDER-EVENTS-1B remain certified).
- No dual KPI authority during steady state — client `buildOrderStatistics` removed only after server KPIs verified.

**Investigation basis:** ORDERS-READ-MODEL-1 GAP-R01, GAP-R02, GAP-R04; ORDERS-WORKSPACE-1 BLOCK-01, BLOCK-02.

---

## Phase 0 — Architecture Approval (Current)

| Activity | Output |
|----------|--------|
| READ-ARCHITECTURE-1 complete | This reference architecture |
| Architecture Authority approval | Gate for ORDERS-READ-MODEL-1 implementation |
| ADR-ARCH-015 ratification (recommended) | Read Model Architecture ADR |

**No production changes.**

---

## Phase 1 — Projection Foundation

| Activity | Detail |
|----------|--------|
| Create `server/order/read/` module structure | Per RA-01 topology |
| Define projection store schema | P-01 through P-06, P-10, P-11 |
| Register projection consumers | Extend `OrderEventConsumerRegistry` |
| Backfill job | One-time: read current `orders`/`order_items` → populate projections (offline or batched) |
| Dual-write period begins | New orders update projections via consumers; backfill covers history |

**Legacy `order.list`:** Still active — unchanged client.

**Exit criteria:** Projection row count matches write table for sample restaurants; consumer idempotency tests pass.

---

## Phase 2 — Read API Introduction (Shadow Mode)

| Activity | Detail |
|----------|--------|
| Implement Q-01, Q-03, Q-05, Q-08 read services | Behind new tRPC procedures |
| Implement Q-06, Q-07 analytics read services | P-10 populated |
| Shadow comparison | Server logs divergence: legacy `order.list` stats vs Q-05/Q-06 (ops telemetry only) |
| No UI switch yet | Dashboard still uses legacy |

**Exit criteria:** Shadow divergence rate below agreed threshold for 7 days in staging.

---

## Phase 3 — UI Cutover (ORDERS-WORKSPACE-1 Prerequisite)

| Activity | Detail |
|----------|--------|
| Replace `order.list` with Q-01 in OrdersTab | Remove client status filter on full history |
| Replace home KPIs with Q-05 + Q-10 | Remove `buildOrderStatistics` from home |
| Replace reports KPIs with Q-06, Q-07 | Remove monthly/yearly client builders |
| Replace `SessionsWorkspacePanel` sales KPI | Remove `computeTodayCompletedSales` |
| Session sheet | Remove redundant `order.list`; use Q-40 extended |
| Retarget `queryRuntime` polls | Q-01 not legacy list |

**Legacy `order.list`:** Mark deprecated in router; log usage.

**Exit criteria:** No client KPI functions called in dashboard; ADR-ARCH-006 satisfied.

---

## Phase 4 — Legacy Read Decommission

| Activity | Detail |
|----------|--------|
| Remove `order.list` procedure | Or hard-fail with migration message |
| Remove `getOrdersWithItemsByRestaurant` from router path | Retain in backfill tooling only |
| Remove `order.getById` if superseded by Q-03 | |
| Remove `order.activeCount` | Superseded by Q-05 |
| Delete client dead code | `buildTodayReport`, unused helpers |

**Write path:** `DrizzleOrderRepository` continues using `getOrderById` for aggregate hydration only — **not** a UI read path.

**Exit criteria:** Grep shows no `trpc.order.list` in client; no `buildOrderStatistics`.

---

## Phase 5 — Kitchen & Print Read Models (Parallel Programs)

| Activity | Program |
|----------|---------|
| P-07 + Q-20 | KITCHEN-DISPLAY-1 |
| P-08 + Q-30 | PRINTING-1, PRINT-WORKSPACE-1 |
| Split integration vs projection concerns | Kitchen telemetry consumer remains; KDS reads P-07 |

**No dependency on Phase 4 for starting Phase 5** — separate modules.

---

## Phase 6 — Polling Reduction (Optional Enhancement)

| Activity | Detail |
|----------|--------|
| Evaluate SSE/WebSocket for Q-01, Q-20 | KITCHEN-DISPLAY-1 |
| Increase staleTime where event-driven freshness sufficient | Home KPIs |

---

## Risk Controls During Migration

| Risk | Control |
|------|---------|
| KPI divergence | Phase 2 shadow comparison |
| Missing historical orders | Phase 1 backfill + reconciliation report |
| Performance regression | Phase 2 load test on Q-01 vs legacy |
| ORDER-EVENTS-1B regression | No changes to integration consumers in Phase 1–3 |
| Rollback | Feature flag per query (`ENV.readModelActiveOrders` pattern) — implementation detail deferred |

---

## Deprecation Timeline (Architecture Targets)

| Artifact | Phase deprecated | Phase removed |
|----------|------------------|---------------|
| `buildOrderStatistics` | Phase 3 start | Phase 3 end |
| `order.list` UI usage | Phase 3 start | Phase 4 |
| `order.list` API | Phase 3 end | Phase 4 |
| Client `deriveSettlementSummary` | Phase 3 | Phase 3 |
| `getOrdersWithItemsByRestaurant` in hot path | Phase 4 | Phase 4 |

---

## Programs Mapped to Phases

| Program | Phases |
|---------|--------|
| READ-ARCHITECTURE-1 | Phase 0 |
| ORDERS-READ-MODEL-1 | Phase 1–2, Phase 4 |
| ORDERS-WORKSPACE-1 | Phase 3 |
| KITCHEN-DISPLAY-1 | Phase 5 |
| PRINTING-1 / PRINT-WORKSPACE-1 / PRINT-CONNECTOR-1 | Phase 5 |

---

## References

- ORDERS-READ-MODEL-1 implementation-readiness.md
- ORDERS-WORKSPACE-1 implementation-readiness.md
- Blueprint §13 Production Path
