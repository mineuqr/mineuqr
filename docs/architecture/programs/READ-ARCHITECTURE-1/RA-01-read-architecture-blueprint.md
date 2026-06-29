# RA-01 — Read Architecture Blueprint

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26  
**Status:** Reference Architecture — pending Architecture Authority approval

---

## Purpose

This document defines the **official Read Side Reference Architecture** for MineuQR. It supersedes ad-hoc read paths documented in ORDERS-READ-MODEL-1 Investigation (legacy `order.list` → `db.ts`) and aligns with Order-Centric Blueprint §11.

**Authority chain:** Architecture Constitution v1.0 → Order-Centric Blueprint §11, §13 → ADR-ARCH-006, ADR-ARCH-008, ADR-ARCH-009, ADR-ARCH-014.

---

## Architectural Position

The **Write Side** is certified:

```
Order Aggregate → Application Services → Repository → Outbox → Relay → Publisher → Consumer Registry → Integration Consumers
```

The **Read Side** is a parallel plane that **never mutates** the Order Aggregate and **never owns** business rules:

```
UI (Presentation)
    ↓
Read API (tRPC query procedures)
    ↓
Query Application Services (orchestration, authorization gate, DTO assembly)
    ↓
Read Services (query execution, projection selection)
    ↓
Projection Repositories (tenant-scoped reads from projection store)
    ↓
Projection Store (materialized views / read tables / rollups)
         ↑
Projection Consumers (event-driven updaters — separate from integration consumers)
```

---

## Layer Responsibilities

### UI (Presentation)

| Responsibility | Owner |
|----------------|-------|
| Render server DTOs | `client/` dashboard and workspace pages |
| View state only (filters, tabs, sheet open/close) | React local state |
| Poll or subscribe per refresh policy | `queryRuntime` constants |

**Forbidden:** KPI computation, lifecycle policy, aggregation, settlement derivation, revenue math.

**Traceability:** ADR-ARCH-006; ORDERS-WORKSPACE-1 INV-08, INV-11; ORDERS-READ-MODEL-1 RM-05.

---

### Read API

| Responsibility | Owner |
|----------------|-------|
| Expose stable query contracts to UI | tRPC `verifiedProcedure` / `publicProcedure` |
| Input validation (tenant, filters, pagination) | Router input schemas |
| Delegate to Query Application Service | Routers — orchestration only |

**Forbidden:** SQL, aggregation logic, direct `db.ts` access, business rules, KPI math.

**Traceability:** Blueprint §13 Production Path; ORDERS-READ-MODEL-1 RM-01 (current violation: `order.list` → `db.ts`).

---

### Query Application Services

| Responsibility | Owner |
|----------------|-------|
| Enforce restaurant access (`assertRestaurantAccess`) | Per-query application service |
| Compose multiple read services when needed | Facade pattern (e.g. dashboard snapshot) |
| Map projection records to API DTOs | Thin mapping only |
| Apply read-your-writes minimal DTO on command response | Command handlers (write path), not read services |

**Forbidden:** Domain mutation, outbox writes, integration side effects, SQL.

**Module placement:** `server/order/read/application/`, `server/ops/application/`, `server/analytics/application/`.

---

### Read Services

| Responsibility | Owner |
|----------------|-------|
| Execute purpose-built queries against projection store | One service per query catalog entry |
| Apply filters, sort, pagination at read layer | Read service |
| Return projection DTOs or query results | Read service |

**Forbidden:** Business rule evaluation (lifecycle transitions, pricing, cancellation policy), write operations, cross-tenant queries without scope.

**Module placement:** `server/order/read/services/`, `server/ops/` (existing), `server/analytics/` (existing + order analytics extension).

---

### Projection Repositories

| Responsibility | Owner |
|----------------|-------|
| CRUD on projection store rows | Drizzle repositories per projection |
| Tenant isolation (`restaurantId` on every query) | Repository |
| Idempotent upsert keyed by projection identity | Repository |

**Forbidden:** Aggregate loading, domain event emission, integration calls, business logic beyond denormalization shape.

**Module placement:** `server/order/read/infrastructure/persistence/`, context-specific `*/read/infrastructure/`.

---

### Projection Store

| Responsibility | Owner |
|----------------|-------|
| Materialized read-optimized data | Dedicated read tables / rollups |
| Denormalized fields for query performance | Projection schema |
| Version / `projectionVersion` metadata per row or table | Schema contract |

**Forbidden:** Being authoritative for order lifecycle — write tables remain SSOT; projections are derived.

**Traceability:** Constitution principle 2–3; ADR-ARCH-002.

---

### Projection Consumers

| Responsibility | Owner |
|----------------|-------|
| Subscribe to Order domain events via registry | `OrderProjectionConsumer` implementations |
| Update projection store idempotently | Keyed by `(consumerName, eventId)` per ADR-ARCH-014 |
| Run parallel and isolated from integration consumers | Separate registration class in registry |

**Forbidden:** Notification, session writes, print dispatch, kitchen device I/O — those remain integration consumers.

**Traceability:** Blueprint §13 step "Read Model Projectors"; Principle 9; ADR-ARCH-014 idempotency.

---

## Dependency Direction

```
UI ──────────────────────────────► Read API
Read API ────────────────────────► Query Application Services
Query Application Services ─────► Read Services
Read Services ───────────────────► Projection Repositories
Projection Repositories ─────────► Projection Store

Projection Consumers ────────────► Projection Repositories
Projection Consumers ◄─────────── Publisher ← Relay ← Outbox ← Aggregate (write path)

Integration Consumers ◄────────── Same event bus (no read path dependency)

Read Services ──X──► Order Aggregate
Read Services ──X──► Domain Policies
Projection Consumers ──X──► UI
UI ──X──► db.ts / write tables (except transitional migration — RA-08)
```

---

## Ownership Boundaries

| Bounded Context | Read Ownership |
|-----------------|----------------|
| **Order** | Owner order list, detail, timeline, public status, order analytics facts |
| **Operations** | Dashboard overview, tables board, action center, activity feed |
| **Session** | Session workspace composite (references order projections) |
| **Settlement** | Settlement summary, breakdown, trend (existing — certified pattern) |
| **Kitchen** | Kitchen queue projection (future — KITCHEN-DISPLAY-1) |
| **Printing** | Print job queue projection (future — PRINTING-1) |
| **Notifications** | Notification inbox (existing — not order projection) |
| **Commercial** | Admin commercial analytics (existing — out of restaurant ops scope) |

---

## Relationship to Certified Write Path

| Concern | Write Side | Read Side |
|---------|------------|-----------|
| Order lifecycle authority | Order Aggregate | Projections display persisted outcomes |
| Event emission | Outbox in same transaction as aggregate | Projection consumers after delivery |
| Consistency | Strong within aggregate commit | Eventual for projections (ADR-ARCH-014) |
| Guest tracking | N/A | `PublicOrderStatus` projection |
| Owner operations | Commands via application services | Queries via read services only |

---

## One Production Path per Capability

| Capability | Read production path |
|------------|---------------------|
| Owner active orders | `order.read.listActive` → Active Orders Projection |
| Owner order detail | `order.read.getDetail` → Order Details Projection |
| Owner order KPIs | `order.read.getOperationalKpis` → Operational KPI Projection |
| Order analytics / reports | `order.read.getAnalyticsSummary` → Analytics Projection |
| Guest order status | `order.getPublicStatus` → Public Order Status Projection |
| Dashboard ops snapshot | `ops.getRestaurantOverview` → Dashboard Projection (extended) |
| Kitchen queue | `kitchen.read.getQueue` → Kitchen Queue Projection |
| Print queue | `printing.read.getQueue` → Printing Queue Projection |
| Settlement | `ops.getSettlement*` → Settlement Projection (existing) |

**Deprecated (migration target):** `order.list` → `getOrdersWithItemsByRestaurant` (ORDERS-READ-MODEL-1 GAP-R01, GAP-R04).

---

## Architectural Boundaries (Forbidden Patterns)

Per Blueprint §13 and investigation findings:

1. Router → `db.ts` SELECT for owner operational UI (current — to be retired).
2. Dashboard → `buildOrderStatistics` or any client revenue/count aggregation.
3. Read service → `DrizzleOrderRepository.findById` for UI lists.
4. Projection consumer → call integration consumer.
5. Integration consumer → update projection store (separation of concerns).
6. Multiple competing queries for the same KPI definition.

---

## Module Topology (Target)

```
server/
├── order/
│   ├── domain/              (write — certified)
│   ├── application/         (write — certified)
│   ├── infrastructure/      (write + event bus — certified)
│   └── read/                (NEW — read reference root)
│       ├── application/     Query application services
│       ├── services/        Read services
│       ├── projections/     Projection consumer definitions
│       └── infrastructure/
│           └── persistence/ Projection repositories
├── ops/                     (existing — ops read models)
├── analytics/               (existing settlement + order analytics extension)
├── kitchen/read/            (future — KITCHEN-DISPLAY-1)
└── printing/read/           (future — PRINTING-1)
```

---

## Compliance with Design Quality Requirements

| Requirement | How architecture satisfies |
|-------------|---------------------------|
| Order-Centric | All order projections derive from Order domain events |
| Event-Driven | Projection refresh via certified outbox pipeline |
| Query-First | Purpose-built queries per RA-03 |
| Projection-Based | No UI reads of raw write tables post-migration |
| Tenant-Isolated | `restaurantId` on every query and projection row |
| Horizontally Scalable | Bounded payloads, pagination, tenant-scoped stores (RA-09) |
| Observable | `generatedAt`, projection version, consumer metrics |
| Maintainable | One owner per projection (RA-06) |
| Testable | Read services testable against projection fixtures |

---

## References

- [Order-Centric Blueprint §11](../../blueprints/Order-Centric-Architecture.md)
- [ORDERS-READ-MODEL-1 Investigation](../ORDERS-READ-MODEL-1/investigation/RM-01-read-architecture-audit.md)
- [ORDERS-WORKSPACE-1 Investigation](../ORDERS-WORKSPACE-1/investigation/INV-11-boundary-compliance.md)
- [ADR-ARCH-006](../../adrs/ADR-ARCH-006.md), [ADR-ARCH-009](../../adrs/ADR-ARCH-009.md), [ADR-ARCH-014](../../adrs/ADR-ARCH-014.md)
