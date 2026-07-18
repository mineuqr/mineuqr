# REPORTING-BUSINESS-DAY-BACKFILL-1 — Production Execution Report

**Date:** 2026-07-18  
**Operator:** Cursor agent (execution-only; no source changes)  
**Target:** remote TiDB Cloud (`*.tidbcloud.com`) via `.env` `DATABASE_URL`  
**Branch:** `main` (clean, up to date with `origin/main`)  
**HEAD:** `f66f5a0` — feat(reporting): adopt canonical business day reporting architecture  

---

## Pre-flight

| Check | Result |
|-------|--------|
| Production-ready branch | `main` @ `origin/main` |
| Uncommitted changes | None (clean working tree) |
| `pnpm build` | Passed |
| `DATABASE_URL` configured | Yes (remote TiDB Cloud; loaded from `.env`) |
| Runbook read | `docs/engineering/programs/REPORTING-BUSINESS-DAY-BACKFILL-1/RUNBOOK.md` |
| Discover inventory | 6 restaurants; 289 write orders; 289 projection orders |

---

## 1. Commands executed

### Canary (tenant)

```bash
ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-business-day-rollup-backfill-execute.ts \
    --scope tenant --restaurant-id 720007
```

(`DATABASE_URL` supplied by `.env` / dotenv)

### Global (full fleet)

```bash
ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  pnpm db:order-read:bd-rollup-backfill
```

---

## 2. Canary validation

**Restaurant:** `720007` (only tenant with orders/rollups)

| Metric | Baseline (pre) | Post-canary | Result |
|--------|----------------|-------------|--------|
| Paid check revenue | 458.00 | 458.00 | Unchanged |
| Tax collected | 45.00 | 45.00 | Unchanged |
| Paid checks | 8 | 8 | Unchanged |
| Settlement total (captured) | 326.60 | 326.60 | Unchanged |
| Settlement txn count | 4 | 4 | Unchanged |
| Payment method analytics | other = 326.60 (4) | same | Unchanged |
| Analytics `orderCount` sum | 160 (incomplete) | **289** | Rebuilt to full write set |
| Analytics `completedSales` sum | 5031.00 | **6726.00** | Matches write served sales |
| Analytics dayKeys | 25 | **33** | BD-keyed set |
| KPI dayKeys | 25 | **33** | Aligns with analytics |
| BD parity vs write model | n/a | **0 diffs** | Pass (stored UTC timestamps) |

**Canary run record**

| Field | Value |
|-------|-------|
| runId | `5e5f76e9-71f8-4a1b-a42c-9e1ec629ab01` |
| status | `completed` |
| restaurantsProcessed | 1 |
| ordersScanned | 289 |
| dayKeysWritten | 33 |
| lastError | null |
| Approx. duration | ~3m 22s (20:44:46Z → 20:48:09Z) |

**Presentation note:** Dashboard / Excel / PDF share the same Order Sales rollup DTOs and reporting ranges. Rollup SSOT now matches write-model Business Day bucketing for this tenant; no formula or API changes were made.

**STOP gate:** Canary financials unchanged + BD dayKey parity passed → proceeded to global.

---

## 3. Production execution summary (global)

| Field | Value |
|-------|-------|
| runId | `92b66678-2947-4ca0-ab5f-c72d5a0924e8` |
| scope | `full` |
| status | `completed` |
| restaurantsProcessed | **6** |
| ordersScanned | **289** |
| dayKeysWritten | **33** |
| lastError | null |
| Approx. duration | ~3m 13s (21:04:16Z → 21:07:29Z) |

---

## 4. Restaurants processed

| restaurantId | ordersScanned | dayKeysWritten |
|--------------|---------------|----------------|
| 720006 | 0 | 0 |
| 720002 | 0 | 0 |
| 720007 | 289 | 33 |
| 900001 | 0 | 0 |
| 870001 | 0 | 0 |
| 780001 | 0 | 0 |

---

## 5. Rollups rebuilt

| Dataset | Result |
|---------|--------|
| `order_read_analytics_daily` (P-10) | Rebuilt for 720007 (33 BD dayKeys); empty for others |
| `order_read_operational_kpi_daily` (P-06) | Same dayKey set as analytics |

Pre-backfill analytics covered only 160/289 orders (legacy rebuild clamp). Post-backfill covers **289/289**.

---

## 6. Validation results

| Requirement | Result |
|-------------|--------|
| Revenue unchanged | **Pass** (458.00) |
| Tax unchanged | **Pass** (45.00) |
| Settlement unchanged | **Pass** (326.60 / 4 txns) |
| Payment analytics unchanged | **Pass** (other = 326.60) |
| Historical Order Sales rollups rebuilt | **Pass** (289 orders, 33 BD days) |
| Business Day dayKeys present / parity | **Pass** (0 diffs vs canonical BD) |
| Dashboard = Excel = PDF (shared rollup SSOT) | **Pass** (same DTOs; rollup parity verified) |

---

## 7. Warnings

1. First global attempt via `Tee-Object` to a locked log file failed immediately (`ELAPSED_MS=1141`); retried successfully with a new log path.  
2. Empty restaurants (5) produce 0 dayKeys — expected.  
3. UI pixel-compare of Dashboard/Excel/PDF was not run; validation is via shared SSOT + financial/rollup parity.

---

## 8. Failures

None on canary or successful global run.  
`lastError` null for both completed runs.

---

## 9. Final production status

**PRODUCTION BACKFILL COMPLETED SUCCESSFULLY.**

Historical Order Read daily rollups are aligned with the canonical Business Day architecture on the configured remote database. Financial SSOTs (Revenue / Tax / Settlement / Payment analytics) were unchanged for the data-bearing canary tenant.
