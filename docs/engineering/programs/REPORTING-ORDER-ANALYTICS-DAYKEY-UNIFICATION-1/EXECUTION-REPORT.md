# REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1 — Execution Report

**Date:** 2026-07-19  
**Target:** remote TiDB Cloud via `.env` `DATABASE_URL`  
**Kind:** `business_day_rollup` (existing confirm-gated CLI)

---

## 1. Canary

```bash
ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-business-day-rollup-backfill-execute.ts \
    --scope tenant --restaurant-id 720007
```

| Field | Value |
|-------|-------|
| runId | `81eda14e-ff21-471f-a26c-6474fb205d67` |
| status | completed |
| ordersScanned | 295 |
| dayKeysWritten | 34 |
| lastError | null |

### Post-canary reconciliation (720007)

| Metric | P-10 / Dashboard | Write (createdAt BD) |
|--------|------------------|----------------------|
| Today Orders | 3 | 3 |
| Today Completed | 3 | 3 |
| Today Order Sales | 50.00 | 50.00 |
| Month Orders | 89 | 89 |
| Month Completed | 82 | 82 |
| Month Order Sales | 3808.00 | 3808.00 |
| Check Revenue today | 50.00 | — |
| Invariant breaks (recent 5 days) | 0 | — |

Pre-unification (same tenant, earlier forensics): Today Orders **1**, Sales **80.00**, `completedOrderCount` **4** > `orderCount` **1**.

---

## 2. Full fleet

```bash
ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-business-day-rollup-backfill-execute.ts --scope full
```

| Field | Value |
|-------|-------|
| runId | `2ebc057c-9078-4b38-b1e9-eb410b42cd85` |
| status | completed |
| restaurantsProcessed | 6 |
| ordersScanned | 295 |
| dayKeysWritten | 34 |
| lastError | null |

Empty tenants scanned 0 orders / 0 dayKeys. Active analytics tenant: `720007` only.

---

## 3. Notes

- Rebuild is delete-then-upsert per restaurant (idempotent).  
- Code unification landed **before** these runs so rebuild and future incremental share creation-day ownership.  
- No Check / Settlement / Payment data rewritten.
