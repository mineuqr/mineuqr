# ORDERS-READ-MODEL-1 — Phase 3A Rollback Validation Report

**Program:** ORDERS-READ-MODEL-1 — Staging Preparation  
**Date:** 2026-06-29

---

## Rollback Strategy

Projection store is **additive** — rollback clears projection rows only. Write model (`orders`, `order_items`) is never modified.

Recovery is **idempotent re-backfill** after rollback.

---

## Tenant-Scoped Rollback

### Command

```bash
DATABASE_URL='<staging-url>' ORDER_READ_STAGING_CONFIRM=YES \
  node scripts/order-read-projection-staging.mjs --rollback-tenant --restaurant-id=123
```

### Tables cleared (per `restaurantId`)

| Table | Action |
|-------|--------|
| `order_read_orders` | DELETE WHERE restaurantId = ? |
| `order_read_order_line_items` | DELETE WHERE restaurantId = ? |
| `order_read_order_timeline` | DELETE WHERE restaurantId = ? |
| `order_read_operational_kpi_daily` | DELETE WHERE restaurantId = ? |
| `order_read_analytics_daily` | DELETE WHERE restaurantId = ? |
| `order_read_public_order_status` | DELETE WHERE restaurantId = ? |

**Preserved:** `order_read_backfill_runs` (audit trail)

---

## Tenant Rebuild (Rollback + Backfill)

### Command

```bash
DATABASE_URL='<staging-url>' ORDER_READ_STAGING_CONFIRM=YES \
  node scripts/order-read-projection-staging.mjs --rebuild-tenant --restaurant-id=123
```

### Procedure

1. Tenant rollback (delete projection rows)
2. Tenant backfill (`order-read-backfill-execute.ts --scope tenant`)
3. Integrity validation (`--validate --restaurant-id=123`)

---

## Full Rollback (manual — staging ops)

For complete projection store reset:

```sql
TRUNCATE TABLE order_read_order_line_items;
TRUNCATE TABLE order_read_order_timeline;
TRUNCATE TABLE order_read_public_order_status;
TRUNCATE TABLE order_read_operational_kpi_daily;
TRUNCATE TABLE order_read_analytics_daily;
TRUNCATE TABLE order_read_orders;
-- Optional: TRUNCATE order_read_backfill_runs;
```

Then re-run full backfill:

```bash
ORDER_READ_BACKFILL_CONFIRM=YES npx tsx scripts/order-read-backfill-execute.ts --scope full
```

---

## Migration Rollback

**No down-migration for 0046.** Rollback = drop tables (staging only, with approval):

```sql
DROP TABLE IF EXISTS order_read_backfill_runs;
DROP TABLE IF EXISTS order_read_public_order_status;
DROP TABLE IF EXISTS order_read_analytics_daily;
DROP TABLE IF EXISTS order_read_operational_kpi_daily;
DROP TABLE IF EXISTS order_read_order_timeline;
DROP TABLE IF EXISTS order_read_order_line_items;
DROP TABLE IF EXISTS order_read_orders;
```

Production write path unaffected in all cases.

---

## Guards

| Guard | Enforcement |
|-------|-------------|
| `ORDER_READ_STAGING_CONFIRM=YES` | Required for rollback/rebuild |
| `ORDER_READ_PROJECTIONS_ENABLED=false` | Script assertion |
| Write model untouched | DELETE only on `order_read_*` tables |

---

## Validation

| Procedure | Validated |
|-----------|-----------|
| Tenant rollback deletes projection rows | Script implemented |
| Rebuild restores consistency | `--rebuild-tenant` runs validate after backfill |
| Idempotent re-backfill | Phase 2 unit tests + upsert semantics |

---

## Verdict

Rollback and rebuild procedures are **documented and scripted** for staging. No production impact.
