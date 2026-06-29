# RM-12 — Future Compatibility

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## Programs Under Evaluation

| Program | Dependency on Read Side |
|---------|-------------------------|
| ORDERS-WORKSPACE-1 | Owner order list, detail, analytics, workspace UX |
| PRINT-WORKSPACE-1 | Print queue, job status UI |
| KITCHEN-DISPLAY-1 | Kitchen queue, order cards by status |
| PRINTING-1 | Print integration + job persistence |
| PRINT-CONNECTOR-1 | Connector status, device queue reads |

---

## ORDERS-WORKSPACE-1

| Requirement | Current support | Redesign needed? |
|-------------|-----------------|------------------|
| Active orders list | Partial — full list + client filter | **Yes** — active-only read model |
| Order detail view | Inline card from list item | **Prefer** dedicated read endpoint |
| Server-owned KPIs | **No** — `buildOrderStatistics` | **Yes** — ADR-ARCH-009 |
| Status actions | **Yes** — write path certified | No |
| Session drill-down | **Yes** — `session.getOwnerWorkspace` | Partial — remove dual `order.list` |
| Polling refresh | **Yes** — transitional | Improve with projection push later |
| Module extraction | N/A (UI concern) | UI refactor separate from read model |

**Compatibility:** **Low without read model implementation.** ORDERS-WORKSPACE-1 investigation already marked NOT READY.

**Evidence:** `docs/architecture/programs/ORDERS-WORKSPACE-1/investigation/implementation-readiness.md`

---

## KITCHEN-DISPLAY-1

| Requirement | Current support | ADR |
|-------------|-----------------|-----|
| Order events | **Yes** — `OrderCreated`, `OrderStatusChanged`, `OrderReady` | ADR-ARCH-012 |
| Kitchen consumer | Telemetry only | ADR-ARCH-012 |
| Kitchen queue read API | **Missing** | ADR-ARCH-012 requires read models |
| KDS-optimized payload | **Missing** | — |
| Real-time update | Poll `order.list` would be inadequate | — |

**Compatibility:** **Not compatible without redesign.** Events provide integration hook; no read projection exists.

**Required new artifacts (architecture, not implementation):**
- Kitchen queue read model / query API
- Projection refresh from order events (or poll optimized active-orders view)

---

## PRINTING-1

| Requirement | Current support | ADR |
|-------------|-----------------|-----|
| Print dispatch on events | **Yes** — `OrderPrintingConsumer` | ADR-ARCH-012 |
| Print job store | **No** — `LogOrderPrintDispatchPort` only | — |
| Print queue read | **Missing** | ADR-ARCH-012 |
| Reprint / status | **Missing** | — |

**Compatibility:** **Not compatible without redesign.**

---

## PRINT-WORKSPACE-1

| Requirement | Current support |
|-------------|-----------------|
| Owner print queue UI | **No data source** |
| Job history | **No** |
| Failed job retry view | **No** |

**Compatibility:** **Blocked** on PRINTING-1 read models.

---

## PRINT-CONNECTOR-1

| Requirement | Current support |
|-------------|-----------------|
| Device/connector status read | **Not audited in order scope** — no print connector module found |
| Order payload for print | Consumer has orderId; re-reads `getOrderById` |

**Compatibility:** **No existing connector read layer.** Depends on PRINTING-1 foundation.

---

## Cross-Program Read Architecture Gaps

```
Current:
  order.list (raw) ──► ORDERS-WORKSPACE-1 UI
  (nothing)        ──► KITCHEN-DISPLAY-1
  (nothing)        ──► PRINT-WORKSPACE-1

Required (per constitution):
  OrderActiveListProjection    ──► ORDERS-WORKSPACE-1
  OrderAnalyticsProjection     ──► Reports / Dashboard
  KitchenQueueProjection       ──► KITCHEN-DISPLAY-1
  PrintJobQueueProjection      ──► PRINTING-1 / PRINT-WORKSPACE-1
```

---

## What Can Be Reused Without Redesign

| Asset | Reusable for |
|-------|--------------|
| `server/ops/*` pattern | Template for new read modules |
| `settlementMetrics.ts` pattern | Template for order analytics module |
| `getActiveOrdersCount` | Seed for active orders KPI (extend, don't duplicate) |
| `getOrdersBySessionId` | Session-scoped order reads |
| `toPublicOrderStatus` | Guest read pattern |
| `orderPublicStatus.ts` | Public projection mapper pattern |
| Event types + consumer registry | Projection refresh triggers (future) |
| `sessionOwnerWorkspace` | Session context alongside order reads |

---

## What Requires Redesign

| Component | Reason |
|-----------|--------|
| `order.list` as universal read | Wrong shape, scale, and authority model |
| Client `buildOrderStatistics` | Must be replaced, not extended |
| Polling-only refresh | Insufficient for kitchen/print real-time |
| `db.ts` as order read entry | Must introduce `server/order/read/` or equivalent |
| No event → projection pipeline | Required for independent read evolution |

---

## ADR Compatibility

| ADR | Blocks future programs? |
|-----|-------------------------|
| ADR-ARCH-006 | **Yes** — blocks ORDERS-WORKSPACE-1 certification |
| ADR-ARCH-009 | **Yes** — blocks order analytics programs |
| ADR-ARCH-012 | **Yes** — kitchen/print need read models not yet built |
| ADR-ARCH-008 | **No** — events ready for projection consumers |

---

## Summary

| Program | Compatible without redesign? |
|---------|------------------------------|
| ORDERS-WORKSPACE-1 | **No** |
| KITCHEN-DISPLAY-1 | **No** |
| PRINTING-1 | **No** |
| PRINT-WORKSPACE-1 | **No** |
| PRINT-CONNECTOR-1 | **No** |

The certified **Write Side and event bus** are compatible with future read programs. The **Read Side must be built** — current state cannot absorb these programs without architectural additions mandated by ADR-ARCH-006, ADR-ARCH-009, and ADR-ARCH-012.
