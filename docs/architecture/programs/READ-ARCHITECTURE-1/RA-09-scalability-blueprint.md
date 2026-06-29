# RA-09 — Scalability Blueprint

**Program:** READ-ARCHITECTURE-1  
**Type:** Architecture Design (documentation only)  
**Date:** 2026-06-26

---

## Scalability Objectives

Demonstrate architectural support for:

- Thousands of restaurants (multi-tenant SaaS)
- Thousands of concurrent active orders (platform-wide)
- Operational workspaces, dashboards, analytics, kitchen display, print workspace

**Investigation basis:** ORDERS-READ-MODEL-1 RM-11; ORDERS-READ-MODEL-1 RM-10.

---

## Architectural Scaling Principles

### SP-01: Tenant Isolation First

Every projection row and query filter includes `restaurantId`. No cross-tenant scans in owner APIs. Authorization enforced at query application service layer before read service invocation.

**Supports:** Thousands of restaurants with independent data volume.

---

### SP-02: Bounded Operational Payloads

Active operational UI reads **P-02 Active Orders** (Q-01) — not full history. Default page size 50, max 100. Historical reads (Q-02) require date range for large tenants.

**Addresses:** ORDERS-READ-MODEL-1 BOT-01, PERF-05 — unbounded `order.list`.

---

### SP-03: Eliminate N+1 at Read Layer

Projection store denormalizes line items into active order documents or child projection table queried in single round-trip per page.

**Addresses:** `getOrdersWithItemsByRestaurant` N+1 pattern (RM-10 PERF-01).

---

### SP-04: Pre-Aggregated Analytics

P-10 maintains daily facts and rollups incrementally on `OrderCompleted` — reports do not scan all orders at query time.

**Addresses:** Client `buildMonthlyReport` O(n×days) (RM-10 PERF-07).

---

### SP-05: Separate Hot and Cold Paths

| Path | Data | Access pattern |
|------|------|----------------|
| Hot | P-02 active orders, P-07 kitchen queue | High frequency poll / push |
| Warm | P-06 KPIs, P-05 dashboard | Moderate poll |
| Cold | P-01 history, P-10 rollups | Date-bounded, lower frequency |

---

### SP-06: Event-Driven Incremental Updates

Projection consumers update only affected rows per event — not full restaurant recompute.

**Supports:** Thousands of concurrent orders without full-list refresh per status change.

---

### SP-07: Horizontal Read Scaling (Future-Ready)

Architecture permits:
- Read replicas for projection store queries
- Separate projection database (future)
- In-process today; boundary at projection repository enables extraction

**No implementation in this program** — boundary design only.

---

### SP-08: Observable Load Characteristics

Every query DTO includes `generatedAt`. Consumer metrics via existing `EventConsumerMetrics`. Ops telemetry for projection lag (extension to ORDER-EVENTS-1B patterns).

---

## Workload Scaling Analysis

### Thousands of Restaurants

| Factor | Design response |
|--------|-----------------|
| Tenant count | Queries scoped by `restaurantId`; no platform-wide owner scans |
| Noisy neighbor | Per-tenant pagination; rate limits at API gateway (future) |
| Onboarding | Empty projections — no backfill of other tenants |

**Verdict:** **Supported** — standard multi-tenant SaaS pattern.

---

### Thousands of Concurrent Orders

| Factor | Legacy (current) | Target read architecture |
|--------|------------------|--------------------------|
| List fetch | All orders + N+1 items | Active page only |
| Poll cost | Grows with history | Grows with active count (bounded) |
| Status update | Full list refetch | Invalidate active page + KPI |
| DB write load | Certified aggregate | Unchanged |
| Projection write | None | O(1) per event per projection consumer |

**Verdict:** **Supported** with P-02 + Q-01; **not supported** with legacy `order.list`.

---

### Operational Workspaces (ORDERS-WORKSPACE-1)

| Need | Scaling mechanism |
|------|-------------------|
| Live order board | Q-01 paginated |
| Status actions | Write path certified; read invalidation |
| Session drill-down | Q-40 composes session + order details — no full restaurant list |
| Multi-operator | Optimistic concurrency on write (ADR-ARCH-011); read shows latest projection |

**Verdict:** **Supported** post-migration.

---

### Dashboards

| Widget | Query | Scale |
|--------|-------|-------|
| Ops overview | Q-10 | O(1) aggregates |
| Order KPIs | Q-05 | O(1) counters |
| Activity feed | Q-14 | Bounded limit |
| Settlement | Q-13–15 | Date-filtered |

**Verdict:** **Supported** — ops/settlement already scale; order KPIs move to P-06.

---

### Analytics

| Need | Mechanism |
|------|-----------|
| Today/month cards | P-10 pre-aggregated |
| Excel export | Q-07 rollup — server generated |
| Historical years | Date-partitioned fact rows |

**Verdict:** **Supported** via P-10; replaces client builders.

---

### Kitchen Display (KITCHEN-DISPLAY-1)

| Need | Mechanism |
|------|-----------|
| Prep queue | P-07 — active tickets only |
| Real-time | Event-driven + 3–5s poll or future push |
| Volume | Bounded to in-kitchen statuses |

**Verdict:** **Supported** by design; **not available** until Phase 5 (RA-08).

---

### Print Workspace (PRINTING-1)

| Need | Mechanism |
|------|-----------|
| Job queue | P-08 paginated |
| Retry state | Job projection rows |
| Connector status | Q-31 separate store |

**Verdict:** **Supported** by design; **not available** until Phase 5.

---

## Bottleneck Retirement Map

| Investigation bottleneck | Retired by |
|--------------------------|------------|
| BOT-01 full list scan | SP-02, Q-01 |
| BOT-02 client KPIs | SP-04, P-10, Q-05/Q-06 |
| BOT-03 no projections | SP-06, projection consumers |
| BOT-04 polling only | SP-06 + RA-07 transitional poll on projections |
| BOT-05 shared db.ts | RA-01 module split |
| BOT-06 no kitchen/print read | P-07, P-08 |

---

## Capacity Planning Guidelines (Architecture)

| Metric | Planning assumption |
|--------|---------------------|
| Active orders per restaurant (peak) | Design for 200 active; paginate at 50 |
| Historical orders per restaurant | Millions in cold store; date-range queries only |
| Projection consumers per event | ~8 order projections × parallel dispatch |
| Poll requests per owner session | ~6 queries / 10s → retarget to smaller payloads |
| Event throughput | In-process registry today; message broker future option per Blueprint |

---

## References

- ORDERS-READ-MODEL-1 RM-11 Scalability Assessment
- ORDERS-READ-MODEL-1 RM-10 Read Performance Audit
- Constitution Quality Attributes — Scalability
