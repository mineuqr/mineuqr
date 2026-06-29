# ORDERS-READ-MODEL-1 — Phase 3A Projection Integrity Report

**Program:** ORDERS-READ-MODEL-1 — Staging Preparation  
**Date:** 2026-06-29

---

## Integrity Model

Projections must match the **write model** (`orders`, `order_items`) for materialized fields after backfill.

### Compared Fields (per order)

| Field | Write table | Projection table |
|-------|-------------|------------------|
| `orderNumber` | `orders` | `order_read_orders` |
| `status` | `orders` | `order_read_orders` |
| `totalAmount` | `orders` | `order_read_orders` (decimal normalized) |
| `tableNumber` | `orders` | `order_read_orders` |
| `trackingToken` | `orders` | `order_read_orders` / `order_read_public_order_status` |

### Count Parity

Per `restaurantId`:

```
COUNT(orders WHERE restaurantId = X) = COUNT(order_read_orders WHERE restaurantId = X)
```

---

## Implementation

| Artifact | Path |
|----------|------|
| Integrity checker (TS) | `server/order/read/infrastructure/staging/OrderReadProjectionIntegrityChecker.ts` |
| Staging validation script | `scripts/order-read-projection-staging.mjs --validate` |
| Unit tests | `server/order/read/infrastructure/staging/__tests__/OrderReadProjectionIntegrityChecker.test.ts` |

### Mismatch Types

| Type | Meaning |
|------|---------|
| `count_mismatch` | Order count differs per restaurant |
| `missing_projection` | Write order has no projection row |
| `field_mismatch` | Field value differs |
| `tenant_leak` | Projection `restaurantId` ≠ write `restaurantId` |

---

## Known Backfill Coverage Limits

| Projection | Post-backfill state | Integrity check |
|------------|---------------------|-----------------|
| P-01/P-02/P-03 | Populated | Full field compare |
| P-06/P-10 | Rebuilt from owner rows | Count/rollup sanity via discover |
| P-04 timeline | **Empty** (requires live events) | Excluded from order-row compare |
| P-11 | Populated when `trackingToken` present | Included in order sync |

KPI/analytics from `rebuildRollupsForRestaurant` reflect **current order status snapshot**, not historical event replay.

---

## Staging Validation Command

```bash
DATABASE_URL='<staging-url>' pnpm db:order-read:validate
# Tenant-scoped:
DATABASE_URL='<staging-url>' node scripts/order-read-projection-staging.mjs --validate --restaurant-id=123
```

Exit code 0 = no mismatches in sampled rows (up to 5000 orders).

---

## Test Evidence

6 unit tests cover count mismatch, missing projection, field mismatch, decimal normalization, tenant leak, and summary aggregation.

---

## Verdict

Integrity audit tooling is **implemented and tested**. Staging operators run `--validate` after backfill to confirm write/projection alignment.
