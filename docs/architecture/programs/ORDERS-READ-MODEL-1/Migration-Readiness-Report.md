# ORDERS-READ-MODEL-1 — Migration Readiness Report

**Program:** ORDERS-READ-MODEL-1  
**Reference:** READ-ARCHITECTURE-1 RA-08  
**Date:** 2026-06-29  
**Phase:** 3A complete — staging tooling ready

---

## Current Production State (Unchanged)

```
Dashboard / OrdersTab → order.list (tRPC) → db.ts → orders + order_items
Write: Aggregate → Outbox → Relay → Publisher → Integration Consumers only
```

`ORDER_READ_PROJECTIONS_ENABLED=false` (default)  
Publisher: `orderEventConsumerRegistry` only

---

## Phase Completion Summary

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Read foundation | ✓ Certified |
| Phase 2 | Projection materialization (inactive) | ✓ Complete |
| **Phase 3A** | **Staging deployment tooling** | **✓ Complete** |
| Phase 3B | Shadow read APIs + dispatch activation | Not started |
| Phase 4 | UI cutover | Not started |

---

## Phase 3A Deliverables

| Deliverable | Status |
|-------------|--------|
| Migration 0046 journalized | ✓ `drizzle/meta/_journal.json` |
| Schema verify (order_read tables) | ✓ `verify-schema-deployment.cjs` + `--verify-schema` |
| Backfill execution script | ✓ `scripts/order-read-backfill-execute.ts` |
| Staging ops script | ✓ `scripts/order-read-projection-staging.mjs` |
| Integrity checker + tests | ✓ `OrderReadProjectionIntegrityChecker.ts` |
| Rollback / rebuild procedures | ✓ Documented + scripted |
| npm scripts | ✓ `db:order-read:*` |
| Staging reports (8) | ✓ |

---

## Staging Deployment Sequence

1. `DATABASE_URL='<staging>' pnpm db:preflight`
2. `DATABASE_URL='<staging>' pnpm db:migrate`
3. `DATABASE_URL='<staging>' pnpm db:order-read:verify-schema`
4. `DATABASE_URL='<staging>' pnpm db:order-read:discover`
5. Per-tenant: `ORDER_READ_BACKFILL_CONFIRM=YES npx tsx scripts/order-read-backfill-execute.ts --scope tenant --restaurant-id <id>`
6. `DATABASE_URL='<staging>' pnpm db:order-read:validate`
7. If issues: `ORDER_READ_STAGING_CONFIRM=YES node scripts/order-read-projection-staging.mjs --rebuild-tenant --restaurant-id=<id>`

---

## Migration Gates

### Gate 1 — Phase 2 (Complete)

Projection store, materializers, consumers (registered, inactive), backfill service.

### Gate 2 — Phase 3A (Complete)

Staging ops tooling, integrity validation, rollback/rebuild, migration journalized.

### Gate 3 — Phase 3B (Next)

| Item | Status |
|------|--------|
| Apply 0046 on staging DB | **Ops action** (tooling ready) |
| Run staging backfill | **Ops action** (tooling ready) |
| Enable `ORDER_READ_PROJECTIONS_ENABLED` in staging | Deferred |
| Wire publisher to `createOrderEventDispatchDelegate()` | Deferred |
| Shadow read APIs (Q-01, Q-03, Q-05, Q-08) | Not implemented |
| Divergence telemetry | Not implemented |

### Gate 4 — UI Cutover

Blocked on Gate 3 shadow validation.

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Accidental production dispatch | Flag default false; scripts refuse when enabled |
| Staging backfill on wrong DB | `ORDER_READ_BACKFILL_CONFIRM=YES` + explicit DATABASE_URL |
| P-04 empty after backfill | Documented; timeline needs live dispatch |
| Partial failed backfill | Idempotent re-run; tenant rebuild script |

---

## Repository Validation

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| Vitest | 193 files, 1140 tests PASS |
| Production code changes | None (tooling + docs + journal only) |

---

## Exit Verdict

**Phase 3A READY** — Staging operators have migration, backfill, validation, and rollback tooling. Proceed to staging DB execution, then Phase 3B planning when shadow APIs are approved.
