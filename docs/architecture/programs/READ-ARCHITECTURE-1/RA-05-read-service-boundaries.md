# RA-05 — Read Service Boundaries

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Layer Definitions

### Query Application Services

**Purpose:** Application-layer entry point for read use cases. Analogous to command application services on the write side but **strictly read-only**.

| Allowed | Forbidden |
|---------|-----------|
| Authorization (`assertRestaurantAccess`) | SQL / Drizzle direct access |
| Input validation and normalization | Domain policy evaluation |
| Invoke one or more Read Services | Aggregate mutation or repository save |
| Compose read results into API DTOs | KPI calculation formulas (belongs in projection materialization) |
| Return `generatedAt` and projection version metadata | Call integration consumers |
| Translate read errors to tRPC errors | Access `db.ts` legacy write helpers |
| Orchestrate multi-projection dashboard snapshot | Cache business rule state |

**Examples (target):**
- `GetActiveOrdersQueryHandler`
- `GetOrderAnalyticsSummaryQueryHandler`
- `GetDashboardSnapshotQueryHandler` (composes ops + order KPI read services)

**Module:** `server/order/read/application/`, `server/ops/application/` (if extracted from routers).

---

### Read Services

**Purpose:** Execute a single query against projection store via projection repository. One read service per query catalog entry (RA-03).

| Allowed | Forbidden |
|---------|-----------|
| Call projection repository methods | Cross-module writes |
| Apply filters, sort, pagination parameters | Lifecycle transition logic |
| Map projection rows to read DTOs | Revenue recognition rules (precomputed in P-10) |
| Enforce tenant scope on every call | Read from write tables post-migration |
| Return empty results for missing data | Compose notifications or session commands |

**Examples (target):**
- `ActiveOrdersReadService`
- `OrderAnalyticsReadService`
- `PublicOrderStatusReadService`

**Module:** `server/order/read/services/`.

**Existing pattern to emulate:** `getRestaurantOverview`, `getSettlementSummary` — server modules with typed results and `generatedAt`.

---

### Projection Repositories

**Purpose:** Persistence adapter for projection store only.

| Allowed | Forbidden |
|---------|-----------|
| Insert / upsert / delete projection rows | Load Order aggregate |
| Query by tenant keys and indexes | Emit domain events |
| Transactional batch updates per event | Call external APIs |
| Idempotent writes keyed by natural keys | Business logic beyond denormalization |
| Expose read methods for Read Services | UI-specific shaping |

**Examples (target):**
- `ActiveOrdersProjectionRepository`
- `OrderAnalyticsFactRepository`
- `OrderTimelineProjectionRepository`

**Module:** `server/order/read/infrastructure/persistence/`.

**Separation from write:** `DrizzleOrderRepository` remains write-only. No read service imports it.

---

### Projection Consumers

**Purpose:** Event handler that updates projection repositories. Registered alongside integration consumers in `OrderEventConsumerRegistry` with distinct consumer names.

| Allowed | Forbidden |
|---------|-----------|
| Parse event envelope payload | Call other consumers |
| Upsert/delete projection rows idempotently | Send notifications / push |
| Log ops telemetry | Modify session aggregates |
| Use shared idempotency store | Dispatch print jobs |
| Fail in isolation per ADR-ARCH-014 | Read UI state |

**Module:** `server/order/read/projections/consumers/`.

---

## Router Boundary (Read API)

Routers remain **orchestration only**:

```
orderReadRouter.listActive
  → GetActiveOrdersQueryHandler.execute(input, ctx)
    → ActiveOrdersReadService.list(input)
      → ActiveOrdersProjectionRepository.findPage(...)
```

**Forbidden in router:** `getOrdersWithItemsByRestaurant`, `buildOrderStatistics` equivalents, inline COUNT queries.

---

## Cross-Context Composition Rules

| Scenario | Rule |
|----------|------|
| Dashboard snapshot | Query application service composes `ops` read service + `order` KPI read service — each owns its projection |
| Session workspace | Session query application service reads session projection + calls `OrderDetailsReadService.listBySessionId` |
| Activity feed | Ops feed remains ops-owned; optional enrichment from P-04 via ops read service join — not client join |
| Guest public status | Single read service from P-11 — no compose |

**Forbidden:** Client-side join of `order.list` + `ops.getActiveTablesBoard` (current `sessionWorkspaceOps.ts` pattern).

---

## Shared Infrastructure (Allowed)

| Service | Used by |
|---------|---------|
| `DrizzleConsumerIdempotencyStore` | Integration + projection consumers |
| `EventConsumerMetrics` | All consumers |
| `opsLog` | Telemetry |
| Restaurant timezone resolution | Analytics date bucketing (server authority) |
| `assertRestaurantAccess` | All owner query application services |

---

## Testing Boundaries

| Layer | Test approach |
|-------|---------------|
| Projection consumer | Given event envelope → assert repository calls / DB fixture state |
| Read service | Given projection fixture → assert DTO output |
| Query application service | Auth + compose integration |
| Router | Thin delegate mock |

---

## Violations to Eliminate (from investigation)

| Current violation | Target boundary |
|-------------------|-----------------|
| `order.list` router → `db.ts` | Query application service → Read service → Projection repository |
| `buildOrderStatistics` in Dashboard | Q-05, Q-06 read services |
| `deriveSettlementSummary` in client | Server field on `session.getOwnerWorkspace` |
| `OrderNotificationConsumer` reads `getOrderById` | Retain for integration enrichment only — not a read architecture path for UI |

---

## References

- RA-01 Read Architecture Blueprint
- ORDERS-READ-MODEL-1 RM-07 Boundary Compliance
- Blueprint §11 OrderQueryFacade responsibilities
