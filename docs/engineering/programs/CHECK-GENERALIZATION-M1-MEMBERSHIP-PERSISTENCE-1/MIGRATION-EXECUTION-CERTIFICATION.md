# CHECK-GENERALIZATION-M1 — Migration 0071 Execution Certification

**Program:** Migration execute + validate only  
**Date:** 2026-07-19  
**Target:** Production TiDB `gateway01` / database `mineuqr`  
**Decision:** **CERTIFIED — PRODUCTION READY (pre-commit)**

---

## 1. Migration execution result

| Item | Value |
|------|--------|
| Applied migration | `0071_check_order_membership` |
| SQL | `drizzle/0071_check_order_membership.sql` |
| Workflow | `pnpm db:migrate` (`drizzle-kit migrate`) |
| Manual SQL | **Not used** |
| Result | **Applied successfully** |
| Preflight after | All journal hashes recorded; **0 pending** |
| Failed migration entries | **None** (no `*drizzle*failed*` tables) |

### Commands

```bash
pnpm db:governance-check          # PASS — terminus 0071 (72 entries)
pnpm db:preflight                 # pending: 0071_check_order_membership
pnpm db:migrate                   # applied successfully
pnpm db:preflight                 # no pending; hashes synchronized
pnpm db:verify-schema             # OK (includes check_order_membership)
pnpm db:governance-check          # PASS
```

---

## 2. Applied migration version

| Field | Value |
|-------|--------|
| Journal tag | `0071_check_order_membership` |
| Journal idx | `71` |
| Journal `when` | `1784570000000` |
| `__drizzle_migrations` latest `created_at` | `1784570000000` (matches) |
| DB migration rows | **76** (72 journal + historical bootstrap extras retained) |
| Canonical journal entries | **72** |

---

## 3. Schema validation report

| Expectation | Status |
|-------------|--------|
| Table `check_order_membership` exists | **PASS** |
| PK `id` AUTO_INCREMENT | **PASS** |
| Columns: `restaurantId`, `checkId`, `orderId`, `enrolledAt`, `enrolledReason`, `active`, `createdAt`, `updatedAt` | **PASS** |
| Nullability: all NOT NULL (matches design) | **PASS** |
| `enrolledReason` enum(`session_attach`,`order_place`,`backfill`,`manual`) default `session_attach` | **PASS** |
| `active` tinyint NOT NULL default `1` | **PASS** |
| Unique `(checkId, orderId)` | **PASS** |
| Indexes: restaurant / check / order / restaurant+order | **PASS** |
| DDL foreign keys | **None by design** — TiDB/MineuQR Check pattern; integrity via Check membership service + unique index |
| Unexpected schema drift vs `0071` SQL | **None** |
| `pnpm db:verify-schema` | **OK** |

---

## 4. Production validation report

| Surface | Evidence | Status |
|---------|----------|--------|
| Existing tables intact | `orders`, `dining_sessions`, `operational_checks`, `check_settlement_transactions`, order-read tables present | **PASS** |
| Row continuity (probe) | restaurants=6, dining_sessions=127, orders=297, operational_checks=17, settlement_tx=12 | **PASS** |
| Membership empty (expected pre dual-write traffic / pre backfill) | `check_order_membership` = **0** | **PASS** |
| Additive-only migration | No drops/alters on Order/Session/Check/Settlement/Reporting | **PASS** |
| Settlement / reporting / Session / waiter logic | Not modified in this execution program | **PASS** (by constraint) |
| Functional regression | None introduced by DDL | **PASS** |

---

## 5. Feature flag status

| Field | Value |
|-------|--------|
| Env var | `CHECK_MEMBERSHIP_DUAL_WRITE` |
| Current value in `.env` | **unset** (`null`) |
| Effective value | **`true` (ON)** |
| Deployment behavior | Dual-write enabled when unset or any value except the string `"false"` |
| Modified in this program | **No** |

Rollback of writes (designed): set `CHECK_MEMBERSHIP_DUAL_WRITE=false`. Session money discovery remains authoritative regardless.

---

## 6. Pending migration status

| Check | Result |
|-------|--------|
| Pending journal migrations | **None** |
| Governance terminus | `0071_check_order_membership` |
| Hash sync journal ↔ DB | **Complete** |

---

## 7. Backfill tooling (not executed)

| Check | Result |
|-------|--------|
| CLI exists | `scripts/check-order-membership-backfill-execute.ts` |
| Confirm gate | Refuses execute without `CHECK_MEMBERSHIP_BACKFILL_CONFIRM=YES` (verified exit 1) |
| Production backfill executed | **No** (explicitly refused) |

---

## 8. Rollback capability

| Mechanism | Available |
|-----------|-----------|
| Disable dual-write via env | **Yes** |
| Drop table (emergency DDL) | Possible but not required for app rollback; Session discovery unchanged |
| Cutover flag | **N/A** (no cutover in M1) |

---

## 9. Governance updates (this program)

| File | Change |
|------|--------|
| `scripts/lib/migration-governance-lib.cjs` | Terminus → `0071` / count `72` |
| `scripts/migration-governance-guard.cjs` | Message range → `0000–0071` |
| `scripts/verify-schema-deployment.cjs` | Require `check_order_membership` + indexes |
| `scripts/__tests__/migrationGovernance.test.ts` | Expect terminus `0071` |
| `docs/DB_MIGRATION_GOVERNANCE.md` | Lineage note updated |

No business logic, API, UI, reporting, settlement, or Session behavior changes in this program.

---

## 10. Final production readiness verdict

**GO — Migration 0071 certified on production.**

Repository is ready for commit and push of M1 persistence + this certification (commit/push not performed by this program unless separately requested).

| Success criterion | Met |
|-------------------|-----|
| Migration 0071 applied | Yes |
| Schema validated | Yes |
| Zero pending migrations | Yes |
| Zero failed migration entries | Yes |
| Zero production regressions from DDL | Yes |
| Rollback via designed dual-write flag | Yes |
| Backfill not executed | Yes |
