# CHECK-MANAGEMENT-ARCHITECTURE-1 — Migration Certification Report

**Program:** CHECK-MANAGEMENT-ARCHITECTURE-1  
**Migration:** `0069_check_management`  
**Date:** 2026-07-16  
**Decision:** **CERTIFIED — PRODUCTION READY (pre-commit)**

---

## 1. Migration executed

| Item | Value |
|------|--------|
| Tag | `0069_check_management` |
| SQL | `drizzle/0069_check_management.sql` |
| Change | Additive: `operational_checks` table; `dining_sessions.activeCheckId`; `restaurants.taxEnabled` / `taxMode` / `taxPolicyJson` |
| Workflow | Official Drizzle journal migrate (`pnpm db:migrate`) |
| Manual SQL | **Not used** |
| Result | Applied successfully |

---

## 2. Commands executed

```bash
pnpm db:governance-check          # PASS — terminus 0069_check_management (70 entries)
pnpm db:preflight                 # pending: 0069_check_management
pnpm db:migrate                   # applied successfully
pnpm db:preflight                 # no pending; hashes synchronized
pnpm db:verify-schema             # OK
pnpm db:governance-check          # PASS
# Read-only Check schema + integrity probe (INFORMATION_SCHEMA + row counts)
pnpm exec vitest run shared/operational-session/check/__tests__ \
  shared/operational-session/__tests__/checkManagement.architecture.guards.test.ts \
  scripts/__tests__/migrationGovernance.test.ts \
  shared/operational-session/__tests__/operationalSession.architecture.guards.test.ts \
  server/operational-session/__tests__/resolveOperationalSession.test.ts
pnpm exec vitest run server/diningSession
pnpm build                        # PASS
# App smoke: NODE_ENV=development node -r dotenv/config dist/index.js
#   → Server running on http://localhost:3000/
#   → system.health → {"ok":true}
```

---

## 3. Governance result

| Check | Result |
|-------|--------|
| Journal entries | **70** |
| Last journal tag | `0069_check_management` |
| Non-legacy orphans | **None** |
| `pnpm db:governance-check` (pre) | **PASS** |
| `pnpm db:governance-check` (post) | **PASS** |

---

## 4. Migration journal verification

| Check | Result |
|-------|--------|
| Preflight before migrate | Pending: `0069_check_management` only |
| Preflight after migrate | **All journal migration hashes recorded in DB** |
| `__drizzle_migrations` rows | **74** (70 journal + historical bootstrap extras retained) |
| Pending migrations after apply | **None** |

---

## 5. Schema verification

`pnpm db:verify-schema` — **OK** (auth, order-read, operational-device, fulfilment, business-identity-scope, waiter_display).

### Check Management objects (live INFORMATION_SCHEMA)

| Expectation | Status |
|-------------|--------|
| `operational_checks` table | **Present** |
| `operational_checks.currencySnapshotJson` (json NOT NULL) | **Present** |
| `operational_checks.taxPolicySnapshotJson` (json NOT NULL) | **Present** |
| `operational_checks.outcome` enum(`open`,`paid`,`complimentary`,`voided`) | **Present** |
| Indexes: restaurant / session / outcome | **Present** |
| `dining_sessions.activeCheckId` (int NULL) + index | **Present** |
| `restaurants.taxEnabled` (boolean, default false) | **Present** |
| `restaurants.taxMode` enum(`inclusive`,`exclusive`, default `exclusive`) | **Present** |
| `restaurants.taxPolicyJson` (text NULL) | **Present** |
| Schema drift vs required Check columns | **None** |

---

## 6. Integrity verification (read-only)

| Metric | Value |
|--------|--------|
| `restaurants` | **6** |
| `dining_sessions` | **110** |
| `orders` | **280** |
| `order_items` | **443** |
| `operational_checks` | **0** (expected — table new; Checks created on session open / lazy ensure) |
| Open sessions with `activeCheckId IS NULL` | **0** |
| Restaurants with tax defaults (`taxEnabled=false`, `taxMode=exclusive`) | **6 / 6** |
| Data loss | **None** — existing restaurant / session / order counts preserved |

---

## 7. Backfill

| Item | Value |
|------|--------|
| Mandatory historical backfill | **Not required** |
| Governed policy | Legacy open sessions receive Checks lazily via `ensureOpenCheckForSession` / resolve / settle paths |
| Closed-session backfill | **Not performed** (not required by program) |
| Affected row count | **0** (no backfill executed) |

---

## 8. Architecture / test results

### Architecture Guards + Check Unit Tests + Migration Governance

```
operationalSession.architecture.guards.test.ts           5 passed
checkManagement.architecture.guards.test.ts              7 passed
checkMoney.test.ts                                       5 passed
freezePolicy.test.ts                                     2 passed
migrationGovernance.test.ts                             10 passed
resolveOperationalSession.test.ts                        3 passed

Test Files  6 passed
Tests       32 passed
```

### Dining Session Tests

```
server/diningSession/**  8 files
Tests                    54 passed
```

| Gate | Result |
|------|--------|
| Architecture Guards | **PASS** |
| Migration Governance | **PASS** |
| Check Unit Tests | **PASS** |
| Dining Session Tests | **PASS** |

---

## 9. Build + application start

| Check | Result |
|-------|--------|
| `pnpm build` | **PASS** (vite + server + vercel bundle) |
| App start after migrate | **PASS** — `Server running on http://localhost:3000/` |
| `system.health` | **PASS** — `{"result":{"data":{"json":{"ok":true}}}` |

Note: bare `NODE_ENV=production node dist/index.js` without a production-strength `JWT_SECRET` fails AuthSecurity (local `.env` policy). Development start + health probe confirms post-migration runtime against the migrated DB.

---

## 10. Certification checklist

| Gate | Status |
|------|--------|
| `0069_check_management` applied via `pnpm db:migrate` | **PASS** |
| No pending migrations | **PASS** |
| Schema verify (`pnpm db:verify-schema`) | **PASS** |
| Check schema operational (`operational_checks`, `activeCheckId`, tax columns, currency + tax policy snapshot fields) | **PASS** |
| Existing production data intact | **PASS** |
| Backfill (if required) | **N/A — not required** |
| Architecture Guards | **PASS** |
| Migration Governance | **PASS** |
| Check Unit Tests | **PASS** |
| Dining Session Tests | **PASS** |
| Production build | **PASS** |
| Application starts | **PASS** |
| `system.health` = `ok: true` | **PASS** |

---

## 11. Final certification

**CERTIFIED** — `0069_check_management` production migration governance complete.

- Migration applied.
- Schema verified.
- No pending migrations.
- Build passes.
- Application starts.
- `system.health` = `ok: true`.

Repository is ready for git commit of CHECK-MANAGEMENT-ARCHITECTURE-1.

No git commit was created by this workflow.  
No architecture or implementation code was modified.  
No manual database SQL was executed outside the official Drizzle migrate path.
