# ORDER-SETTLEMENT-MIGRATION-EXECUTION-1 — Migration Execution Report

**Program:** Migration execute + validate only  
**Date:** 2026-07-22  
**Target:** Production TiDB `gateway01` / database `mineuqr`  
**Authority:** ORDER-SETTLEMENT-PERSISTENCE-1 / ADR-ARCH-022  
**Decision:** **GO — schema ready for ORDER-SETTLEMENT-INTEGRATION-1**

---

## 1. Migration status

| Item | Value |
|------|--------|
| Migration | `0073_check_order_settlements` |
| SQL | `drizzle/0073_check_order_settlements.sql` |
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Result | **Applied successfully** (first attempt) |
| Execution duration | **7957 ms** (~8.0 s wall clock) |
| Migration file modified | **No** |
| Application / Domain / Repository modified | **No** |
| Unrelated migrations executed | **No** (only pending journal entry) |

### Attempt timeline

| Step | Result |
|------|--------|
| Governance check | **PASS** — terminus `0073` (74 journal entries) |
| Preflight | Pending: `0073_check_order_settlements` (1) |
| Pre-schema probe | Table **absent**; hash not in `__drizzle_migrations`; latest applied = `0072` |
| Duplicate migration numbers | **None** |
| Checksum consistency | SQL SHA-256 `f31b3cb0…99c71b` matches post-apply DB hash |
| DB connectivity | **OK** — TiDB serverless |
| TiDB compatibility | **OK** — breakpoints already present in SQL; no errno 8130 |
| `pnpm db:migrate` | **SUCCESS** |
| Post-schema probe | Table + indexes + UNIQUE present; FKs none (by design) |
| Post-preflight | **0 pending**; all journal hashes recorded |
| `pnpm db:verify-schema` | **OK** (includes `check_order_settlements`) |

### Commands

```bash
pnpm db:governance-check
pnpm db:preflight
# pre INFORMATION_SCHEMA probe (table absent)
pnpm db:migrate                   # applied 0073 successfully
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
| Host context | TiDB Cloud production gateway (same as 0072 execution) |

---

## 3. Journal verification

| Field | Value |
|-------|--------|
| Journal tag | `0073_check_order_settlements` |
| Journal idx | `73` |
| Journal `when` | `1784590000000` |
| Applied hash | `f31b3cb0c92a78a6eaca91cdf5915d34fd215747157cd18f18bf19b87099c71b` |
| `__drizzle_migrations` latest `created_at` | `1784590000000` (matches journal `when`) |
| DB migration rows | **78** (74 journal + historical bootstrap extras retained) |
| Canonical journal entries | **74** |
| Pending journal migrations | **None** |
| Hash sync journal ↔ DB | **Complete** |

---

## 4. Objects created

### Table

`check_order_settlements`

| Column | Type | Null | Key / default |
|--------|------|------|----------------|
| id | int | NO | PRI / AUTO |
| restaurantId | int | NO | MUL |
| checkId | int | NO | MUL |
| orderId | int | NO | MUL |
| status | enum(pending, partially_settled, settled, complimentary, cancelled, voided, refunded) | NO | MUL / `pending` |
| orderTotalSnapshot | decimal(10,2) | NO | `0.00` |
| allocatedAmount | decimal(10,2) | NO | `0.00` |
| settledAmount | decimal(10,2) | NO | `0.00` |
| outstandingAmount | decimal(10,2) | NO | `0.00` |
| createdAt | timestamp | NO | CURRENT_TIMESTAMP |
| updatedAt | timestamp | NO | CURRENT_TIMESTAMP |

### Indexes / UNIQUE

| Index | Unique | Columns |
|-------|--------|---------|
| PRIMARY | Yes | id |
| `check_order_settlements_check_order_unique` | **Yes** | checkId, orderId |
| `check_order_settlements_restaurant_id` | No | restaurantId |
| `check_order_settlements_check_id` | No | checkId |
| `check_order_settlements_order_id` | No | orderId |
| `check_order_settlements_restaurant_order` | No | restaurantId, orderId |
| `check_order_settlements_restaurant_check` | No | restaurantId, checkId |
| `check_order_settlements_status` | No | status |

### Foreign keys

**None** — matches Persistence design (application-level integrity, same as Membership / Check).

---

## 5. Validation results

| Check | Result |
|-------|--------|
| Migration completed successfully | **PASS** |
| Table exists | **PASS** |
| Expected indexes exist | **PASS** (7 secondary + PRIMARY) |
| UNIQUE `(checkId, orderId)` exists | **PASS** |
| Foreign keys | **None** (expected) |
| Unexpected schema drift vs Persistence | **None** |
| Migration journal / hash updated | **PASS** |
| `pnpm db:preflight` zero pending | **PASS** |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:verify-schema` | **PASS** |
| Repository can connect (DB reachable) | **PASS** |
| Schema matches Drizzle `checkOrderSettlements` | **PASS** |
| Startup / migration mismatch | **None observed** |

Probe utility (read-only):  
`docs/engineering/programs/ORDER-SETTLEMENT-MIGRATION-EXECUTION-1/_preflight-probe.mjs`

---

## 6. Final certification

### **GO**

Migration `0073_check_order_settlements` is applied and validated on production TiDB `mineuqr`.  
Database schema matches the certified ORDER-SETTLEMENT-PERSISTENCE-1 implementation.  
No schema drift. Repository persistence is ready for **ORDER-SETTLEMENT-INTEGRATION-1**.

| Gate | Result |
|------|--------|
| Migration 0073 applied | **Yes** |
| Journal / hash synchronized | **Yes** |
| Table + UNIQUE + indexes | **Yes** |
| No Domain / app / repository changes in this program | **Yes** |
| Integration code deploy | **Not performed** (out of scope) |

---

## Non-goals (honored)

- Migration SQL **not** modified  
- Migration **not** regenerated  
- Application / Domain / Repository **not** modified  
- No APIs, projections, or UI  
- No unrelated migrations executed  
