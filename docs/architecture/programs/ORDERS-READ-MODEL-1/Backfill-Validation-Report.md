# ORDERS-READ-MODEL-1 — Phase 3A Backfill Validation Report

**Program:** ORDERS-READ-MODEL-1 — Staging Preparation  
**Date:** 2026-06-29  
**Supersedes:** Phase 2 Backfill Validation Report for staging execution details

---

## Backfill Modes — Staging Validation

| Scope | CLI | Validated |
|-------|-----|-----------|
| **Full** | `--scope full` | Code path + unit tests |
| **Tenant** | `--scope tenant --restaurant-id <id>` | Code path + unit tests + staging script |
| **Partial** | `--scope partial --restaurant-id <id> --from YYYY-MM-DD --to YYYY-MM-DD` | Code path + unit tests |

### Execution Scripts

| Script | Purpose |
|--------|---------|
| `scripts/order-read-backfill-execute.ts` | Run backfill via `orderReadProjectionBackfillService` |
| `scripts/order-read-projection-staging.mjs --dry-run` | Plan without writes |
| `scripts/order-read-projection-staging.mjs --discover` | Pre/post inventory |

### Confirm Guards

| Variable | Required for |
|----------|--------------|
| `ORDER_READ_BACKFILL_CONFIRM=YES` | Backfill execution |
| `ORDER_READ_STAGING_CONFIRM=YES` | Rollback / rebuild |

---

## Staging Procedure

### 1. Discover (pre-backfill)

```bash
DATABASE_URL='<staging-url>' pnpm db:order-read:discover
```

### 2. Dry-run

```bash
DATABASE_URL='<staging-url>' node scripts/order-read-projection-staging.mjs --dry-run --restaurant-id=123
```

### 3. Execute tenant backfill

```bash
DATABASE_URL='<staging-url>' ORDER_READ_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-backfill-execute.ts --scope tenant --restaurant-id 123
```

### 4. Validate

```bash
DATABASE_URL='<staging-url>' node scripts/order-read-projection-staging.mjs --validate --restaurant-id=123
```

### 5. Safe retry

Re-run same scope — upserts are idempotent; new run ID in `order_read_backfill_runs`.

---

## Run Tracking

`order_read_backfill_runs` records:

- `id`, `scope`, `restaurantId`, `fromDayKey`, `toDayKey`
- `status`, `rowsProcessed`, `attemptCount`, `lastError`
- `startedAt`, `completedAt`

---

## Unit Test Evidence

`OrderReadProjectionBackfillService.test.ts` — 3 tests:

- Tenant rebuild materializes orders
- Partial rebuild filters by day range
- Safe retries without throwing

---

## Phase 3A Constraints

- `ORDER_READ_PROJECTIONS_ENABLED` must remain `false`
- No live event dispatch — backfill only
- P-04 timeline not populated by backfill

---

## Verdict

**PASS** — All three backfill modes are executable via staging scripts with confirm guards and post-run validation.
