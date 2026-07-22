# SPLIT-PAYMENT-MIGRATION-EXECUTION-1 — Migration Execution Report

**Program:** Migration execute + validate only  
**Date:** 2026-07-23  
**Target:** Production TiDB `gateway01` / database `mineuqr`  
**Authority:** SPLIT-PAYMENT-PERSISTENCE-1 / ADR-ARCH-024  
**Decision:** **GO — schema ready for SPLIT-PAYMENT-INTEGRATION-1**

---

## 1. Migration status

| Item | Value |
|------|--------|
| Migration | `0074_check_split_payments` |
| SQL | `drizzle/0074_check_split_payments.sql` |
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Result | **Applied successfully** (first attempt) |
| Execution duration | **~18.7 s** wall clock (`Measure-Command`) |
| Migration file modified | **No** |
| Application / Domain / Persistence / Repository modified | **No** |
| Unrelated migrations executed | **No** (only pending journal entry) |

### Attempt timeline

| Step | Result |
|------|--------|
| Governance check | **PASS** — terminus `0074` (75 journal entries) |
| Preflight | Pending: `0074_check_split_payments` (1) |
| Pre-schema probe | All 5 Split Payment tables **absent**; hash not in `__drizzle_migrations`; latest applied = `0073` |
| Previous migration | `0073_check_order_settlements` confirmed applied |
| Duplicate migration numbers | **None** |
| Checksum | SQL SHA-256 `10fd5036…d9d311` matches post-apply DB hash |
| DB connectivity | **OK** — TiDB serverless |
| TiDB compatibility | **OK** — breakpoints already present; no errno 8130 |
| `pnpm db:migrate` | **SUCCESS** |
| Post-schema probe | All 5 tables + indexes + UNIQUE present; FKs none (by design); `version` column present |
| Baseline data safety | OS / Checks / Membership / SettlementTransaction row counts **unchanged** |
| Post-preflight | **0 pending**; all journal hashes recorded |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:verify-schema` | **OK** (includes Split Payment objects) |

### Commands

```bash
pnpm db:governance-check
pnpm db:preflight
# pre INFORMATION_SCHEMA probe (tables absent)
pnpm db:migrate                   # applied 0074 successfully
# post INFORMATION_SCHEMA probe
pnpm db:preflight                 # zero pending
pnpm db:governance-check          # PASS
pnpm db:verify-schema             # OK
```

---

## 2. Database version

| Field | Value |
|-------|--------|
| Engine | **TiDB** |
| Version | `8.0.11-TiDB-v8.5.3-serverless` |
| Database | `mineuqr` |
| Host context | TiDB Cloud production gateway (same as 0073 execution) |

---

## 3. Journal verification

| Field | Value |
|-------|--------|
| Journal tag | `0074_check_split_payments` |
| Journal idx | `74` |
| Journal `when` | `1784600000000` |
| Applied hash | `10fd50365baeda6b55e96b8ea71283b8199f875ba2d6764c942e855a06d9d311` |
| `__drizzle_migrations` latest `created_at` | `1784600000000` (matches journal `when`) |
| DB migration rows | **79** (75 journal + historical bootstrap extras retained) |
| Canonical journal entries | **75** |
| Pending journal migrations | **None** |
| Hash sync journal ↔ DB | **Complete** |
| Gaps / duplicates | **None** |

---

## 4. Objects created

### Tables (5)

| Table | Row count after apply |
|-------|------------------------|
| `check_split_payments` | 0 |
| `check_split_payment_tenders` | 0 |
| `check_split_payment_tender_allocations` | 0 |
| `check_split_payment_allocations` | 0 |
| `check_split_payment_attempts` | 0 |

### `check_split_payments` (header)

| Column | Type | Notes |
|--------|------|--------|
| id | int | PRI / AUTO |
| restaurantId, checkId | int | ownership indexes |
| paymentId | varchar(128) | UNIQUE (canonical) |
| paymentReference | varchar(128) | UNIQUE with checkId |
| financialReference | varchar(128) | nullable, indexed |
| status | enum(pending…failed) | default `pending` |
| amount, allocatedAmount, unallocatedAmount | decimal(10,2) | |
| version | int | CAS default `1` |
| createdAt, updatedAt | timestamp | |

### Unique / indexes (selected)

| Index | Unique | Columns |
|-------|--------|---------|
| `check_split_payments_payment_id_unique` | Yes | paymentId |
| `check_split_payments_check_payment_unique` | Yes | checkId, paymentId |
| `check_split_payments_check_payment_ref_unique` | Yes | checkId, paymentReference |
| `check_split_payment_attempts_attempt_id_unique` | Yes | attemptId |
| `check_split_payment_tenders_tender_id_unique` | Yes | tenderId |
| `check_split_payment_tender_alloc_id_unique` | Yes | tenderAllocationId |
| `check_split_payment_allocations_alloc_id_unique` | Yes | allocationId |

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

Existing Financial Settlement Platform data preserved. Order Settlement and Check Management unaffected. No unexpected mutation of existing rows.

---

## 6. Validation results

| Check | Result |
|-------|--------|
| Migration completed successfully | **PASS** |
| All 5 tables exist | **PASS** |
| Expected UNIQUE indexes exist | **PASS** |
| `version` column on payments | **PASS** |
| Attempt `externalProviderReference` | **PASS** |
| Foreign keys | **None** (expected) |
| Unexpected schema drift vs Persistence | **None** |
| Migration journal / hash updated | **PASS** |
| `pnpm db:preflight` zero pending | **PASS** |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:verify-schema` | **PASS** |
| DB reachable for new tables | **PASS** |
| Schema matches Drizzle Split Payment tables | **PASS** |
| Startup / migration mismatch | **None observed** |

Probe utility (read-only):  
`docs/engineering/programs/SPLIT-PAYMENT-MIGRATION-EXECUTION-1/_preflight-probe.mjs`

---

## 7. Final certification

### **GO**

Migration `0074_check_split_payments` is applied and validated on production TiDB `mineuqr`.  
Database schema matches the certified SPLIT-PAYMENT-PERSISTENCE-1 implementation.  
No schema drift. Persistence is ready for **SPLIT-PAYMENT-INTEGRATION-1**.

| Gate | Result |
|------|--------|
| Migration 0074 applied | **Yes** |
| Journal / hash synchronized | **Yes** |
| Tables + UNIQUE + version + indexes | **Yes** |
| Baseline FSP data preserved | **Yes** |
| No Domain / Persistence / Integration changes in this program | **Yes** |
| Integration code deploy | **Not performed** (out of scope) |

---

## Non-goals (honored)

- Migration SQL **not** modified  
- Migration **not** regenerated  
- Architecture / Domain / Persistence / Repositories **not** modified  
- No Integration, Projection, API, or Presentation  
- No unrelated migrations executed  
