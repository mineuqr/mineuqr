# ORDERS-READ-MODEL-1 Phase 3B — Operational Readiness

**Date:** 2026-06-29

---

## Read Platform Status

| Capability | Status | Notes |
|------------|--------|-------|
| Event-driven projection dispatch | **ACTIVE** | Composite delegate wired |
| `order_read_*` persistence | **POPULATED** | 206 orders backfilled |
| Integrity validation tooling | **PASS** | `db:order-read:validate` |
| Backfill tooling | **OPERATIONAL** | `db:order-read:backfill` |
| Ops telemetry | **ACTIVE** | backfill + projection consumer events |
| Lifecycle catalog | **queryable** | P-01–P-06, P-10, P-11 |

---

## Downstream Program Readiness

| Program | Readiness | Blocker |
|---------|-----------|---------|
| **ORDERS-WORKSPACE-1** | **Approaching** | Shadow read APIs (Q-01–Q-04) not yet wired to production routers |
| **KITCHEN-DISPLAY-1** | **Not ready** | P-07 not implemented |
| **PRINTING-1** | **Not ready** | P-08 not implemented |
| **Analytics dashboards** | **Partial** | P-10 materialized; query path TBD |

---

## Operational Procedures

| Task | Command |
|------|---------|
| Schema verify | `pnpm db:order-read:verify-schema` |
| Inventory | `pnpm db:order-read:discover` |
| Full backfill | `pnpm db:order-read:backfill` |
| Integrity audit | `pnpm db:order-read:validate` |
| Disable projections | `ORDER_READ_PROJECTIONS_ENABLED=false` |
| Tenant rebuild | `ORDER_READ_STAGING_CONFIRM=YES node scripts/order-read-projection-staging.mjs --rebuild-tenant --restaurant-id=N` |

---

## Monitoring

| Signal | Source |
|--------|--------|
| `order_read_backfill_started/completed/failed` | opsLog |
| `order_projection_consumer_executed/failed/skipped` | opsLog (on live events) |
| Projection vs write drift | `db:order-read:discover` |

---

## Verdict

**Read Platform operationally ready** for projection maintenance and validation. **Read API exposure** remains the next gated step (ORDERS-WORKSPACE-1 / shadow queries).
