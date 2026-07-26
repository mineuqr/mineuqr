# PRODUCTION-MIGRATION-EXECUTION-0082

| Field | Value |
|---|---|
| **Program** | PRODUCTION-MIGRATION-EXECUTION-0082 |
| **Phase** | Production Database Migration Execution |
| **Date** | 2026-07-26 |
| **Migration** | `drizzle/0082_refund_document_numbering.sql` |
| **References** | REFUND-DOCUMENT-NUMBERING-ADOPTION-1 · MIGRATION-GOVERNANCE-0082-ADOPTION-1 · ADR-ARCH-027 · ADR-ARCH-032 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Production migration **`0082_refund_document_numbering`** was applied successfully through the official pipeline (`pnpm db:migrate`). Tables `refund_document_sequences` and `refund_document_numbers` are live with required uniqueness indexes. The single historical refund Settlement Record was backfilled to **RF-000001** (restaurant `720007`, sequence `1`). Settlement / Check / Register / Attribution / Shift counts unchanged. No manual SQL against the production data plane.

**New production migration terminus (DB):** `0082_refund_document_numbering`  
**Applied hash:** `52d7c5f2c824957914cc2754285116214a0a6455631e7fc91ba5303fcc066703` (**once**)

---

## 2. Pre-Migration Audit

| Check | Result |
|-------|--------|
| Governance terminus | `0082_refund_document_numbering` (83 entries) |
| `pnpm db:governance-check` | **PASS** |
| `pnpm db:preflight` (pre) | **PASS** — pending **0082 only** |
| Production database | `mineuqr` (TiDB Cloud via `DATABASE_URL`) |
| Backup control | **TiDB Cloud continuous backup** (same control as 0077–0081) |
| 0082 previously applied | **NO** (`hash0082Applied: []`) |
| Last applied (pre) | **0081** hash `4dcecdc2…`, id `5904102` |
| Target tables (pre) | **Absent** |
| Refund SR / Settlement SR | **1 / 13** |
| Platform counts (pre) | SR 14 · checks 19 · registers 1 · attributions 7 · shifts 3 |
| SQL checksum | `52d7c5f2…066703` (unchanged; SQL not edited) |

---

## 3. Migration Execution Result

| Item | Value |
|------|-------|
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Result | **SUCCESS** — `migrations applied successfully!` |
| Duration | **~54s** |
| Exit code | **0** |
| Journal `when` / DB `created_at` | `1784680000000` |
| `__drizzle_migrations` id | `5934102` |
| Applied hash | `52d7c5f2c824957914cc2754285116214a0a6455631e7fc91ba5303fcc066703` (**once**) |
| Rollback | **Not required** |

```bash
pnpm db:governance-check          # PASS
pnpm db:preflight                 # pending: 0082 only
node …/_preflight-probe.mjs pre   # tables absent; terminus 0081
pnpm db:migrate                   # SUCCESS (0082)
node …/_preflight-probe.mjs post  # tables present; RF backfill OK
pnpm db:preflight                 # zero pending
pnpm db:verify-schema             # OK
pnpm db:governance-check          # PASS
node …/_orm-smoke.mjs             # APP_DB_SMOKE=OK
```

---

## 4. Schema Validation

| Expectation | Pre | Post |
|-------------|-----|------|
| `refund_document_sequences` | absent | present (PK `restaurantId`) |
| `refund_document_numbers` | absent | present |
| Unique `settlementRecordId` | absent | present |
| Unique `(restaurantId, sequenceNumber)` | absent | present |
| Index `restaurantId` | absent | present |
| Journal hash in DB | missing | recorded **once** |

`pnpm db:verify-schema` → **OK**  
`pnpm db:preflight` (post) → **All journal migration hashes recorded in DB**

---

## 5. Refund Numbering Validation

| Check | Result |
|-------|--------|
| Refund document number rows | **1** (= refund SR count) |
| Unbound refund SRs | **0** |
| NULL `sequenceNumber` | **0** |
| Dup `(restaurantId, sequenceNumber)` | **0** |
| Dup `settlementRecordId` | **0** |
| Sequence cursor | restaurant `720007` → `lastNumber=1` (= MAX) |
| Sample | `sr:720007:570003:refund:2` → sequence **1** → **RF-000001** |
| Origin Settlement identity | **ST-570003** (independent) |
| Next allocate would be | **2** |
| Settlement SR count | **13** (unchanged) |
| Platform counts | unchanged vs pre |

---

## 6. System / Reporting / Register

| Area | Result |
|------|--------|
| ORM/SQL smoke | **APP_DB_SMOKE=OK** |
| Search by RF sequence | **OK** (SQL) |
| Search by Check / Settlement checkId | **OK** (SQL) |
| Reporting calculations | **Not modified**; SR counts unchanged |
| Register tables / attributions / shifts | **Counts unchanged** |
| Interactive browser UAT (Ledger UI / dialog / print) | **Not executed in this program** — DB + identity smoke certified; operator UI UAT after app deploy recommended |

---

## 7. Architecture Compliance

| Constraint | Status |
|------------|--------|
| Did not edit 0082 SQL | **Pass** |
| Did not regenerate / rename migrations | **Pass** |
| Did not modify application / domain / reporting / register code | **Pass** |
| Official migrate only | **Pass** |
| No partial execution / no rollback | **Pass** |

---

## Final Certification

**PRODUCTION CERTIFIED**
