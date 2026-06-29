# ORDERS-READ-MODEL-1 — Phase 3A Projection Consistency Report

**Program:** ORDERS-READ-MODEL-1 — Staging Preparation  
**Date:** 2026-06-29

---

## Consistency Dimensions

| Dimension | Mechanism | Staging validation |
|-----------|-----------|-------------------|
| **Write ↔ projection row parity** | `compareOrderRow()` | `--validate` |
| **Per-tenant order counts** | `compareOrderCounts()` | `--validate` |
| **Tenant isolation** | PK includes `restaurantId`; leak detection | `--validate` |
| **Idempotent re-backfill** | Upsert semantics | Re-run tenant scope |
| **Decimal normalization** | `totalAmount` compared as fixed 2-decimal | Unit test |
| **Rollup consistency** | `rebuildRollupsForRestaurant` after order sync | Post-backfill discover |

---

## Consistency Rules

### Order projections (P-01/P-02/P-03)

After tenant backfill, for each order in `orders`:

1. Row exists in `order_read_orders` with matching `(restaurantId, orderId)`
2. `isActive` reflects current status (`pending|preparing|ready` = active)
3. Line items in `order_read_order_line_items` match write `order_items` count

### Public status (P-11)

When `trackingToken` is set, row exists in `order_read_public_order_status` keyed by `(trackingToken, restaurantSlug)`.

### KPI / Analytics (P-06/P-10)

Rebuilt from materialized owner rows — consistent with **current** order states, not event history.

### Timeline (P-04)

**Not consistent after backfill-only** — requires live dispatch (Phase 3B+). Document as expected empty state.

---

## Validation SQL (manual spot-check)

```sql
-- Count parity
SELECT o.restaurantId, COUNT(*) AS writeCount,
  (SELECT COUNT(*) FROM order_read_orders p WHERE p.restaurantId = o.restaurantId) AS projCount
FROM orders o GROUP BY o.restaurantId HAVING writeCount != projCount;

-- Field sample
SELECT o.id, o.status, p.status
FROM orders o
LEFT JOIN order_read_orders p ON p.restaurantId = o.restaurantId AND p.orderId = o.id
WHERE p.orderId IS NULL OR o.status != p.status
LIMIT 20;
```

Automated equivalent: `pnpm db:order-read:validate`

---

## Test Coverage

| Test | Consistency aspect |
|------|-------------------|
| `OrderReadProjectionIntegrityChecker.test.ts` | Row compare, counts, tenant leak, decimals |
| `OrderReadProjectionBackfillService.test.ts` | Materialization + partial filter |
| `InMemoryOrderReadProjectionStore.test.ts` | Repository view consistency P-01→P-02/P-03 |

---

## Verdict

Consistency validation is **automated for order-level projections** via staging scripts. Timeline consistency deferred until dispatch activation.
