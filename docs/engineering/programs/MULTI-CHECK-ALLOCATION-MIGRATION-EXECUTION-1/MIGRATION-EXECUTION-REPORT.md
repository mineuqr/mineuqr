# MULTI-CHECK-ALLOCATION-MIGRATION-EXECUTION-1 — Migration Execution Report

**Program:** Migration execute + validate only  
**Date:** 2026-07-23  
**Target:** Production TiDB `gateway01` / database `mineuqr`  
**Authority:** MULTI-CHECK-ALLOCATION-PERSISTENCE-1 / ADR-ARCH-025  
**Decision:** **GO — schema ready for MULTI-CHECK-ALLOCATION-INTEGRATION-1**

---

## 1. Migration status

| Item | Value |
|------|--------|
| Migration | `0075_multi_check_allocation` |
| SQL | `drizzle/0075_multi_check_allocation.sql` |
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Result | **Applied successfully** |
| Migration file modified | **No** |
| Application / Domain / Persistence / Repository modified | **No** (execution program only) |
| Unrelated migrations executed | **No** (only pending journal entry `0075`) |

### Attempt timeline

| Step | Result |
|------|--------|
| Governance check | **PASS** — terminus `0075_multi_check_allocation` (76 journal entries) |
| Preflight | Pending: `0075_multi_check_allocation` (1) |
| Pre-schema probe | All 6 Multi Check Allocation tables **absent**; hash not in `__drizzle_migrations`; latest applied = `0074` |
| Previous migration | `0074_check_split_payments` confirmed (`check_split_payments` exists) |
| Duplicate migration numbers | **None** |
| Checksum | SQL SHA-256 `9cc0b24a…0730f0de` matches post-apply DB hash |
| DB connectivity | **OK** — TiDB serverless |
| TiDB compatibility | **OK** — breakpoints already present; no errno 8130 |
| `pnpm db:migrate` | **SUCCESS** |
| Post-schema probe | All 6 tables + indexes + UNIQUE present; FKs none (by design); `version` / `schemaVersion` present |
| Baseline data safety | OS / Checks / Membership / SettlementTransaction / Split Payment row counts **unchanged** |
| Post-preflight | **0 pending**; all journal hashes recorded |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:verify-schema` | **OK** (includes Multi Check Allocation objects) |

### Commands

```bash
pnpm db:governance-check
pnpm db:preflight
# pre INFORMATION_SCHEMA probe (tables absent; 0074 present)
pnpm db:migrate                   # applied 0075 successfully
# post INFORMATION_SCHEMA probe
pnpm db:preflight                 # zero pending
pnpm db:governance-check          # PASS
pnpm db:verify-schema             # OK
```

Probe utility (read-only):  
`docs/engineering/programs/MULTI-CHECK-ALLOCATION-MIGRATION-EXECUTION-1/_preflight-probe.mjs`

---

## 2. Database version

| Field | Value |
|-------|--------|
| Engine | **TiDB** |
| Version | `8.0.11-TiDB-v8.5.3-serverless` |
| Database | `mineuqr` |
| Host context | TiDB Cloud production gateway (same as 0074 execution) |

---

## 3. Journal verification

| Field | Value |
|-------|--------|
| Journal tag | `0075_multi_check_allocation` |
| Journal idx | `75` |
| Journal `when` | `1784610000000` |
| Applied hash | `9cc0b24a973136aaa0688965e1f3ef6c16478b35df3cc5225ff45f3a0730f0de` |
| `__drizzle_migrations` latest `created_at` | `1784610000000` (matches journal `when`) |
| DB migration rows | **80** (76 journal + historical bootstrap extras retained) |
| Canonical journal entries | **76** |
| Pending journal migrations | **None** |
| Hash sync journal ↔ DB | **Complete** |
| Gaps / duplicates | **None** |

---

## 4. Objects created

### Tables (6)

| Table | Row count after apply |
|-------|------------------------|
| `multi_check_allocations` | 0 |
| `multi_check_allocation_sources` | 0 |
| `multi_check_allocation_portions` | 0 |
| `multi_check_allocation_adjustments` | 0 |
| `multi_check_allocation_reversals` | 0 |
| `multi_check_allocation_history` | 0 |

### `multi_check_allocations` (header)

| Column | Type | Notes |
|--------|------|--------|
| id | int | PRI / AUTO |
| restaurantId | int | tenant index |
| allocationId | varchar(128) | UNIQUE (canonical) |
| allocationReference | varchar(128) | UNIQUE with restaurantId |
| financialReference | varchar(128) | nullable, indexed |
| sourceCheckId | int | indexed |
| sourcePaymentId | varchar(128) | nullable, indexed |
| status | enum(pending…cancelled) | default `pending` |
| financialResponsibility, allocatedAmount, remainingAmount | decimal(10,2) | |
| paymentValueCap | decimal(10,2) | nullable |
| schemaVersion | int | default `1` |
| version | int | CAS default `1` |
| allocationReason | varchar(255) | nullable metadata |
| createdAt, updatedAt | timestamp | |

### Unique / indexes (selected)

| Index | Unique | Columns |
|-------|--------|---------|
| `mca_allocation_id_unique` | Yes | allocationId |
| `mca_restaurant_alloc_ref_unique` | Yes | restaurantId, allocationReference |
| `mca_portions_portion_id_unique` | Yes | portionId |
| `mca_adjustments_adjustment_id_unique` | Yes | adjustmentId |
| `mca_reversals_reversal_id_unique` | Yes | reversalId |
| `mca_sources_alloc_check_unique` | Yes | allocationId, sourceCheckId |

### History audit columns

| Column | Present |
|--------|---------|
| previousRevision | **Yes** |
| newRevision | **Yes** |
| mutationType | **Yes** |
| sourceCheckId / targetCheckId / financialReference | **Yes** |

### Foreign keys

**None** — matches Persistence design (application-level integrity).

---

## 5. Data safety

| Baseline table | Pre count | Post count |
|----------------|-----------|------------|
| `check_order_settlements` | 1 | 1 |
| `operational_checks` | 3 | 3 |
| `check_order_membership` | 3 | 3 |
| `check_settlement_transactions` | 3 | 3 |
| `check_split_payments` | 0 | 0 |

Existing Financial Settlement Platform data preserved. Split Payment, Order Settlement, and Check Management unaffected. No unexpected mutation of existing rows. New tables empty (no backfill — by design).

---

## 6. Validation results

| Check | Result |
|-------|--------|
| Migration completed successfully | **PASS** |
| All 6 tables exist | **PASS** |
| Expected UNIQUE indexes exist | **PASS** |
| Canonical identity columns | **PASS** |
| `version` CAS column | **PASS** |
| `schemaVersion` column | **PASS** |
| History revision / mutationType columns | **PASS** |
| Foreign keys | **None** (expected) |
| Unexpected schema drift vs Persistence | **None** |
| Migration journal / hash updated | **PASS** |
| `pnpm db:preflight` zero pending | **PASS** |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:verify-schema` | **PASS** |
| Drizzle schema module loads | **PASS** |
| Repository module initializes | **PASS** |
| Startup / migration mismatch | **None observed** |

---

## 7. Final certification

### **GO**

Migration `0075_multi_check_allocation` is applied and validated on production TiDB `mineuqr`.  
Database schema matches the certified MULTI-CHECK-ALLOCATION-PERSISTENCE-1 implementation.  
No schema drift. Persistence is ready for **MULTI-CHECK-ALLOCATION-INTEGRATION-1**.

| Gate | Result |
|------|--------|
| Migration 0075 applied | **Yes** |
| Journal / hash synchronized | **Yes** |
| Tables + UNIQUE + version + history audit | **Yes** |
| Baseline FSP data preserved | **Yes** |
| No Domain / Persistence / Integration changes in this program | **Yes** |
| Integration code deploy | **Not performed** (out of scope) |

---

## Non-goals (honored)

- Migration SQL **not** modified  
- Migration **not** regenerated  
- Architecture / Domain / Persistence / Repositories **not** modified by this program  
- No Integration, Projection, API, or Presentation  
- No data migration / backfill  
- No unrelated migrations executed  
