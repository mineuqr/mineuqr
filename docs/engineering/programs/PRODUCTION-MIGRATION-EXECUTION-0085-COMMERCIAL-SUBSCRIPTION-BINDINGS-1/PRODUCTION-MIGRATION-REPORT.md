# PRODUCTION-MIGRATION-REPORT — 0085 Commercial Subscription Bindings

| Field | Value |
|---|---|
| **Program** | PRODUCTION-MIGRATION-EXECUTION-0085-COMMERCIAL-SUBSCRIPTION-BINDINGS-1 |
| **Date** | 2026-07-29 |
| **Migration** | `drizzle/0085_commercial_catalog_adoption_bindings.sql` |
| **Verdict** | **READY FOR PRODUCTION VALIDATION** |

---

## 1. Executive summary

Production migration **`0085_commercial_catalog_adoption_bindings`** applied successfully through the official pipeline (`pnpm exec drizzle-kit migrate`). Table **`commercial_subscription_bindings`** created with PK, unique subscription constraint, and two secondary indexes. Migration registered **once**. Platform business row counts unchanged. Additive schema only. No manual DDL. No application deployment.

**New production migration terminus (DB):** `0085_commercial_catalog_adoption_bindings`  
**Applied hash:** `c104e894606f292173e9f133f575980441d77bc9a650d1251760e988c102c81a` (**once**, id `5994103`)  
**Journal `created_at`:** `1784710000000`

---

## 2. Pre-migration audit

| Check | Result |
|-------|--------|
| Governance terminus (repo) | `0085_commercial_catalog_adoption_bindings` (86 entries) |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:preflight` (pre) | **PASS** — pending **0085 only** |
| Production database | `mineuqr` (TiDB Cloud via `DATABASE_URL`) |
| Connectivity | **OK** |
| Backup control | Operator-stated complete (mission brief) |
| 0085 previously applied | **NO** |
| Last applied (pre) | **0084** hash `9d585e21…`, id `5994102` |
| `commercial_subscription_bindings` (pre) | **Absent** |
| Platform counts (pre) | orders 33 · order_read 33 · SR 30 · checks 33 · user_subscriptions 5 · subscription_plans 3 · restaurants 6 · users 3 · commercial_plans 0 · commercial_snapshot_definitions 0 |

---

## 3. Migration execution

| Item | Value |
|------|-------|
| Workflow | `pnpm exec drizzle-kit migrate` |
| Manual SQL | **Not used** |
| Start | `2026-07-29T17:29:39.994+03:00` |
| Finish | `2026-07-29T17:29:46.044+03:00` |
| Result | **SUCCESS** — `migrations applied successfully!` |
| Duration | **~6.05s** (`DURATION_MS=6050`) |
| Exit code | **0** |
| Objects created | **1 table** |
| Indexes / constraints | PRIMARY (`id`) · UNIQUE (`subscriptionId`) · INDEX (`planVersionId`) · INDEX (`snapshotId`) |
| Rows affected (DML) | **0** (DDL only) |
| Rollback | **Not required** |

### Executed statements (from migration SQL)

1. `CREATE TABLE commercial_subscription_bindings (...)` with PK + UNIQUE  
2. `CREATE INDEX commercial_subscription_bindings_version_idx`  
3. `CREATE INDEX commercial_subscription_bindings_snapshot_idx`

---

## 4. Post validation

| Check | Result |
|-------|--------|
| Table present | **YES** |
| Hash registered once | **YES** id `5994103` |
| Expected indexes | **YES** (4/4) |
| `pnpm db:preflight` (post) | **PASS** — zero pending |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:verify-schema` | **PASS** (exit 0) |
| Platform counts (post) | **Identical** to pre |
| Catalog / binding / runtime smoke | **OK** · `mixedResolutionCount=0` |
| Binding SELECT | **OK** · rowCount `0` |

---

## 5. Success criteria

| Criterion | Status |
|-----------|--------|
| Migration 0085 executed | **Met** |
| Journal / DB terminus advanced to 0085 | **Met** |
| Schema synchronized | **Met** |
| Table / indexes / unique constraints | **Met** |
| APP_CATALOG_SMOKE + binding + runtime authority | **Met** |
| mixedResolutionCount = 0 | **Met** |
| No tenant/business data modified | **Met** |
| Zero data loss | **Met** |
| No commits / no app deployment | **Met** |

---

## 6. Warnings / observations

1. **Backup** — treated as operator-stated prerequisite; this program did not create a new backup snapshot.  
2. **Foreign keys** — 0085 uses application-level references (no DB FK clauses); unique/PK constraints are present as designed.  
3. **Empty table** — zero binding rows expected immediately after additive DDL; bindings are created by runtime activation paths (trial/admin/payment), not by this migration.  
4. **ORM smoke audit noise** — `ensureCatalogReady` seed emitted `audit_persist_failed` / `Database not available` in the isolated smoke process; smoke assertions still passed. Production hosting is unchanged (no app deploy).  
5. **commercial_plans / snapshot_definitions counts remain 0** in production probe — Catalog seed may be process-local until ops seeds/persists Catalog rows; out of scope for this schema-only program.
