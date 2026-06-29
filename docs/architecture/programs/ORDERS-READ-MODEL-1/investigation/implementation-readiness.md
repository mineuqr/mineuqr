# Implementation Readiness

**Program:** ORDERS-READ-MODEL-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26

---

## 1. Is the Read Side architecturally ready for implementation?

# NO

The Write Side (Order aggregate, application services, outbox, relay, consumers) is certified and production-ready. The **Read Side is not architecturally ready** for implementation of order-centric workspace, kitchen, or printing programs.

Settlement and session **ops read modules** (`server/ops/`, `server/analytics/settlementMetrics.ts`) demonstrate the target pattern but **do not cover order operational reads or analytics**.

---

## 2. Blockers

### BLOCK-R01 — No Order Read Model Module (Critical)

**Missing architecture:** `server/order/read/` or equivalent query facade with:
- Owner active orders projection
- Order detail read DTO
- Order analytics aggregations

**Evidence:** `order.list` → `db.ts` only; no read services in `server/order/`.

**ADRs:** ADR-ARCH-009 (Not implemented)

---

### BLOCK-R02 — Client KPI Authority (Critical)

**Missing:** Server endpoints for today/month order metrics replacing `buildOrderStatistics`.

**Evidence:** ADR-Registry — ADR-ARCH-006 "Not implemented"

**ADRs:** ADR-ARCH-006, ADR-ARCH-002

---

### BLOCK-R03 — No Event-to-Projection Pipeline for Orders (High)

**Missing:** Read model updater (consumer or projector) materializing order views from domain events.

**Evidence:** Consumers perform integration only; no projection tables.

**ADRs:** ADR-ARCH-004, ADR-ARCH-012

---

### BLOCK-R04 — Kitchen Queue Read Model (High)

**Missing:** Kitchen queue projection + query API for KITCHEN-DISPLAY-1.

**ADRs:** ADR-ARCH-012

---

### BLOCK-R05 — Print Queue Read Model (High)

**Missing:** Print job store + queue read API for PRINTING-1 / PRINT-WORKSPACE-1.

**ADRs:** ADR-ARCH-012

---

### BLOCK-R06 — Read/Write Separation in Code (Medium)

**Missing:** Extract order reads from legacy `db.ts` into dedicated read repositories.

**Evidence:** Shared module `db.ts` lines 1020–1187

---

## Missing Architecture (Summary)

| Artifact | Status |
|----------|--------|
| OrderQueryFacade / ReadService | **Missing** |
| OwnerActiveOrdersProjection | **Missing** |
| OrderAnalyticsProjection | **Missing** |
| OrderDetailReadModel | **Missing** (API exists, unused; still raw DB) |
| KitchenQueueProjection | **Missing** |
| PrintJobQueueProjection | **Missing** |
| Event projector for order reads | **Missing** |
| Read model versioning policy | **Missing** |
| UI subscription / push for reads | **Missing** (polling only) |

---

## Missing ADRs (Implementation Guidance)

| ADR | Status | Required for |
|-----|--------|--------------|
| ADR-ARCH-006 | Ratified, **not implemented** | All owner UI reads |
| ADR-ARCH-009 | Ratified, **not implemented** | Order analytics |
| ADR-ARCH-012 | Ratified, events only | Kitchen, print reads |
| Read model versioning ADR | **Not identified** | Safe rollout |
| Active vs historical order read split | **Not identified** | Operational list scope |

*No new ADR authoring in this investigation — gaps documented for Authority.*

---

## Missing Projections

| Projection | Consumers waiting |
|------------|-------------------|
| Owner active orders list | ORDERS-WORKSPACE-1 |
| Order today/month analytics | ORDERS-WORKSPACE-1, Reports |
| Kitchen preparation queue | KITCHEN-DISPLAY-1 |
| Print job queue | PRINTING-1, PRINT-WORKSPACE-1 |
| Connector status | PRINT-CONNECTOR-1 |

---

## Missing Read Services

| Service | Purpose |
|---------|---------|
| `OrderListReadService` | Active/historical list with filters, pagination |
| `OrderAnalyticsReadService` | KPIs currently in `buildOrderStatistics` |
| `OrderDetailReadService` | Single order operational view |
| `KitchenQueueReadService` | KDS data |
| `PrintQueueReadService` | Print workspace data |

---

## What Exists (Foundation to Build On)

| Asset | Reuse potential |
|-------|-----------------|
| `server/ops/*` read module pattern | Template for order ops reads |
| `settlementMetrics.ts` | Template for aggregations |
| `getActiveOrdersCount` | Seed metric — extend, don't duplicate |
| `getOrdersBySessionId` | Session-scoped reads |
| `toPublicOrderStatus` | Public DTO mapper pattern |
| `sessionOwnerWorkspace` | Composite read assembly pattern |
| Domain events + outbox | Projection refresh triggers |
| `DrizzleOrderRepository` | Write path — do not use for UI reads |

---

## Investigation Deliverables

| Document | Status |
|----------|--------|
| RM-01 Read Architecture Audit | ✓ |
| RM-02 Read Flow Audit | ✓ |
| RM-03 Projection Inventory | ✓ |
| RM-04 Query Inventory | ✓ |
| RM-05 KPI Audit | ✓ |
| RM-06 Projection Ownership | ✓ |
| RM-07 Boundary Compliance | ✓ |
| RM-08 Polling & Refresh Audit | ✓ |
| RM-09 Server Aggregation Audit | ✓ |
| RM-10 Read Performance Audit | ✓ |
| RM-11 Scalability Assessment | ✓ |
| RM-12 Future Compatibility | ✓ |
| Architecture Gap Register | ✓ |
| Architecture Risk Register | ✓ |
| Implementation Readiness | ✓ |

---

## Recommended Program Sequence (Architecture Authority)

1. **ORDERS-READ-MODEL-1** — Design + implement order read layer (blocks workspace)
2. **ORDERS-WORKSPACE-1** — UI on server projections (after read model)
3. **PRINTING-1 / KITCHEN-DISPLAY-1** — Domain-specific read projections
4. **PRINT-WORKSPACE-1 / PRINT-CONNECTOR-1** — UI on print read models

---

## Verdict

**Investigation complete. Implementation NOT authorized.**

The Architecture Authority must approve read model design addressing BLOCK-R01 through BLOCK-R05 before any read-side implementation begins.

No source code was modified during this investigation.
