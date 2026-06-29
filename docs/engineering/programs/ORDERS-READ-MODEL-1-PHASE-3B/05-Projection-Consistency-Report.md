# ORDERS-READ-MODEL-1 Phase 3B — Projection Consistency Report

**Date:** 2026-06-29

---

## Validation Command

```bash
pnpm db:order-read:validate
```

**Result:** `validate OK — no integrity mismatches in sample`

---

## Consistency Checks

| Check | Method | Result |
|-------|--------|--------|
| Per-restaurant order counts | write `orders` vs `order_read_orders` | **Match** (206 = 206) |
| Missing projections | LEFT JOIN sample (5000 rows) | **None** |
| Duplicate projections | PK `(restaurantId, orderId)` | **None** |
| Tenant leak | `restaurantId` alignment | **None** |
| Field parity | `orderNumber`, `status`, `tableNumber`, `trackingToken`, `totalAmount` | **Match** |

---

## Tables Materialized

| Table | Populated |
|-------|-----------|
| `order_read_orders` | ✓ |
| `order_read_order_line_items` | ✓ (via materializer) |
| `order_read_order_timeline` | ✓ |
| `order_read_operational_kpi_daily` | ✓ |
| `order_read_analytics_daily` | ✓ |
| `order_read_public_order_status` | ✓ |
| `order_read_backfill_runs` | ✓ |

---

## Write Model = Read Model

| Dimension | Status |
|-----------|--------|
| Row counts | **Equal** (206) |
| Projection completeness | **100%** in validated sample |
| Aggregate identity | **Aligned** (`orderId` + `restaurantId`) |
| Restaurant ownership | **No cross-tenant leakage** |

---

## Verdict

**Read Model equals Write Model** for validated dimensions.
