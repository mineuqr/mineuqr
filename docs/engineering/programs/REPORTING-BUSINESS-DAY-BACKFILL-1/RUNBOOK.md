# REPORTING-BUSINESS-DAY-BACKFILL-1 — Runbook

## Prerequisites

- `DATABASE_URL` points at the target environment  
- Restaurant `workingHours` populated where possible (else default 09:00)  
- Prefer off-peak window

## Canary

```bash
DATABASE_URL='...' ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-business-day-rollup-backfill-execute.ts \
    --scope tenant --restaurant-id <ID>
```

Verify Order Sales day/month for that tenant.

## Full fleet

```bash
DATABASE_URL='...' ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM=YES \
  pnpm db:order-read:bd-rollup-backfill
```

## Failure recovery

Re-run the same scope. Rebuild is idempotent (delete + rewrite).  
Inspect `order_read_backfill_runs` and ops logs for `kind: business_day_rollup`.
