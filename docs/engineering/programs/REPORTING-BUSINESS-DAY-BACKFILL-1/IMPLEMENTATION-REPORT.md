# REPORTING-BUSINESS-DAY-BACKFILL-1 — Implementation Report

## Final status

**Ready for independent architecture review.**  
Tooling and rebuild path are production-ready. Execute the confirm-gated CLI against production/staging databases to apply historical data migration.

---

## 1. Repository investigation

| Artifact | Persists dayKey? | Disposition |
|----------|------------------|-------------|
| `order_read_analytics_daily` (P-10) | Yes | **Rebuilt** |
| `order_read_operational_kpi_daily` (P-06) | Yes | **Rebuilt** |
| Check Revenue / Tax trends | No (on-the-fly) | N/A — ADOPTION-1 |
| Payment Method Analytics | No (on-the-fly) | N/A |
| Comparison baselines | No (on-the-fly) | N/A |
| `orders.businessDay` / identity | Identity BD | Out of scope (already BD) |

---

## 2. Historical dataset inventory

Only Order Read daily rollups required rebuild:

- `order_read_analytics_daily.dayKey`
- `order_read_operational_kpi_daily.dayKey`

Pre-ADOPTION rows may use UTC `ts.slice(0,10)` or wall-midnight keys. Month `LIKE 'YYYY-MM%'` queries double-count when orphan keys remain after upsert-only rebuilds.

---

## 3. Rollup rebuild strategy

```
listOrderIdsForRestaurant (all orders)
  → loadByOrderId
  → dayKeyFromTimestamp(createdAt, restaurantHours)  // resolveBusinessDayKey
  → aggregate P-06 / P-10 in memory
  → DELETE all daily rows for restaurant
  → UPSERT BD-keyed rows
```

Fixes vs prior path:

1. **No `findPage` / 100-order clamp** — full write-model scan  
2. **Delete-before-upsert** — stale UTC/wall keys removed  
3. **Hours from** `restaurantOpeningTimeResolver` (Identity SSOT)

---

## 4. Backfill execution

```bash
# All restaurants
DATABASE_URL='...' ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  pnpm db:order-read:bd-rollup-backfill

# Single tenant
DATABASE_URL='...' ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-business-day-rollup-backfill-execute.ts \
    --scope tenant --restaurant-id 123
```

- Confirm gate: `ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES`  
- Progress / failures: ops events `order_read_backfill_*` with `kind: business_day_rollup`  
- Run rows: `order_read_backfill_runs` (summary in `lastError`)  
- Idempotent: re-run replaces the same BD set  
- Restart-safe: failed tenant can be re-run with `--scope tenant`

Does **not** call `syncOrderProjections` (rollup-only).

---

## 5. Files modified

**Added**

- `OrderReadBusinessDayRollupBackfillService.ts`
- `scripts/order-read-business-day-rollup-backfill-execute.ts`
- Rebuild + service tests, architecture guards
- This program docs folder

**Modified**

- `OrderReadProjectionMaterializer.rebuildRollupsForRestaurant` — full scan + delete-replace  
- Projection repo contracts / in-memory / Drizzle / persisting decorator — `deleteAllForRestaurant`  
- `readPersistenceComposition.ts`, `package.json`

---

## 6. Rebuilt datasets

| Dataset | Rebuild |
|---------|---------|
| P-10 Order Analytics daily | Yes |
| P-06 Operational KPI daily | Yes |

---

## 7. Validation results

| Check | Result |
|-------|--------|
| Stale dayKey removed | Unit test |
| >100 orders scanned | Unit test |
| Idempotent re-run | Unit test |
| Revenue formula unchanged | Architecture guard |
| Rollup-only (no order sync) | Architecture guard |
| Tests / `pnpm build` | **Pass** |

---

## 8. Financial reconciliation

| Domain | Changed? |
|--------|----------|
| Revenue / Tax formulas | No |
| Settlement / Payment analytics | No (on-the-fly filters) |
| KPI calculation versions | No |
| Only dayKey membership / rollup counters | Yes (intended) |

Order Sales month totals may change vs pre-backfill if orphans or mis-keyed UTC rows previously inflated `LIKE` aggregates — that is correctness, not formula drift.

---

## 9. Risks discovered

1. Missing `workingHours` → default 09:00 open during rebuild.  
2. Delete-then-upsert is not a single DB transaction; a crash mid-upsert leaves partial days until re-run (restart-safe via re-run).  
3. Live incremental adjusters may race during long full backfill — prefer off-peak or tenant batches.

---

## 10. Recommendations

1. Run `--scope tenant` on a canary restaurant; spot-check Order Sales day/month.  
2. Then `pnpm db:order-read:bd-rollup-backfill` for full fleet.  
3. Keep `workingHours` populated in restaurant settings.

---

## 11. Final implementation status

| Gate | Result |
|------|--------|
| Rebuild path complete | Yes |
| Ops CLI + confirm gate | Yes |
| No formula / API / DTO changes | Yes |
| Ready for architecture review | **Yes** |
| Production data applied | **Operator must run CLI** |
