# PRODUCTION-MIGRATION-EXECUTION-0095-CHECK-CHARGES

| Field | Value |
|-------|--------|
| Mechanism | `pnpm exec drizzle-kit migrate` |
| Start | `2026-08-18T23:50:27.2250821Z` |
| End | `2026-08-18T23:50:38.9335054Z` |
| Exit | **0** — `migrations applied successfully!` |
| Target | `mineuqr` (TiDB Cloud Production `gateway01`) |
| Before | `0094_commercial_limit_occupancy_locks` (hash `134a49bf…caa85d47`, journal id `6204102`) |
| After | `0095_check_charges` (hash `02f6ad22…12d08cca`, journal id `6234102`) |
| Manual SQL | none |
| Application deploy | **NOT DONE** |

## Verification

| Gate | Result |
|------|--------|
| Table `check_charges` | **PASS** (0 rows after isolated smoke cleanup) |
| Columns / nullability | **PASS** (`restaurantId` NOT NULL) |
| Indexes | **PASS** (PK `id`, UNIQUE `chargeId`, UNIQUE `(checkId, sequence)`, 4 supporting indexes) |
| Tenant isolation | **PASS** (repository filters `restaurantId`; cross-tenant read empty) |
| Application access | **PASS** (insert/read/cleanup isolated Charge; real Check `360001` read 0 Charges) |
| Historical counts | **PASS** (checks 137, settlement_records 108, orders 117, membership 137 — unchanged) |
| Unrelated migrations | **PASS** (only 0095 pending, only 0095 applied) |

Backup: SKIPPED — explicit program authorization. No backup prerequisite.
