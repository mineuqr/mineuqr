# ORDERS-READ-MODEL-1 — Phase 3A Staging Deployment Report

**Program:** ORDERS-READ-MODEL-1 — Staging Preparation (Phase 3A)  
**Date:** 2026-06-29  
**Environment:** Staging validation tooling (no production activation)

---

## Scope

Phase 3A delivers **staging operations tooling and validation procedures** for projection store deployment. Production behavior remains unchanged.

| Action | Phase 3A |
|--------|----------|
| Journalize migration 0046 | ✓ |
| Staging schema verify script | ✓ |
| Backfill execution script | ✓ |
| Integrity validation script | ✓ |
| Rollback / rebuild procedures | ✓ |
| Enable `ORDER_READ_PROJECTIONS_ENABLED` | ✗ Blocked |
| Wire publisher to projection dispatch | ✗ Blocked |
| Expose read APIs | ✗ Blocked |

---

## Migration Deployment (Staging)

### Prerequisites

- Staging `DATABASE_URL` with TLS (TiDB Cloud requires secure transport)
- `pnpm db:preflight` — confirm `0046_order_read_projections` in journal (no orphan for 0046)
- Backup staging DB (standard deploy practice)

### Apply Migration

```bash
DATABASE_URL='<staging-url>' pnpm db:preflight
DATABASE_URL='<staging-url>' pnpm db:migrate
DATABASE_URL='<staging-url>' pnpm db:order-read:verify-schema
```

### Schema Validation

`0046_order_read_projections.sql` creates:

| Table | Projection |
|-------|------------|
| `order_read_orders` | P-01/P-02/P-03 |
| `order_read_order_line_items` | P-01/P-03 |
| `order_read_order_timeline` | P-04 |
| `order_read_operational_kpi_daily` | P-06 |
| `order_read_analytics_daily` | P-10 |
| `order_read_public_order_status` | P-11 |
| `order_read_backfill_runs` | Backfill audit |

Extended `scripts/verify-schema-deployment.cjs` includes all `order_read_*` tables.

---

## Backfill Execution (Staging)

### Tenant backfill (recommended first)

```bash
DATABASE_URL='<staging-url>' \
  ORDER_READ_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-backfill-execute.ts --scope tenant --restaurant-id <id>
```

### Full backfill

```bash
DATABASE_URL='<staging-url>' \
  ORDER_READ_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-backfill-execute.ts --scope full
```

### Partial backfill

```bash
DATABASE_URL='<staging-url>' \
  ORDER_READ_BACKFILL_CONFIRM=YES \
  npx tsx scripts/order-read-backfill-execute.ts \
  --scope partial --restaurant-id <id> --from 2026-06-01 --to 2026-06-30
```

### Guards

- `ORDER_READ_BACKFILL_CONFIRM=YES` required for execution
- Script refuses if `ORDER_READ_PROJECTIONS_ENABLED=true`
- Run records persisted to `order_read_backfill_runs`

---

## Post-Deploy Validation

```bash
DATABASE_URL='<staging-url>' pnpm db:order-read:discover
DATABASE_URL='<staging-url>' pnpm db:order-read:validate
DATABASE_URL='<staging-url>' node scripts/order-read-projection-staging.mjs --validate --restaurant-id=<id>
```

---

## Production Safety

| Guard | Status |
|-------|--------|
| `eventInfrastructureComposition.ts` unchanged | ✓ |
| `ORDER_READ_PROJECTIONS_ENABLED` default false | ✓ |
| `order.list` / Dashboard / React unchanged | ✓ |
| Staging scripts refuse flag-enabled execution | ✓ |

---

## Repository Validation (Local)

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| Full Vitest suite | 193 files PASS |
| Migration 0046 in journal | ✓ (`drizzle/meta/_journal.json`) |

---

## Exit Verdict

**Phase 3A tooling READY** — Staging operators can apply migration 0046, run backfill, validate integrity, and exercise rollback/rebuild using documented scripts. Live dispatch and read APIs remain deferred to Phase 3B+.
