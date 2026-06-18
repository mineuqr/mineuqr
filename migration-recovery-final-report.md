# MIGRATION-RECOVERY-AUDIT-1 — Final Closure Report

**Program:** MIGRATION-RECOVERY-AUDIT-1  
**Environment:** `gateway01.eu-central-1.prod.aws.tidbcloud.com` / `mineuqr` (Production)  
**Closure date:** 2026-06-18  
**Status:** **CLOSED — RECOVERY COMPLETE**

---

## 1. Executive Summary

MineuQR production on gateway01 had **operational schema** but **broken migration governance**: `__drizzle_migrations` tracked only 8 rows (4 orphan bootstrap + 4 recent canonical migrations) while the application expected a 26-entry journal lineage. Blind `drizzle-kit migrate` would have attempted to replay `0000_shiny_blizzard` and fail with table-exists errors.

A structured audit (Phases A–B.5) identified a bounded recovery: **21 baseline hash inserts**, **1 journal repair**, **1 DDL execution** (`0019_users_email_unique`), and **no re-execution** of already-present schema (`0021`–`0025`).

**Phase C executed successfully on 2026-06-18:**

| Step | Action | Result |
|------|--------|--------|
| C-PREFLIGHT-1 | Read-only package verification | **GO** |
| C1 | Journal repair — `0024` at idx 24 | **Complete** (repo only) |
| C2 | 21 baseline hash inserts | **Complete** (8 → 29 rows) |
| C3-PREFLIGHT | `0019` readiness | **GO** |
| C3 | `users_email_unique` DDL + hash | **Complete** (29 → 30 rows) |

**Final state:** All 26 journal migration hashes are recorded in `__drizzle_migrations`. Schema matches `drizzle/schema.ts` for audited objects. Four legacy orphan bootstrap rows are retained as historical record. Migration lineage is reconciled.

**Closure decision:** **CLOSED — GO for normal migration discipline going forward.**

---

## 2. Initial State

### 2.1 Production target (Phase A)

| Attribute | Value |
|-----------|-------|
| Host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| Database | `mineuqr` |
| Region | EU (TiDB Cloud) |
| Role | Authoritative MineuQR production |

Phase A initially lacked live gateway01 credentials; repo/journal audit was complete but production `__drizzle_migrations` was unknown. Phase B resolved this with a live read-only audit.

### 2.2 Repository state (pre-recovery)

| Artifact | State |
|----------|-------|
| `drizzle/meta/_journal.json` | 25 entries; **idx 24 missing** (`0023` → `0025` gap) |
| SQL files on disk | 35 files; 10 orphan (parallel `0000`–`0008` lineage + others) |
| `drizzle/schema.ts` | Authoritative application contract |
| Snapshots | `drizzle/meta/` through `0016`; `0017`–`0025` hand-published |

### 2.3 Production state (Phase B — 2026-06-18T16:14:01Z)

| Metric | Value |
|--------|-------|
| Tables | 22 |
| `__drizzle_migrations` rows | **8** |
| Journal hashes recorded | **3** (`0021`, `0022`, `0023`) + **1 orphan-applied** (`0024`) |
| Baseline candidates | **21** (schema present, hash absent) |
| Pending execute | **1** (`0019_users_email_unique`) |
| Duplicate email groups | **0** |

### 2.4 `__drizzle_migrations` before recovery

| id | Applied (UTC) | Matched tag | Lineage |
|----|---------------|-------------|---------|
| 1 | 2026-04-01 | `0000_exotic_hellfire_club` | Orphan bootstrap |
| 242596 | 2026-04-01 | `0001_lumpy_naoko` | Orphan bootstrap |
| 403383 | 2026-04-09 | `0002_watery_ironclad` | Orphan bootstrap |
| 610290 | 2026-04-19 | `0003_square_krista_starr` | Orphan bootstrap |
| 873421 | 2026-06-13 | `0021_audit_events` | Canonical |
| 873422 | 2026-06-13 | `0022_order_tracking_token` | Canonical |
| 2873421 | 2026-06-13 | `0023_customer_push_subscriptions` | Canonical |
| 2873422 | 2026-06-13 | `0024_orders_ready_push_sent_at` | Applied; **not in journal** |

### 2.5 Schema present before recovery

All journal migration objects were present **except** `users_email_unique` index (`0019`). Confirmed objects included:

- `audit_events` (`0021`)
- `orders.trackingToken` + unique index (`0022`)
- `customer_push_subscriptions` (`0023`)
- `orders.readyPushSentAt` (`0024`)
- `orders.readyAt` (`0025`)

---

## 3. Findings

### 3.1 Phase A — Production Discovery

- Production identity confirmed as **gateway01 / mineuqr** (documented + EXEC-4 artifacts).
- Repo journal had **idx gap at 24** and **10 orphan SQL files** on disk.
- Dual migration lineages: orphan `0000_exotic` … vs canonical journal `0000_shiny` …
- `db:migrate` on evolved production assessed as **critical risk** without baselining.
- Vercel Production `DATABASE_URL` exists but is encrypted; operator must verify host via dashboard/TiDB console.

### 3.2 Phase B — Migration Lineage Reconstruction

| Disposition | Count | Migrations |
|-------------|------:|------------|
| `BASELINE_CANDIDATE` | 21 | `0000`–`0018`, `0020`, `0025` |
| `PENDING_EXECUTE` | 1 | `0019` |
| `APPLIED_RECORDED` | 3 | `0021`, `0022`, `0023` |
| `ORPHAN_APPLIED` | 1 | `0024` (hash in DB, not in journal) |

- **No schema drift** on audited `schema.ts` columns for `users`, `orders`, `audit_events`, `auth_tokens`, `customer_push_subscriptions`.
- Production is a **superset** of `schema.ts` for some legacy columns (`auth_provider`, `reset_token`, order customer fields).
- **0 duplicate emails** — safe for `0019`.

### 3.3 Phase B.5 — Recovery Simulation

- Recovery package checksum (21 baseline): `8d99ab7356d5c532675435691f0e5040f44c6c825a60431dede9d2929fe30dd6`
- Execution package checksum (baseline + `0019` + `0024` refs): `177896b3fad2c7b432ac17d7804d1a00548cc0f928639c5d67f54026e10b84bf`
- Safest order: backup → journal repair → baseline inserts → `0019` DDL → verify
- **Conditional GO** issued pending backup and operator execution

### 3.4 Phase C-PREFLIGHT-1

All six objectives **PASS** — final verdict **GO**.

### 3.5 Phase C execution

| Phase | Executed | Outcome |
|-------|----------|---------|
| C1 | `0024` inserted at journal idx 24 | Repo repaired; idx 0–25 contiguous |
| C2 | 21 idempotent hash inserts in transaction | 8 → 29 rows; checksum verified |
| C3 | `CREATE UNIQUE INDEX users_email_unique` + hash | 29 → 30 rows; reconciliation complete |

---

## 4. Root Cause Analysis

### 4.1 Primary causes

1. **Evolved database outside canonical migrate path**  
   Production was bootstrapped via orphan lineage (`0000_exotic` … `0003_square_krista_starr`) and evolved through manual patches, idempotent scripts, and partial Drizzle runs — not a single clean `drizzle-kit migrate` from journal `0000_shiny_blizzard`.

2. **Journal governance gaps**  
   - `0021`/`0022` were applied before journal entries existed (later repaired in repo).  
   - `0024` was applied to production (Jun 2026 batch) but **never added to journal** until C1.  
   - Hand-published migrations `0017`–`0025` lack Drizzle snapshots.

3. **History table ≠ schema reality**  
   `__drizzle_migrations` recorded only recent tail migrations; 21 canonical journal hashes were never inserted despite schema being present.

4. **Environment confusion risk**  
   Workspace `.env` historically pointed at gateway05 (dev); `vercel env run` could merge wrong credentials. Recovery required explicit gateway01 targeting.

### 4.2 Contributing factors

- `docs/DB_MIGRATION_GOVERNANCE.md` stale (referenced journal ending at `0018`).
- Orphan SQL files retained on disk without clear “do not execute” enforcement in CI.
- No automated pre-deploy check that journal hashes ⊆ `__drizzle_migrations` on production.
- `0019` deferred while schema evolved — index absent but code (`schema.ts`) already expected it.

### 4.3 What did NOT cause the incident

- Application bugs in TRACKING-EXPIRY-1 or push notifications.
- Data corruption or duplicate emails on gateway01.
- Missing `0021`–`0025` schema (objects were already present).

---

## 5. Recovery Actions

### 5.1 C1 — Journal Repair (repository)

**File:** `drizzle/meta/_journal.json`

Inserted `0024_orders_ready_push_sent_at` at **idx 24** (`when`: `1778756500000`) between `0023` and `0025`.

| Before | After |
|--------|-------|
| idx 23 → idx 25 (gap) | idx 23 → 24 → 25 (contiguous) |
| 25 journal entries | 26 journal entries |

No database changes.

### 5.2 C2 — Baseline Hash Inserts

**Executed:** 2026-06-18T17:02:07Z  
**Package checksum:** `8d99ab7356d5c532675435691f0e5040f44c6c825a60431dede9d2929fe30dd6`  
**Method:** Single transaction; 21 `INSERT … WHERE NOT EXISTS` on `hash`

| # | Tag | `created_at` |
|---|-----|-------------|
| 1–19 | `0000`–`0018` | Journal `when` values |
| 20 | `0020_account_classification` | `1778756300000` |
| 21 | `0025_orders_ready_at` | `1778756600000` |

**Excluded:** `0019`, `0021`, `0022`, `0023`, `0024` (already recorded or pending DDL).

**Result:** 21 rows inserted; `__drizzle_migrations` 8 → **29**.

### 5.3 C3 — Execute `0019_users_email_unique`

**Executed:** 2026-06-18T17:11:16Z

1. Preflight: index absent, 0 duplicate emails, hash absent — **GO**
2. DDL: `CREATE UNIQUE INDEX users_email_unique ON users (email)`
3. Hash insert: `fb42c4dd92c722f7ebb0f97e0a3fa9cac049cbff01735a4d0fdde4f647f2bc9b`, `created_at`: `1778756200000`

**Result:** Index created; hash recorded (`id=2933421`); rows 29 → **30**.

### 5.4 Explicitly not executed

| Action | Reason |
|--------|--------|
| `db:migrate` / `drizzle-kit migrate` | Unnecessary after manual reconciliation |
| `0025` ALTER | `orders.readyAt` already existed |
| `0021`–`0024` DDL | Schema already applied |
| Orphan SQL files | Not in journal |
| Delete orphan bootstrap rows | Retained as historical record |

---

## 6. Final Production State

### 6.1 `__drizzle_migrations`

| Metric | Value |
|--------|-------|
| Total rows | **30** |
| Journal hashes recorded | **26 / 26** |
| Orphan historical rows | **4** (retained) |
| Duplicate hash groups | **0** |
| Pending journal migrations | **0** |

### 6.2 Schema verification (post-C3)

| Object | Status |
|--------|--------|
| `users_email_unique` index | **Present** |
| `audit_events` | Present |
| `orders.trackingToken` + unique index | Present |
| `customer_push_subscriptions` | Present |
| `orders.readyPushSentAt` | Present |
| `orders.readyAt` | Present |
| Duplicate emails | **0** |

### 6.3 Repository alignment

| Artifact | Status |
|----------|--------|
| `_journal.json` | 26 entries, idx 0–25 contiguous |
| Journal ↔ SQL files | 26/26 matched |
| Journal ↔ DB hashes | 26/26 recorded |
| `schema.ts` ↔ production (audited subset) | Aligned |

---

## 7. Migration Lineage Status

### 7.1 Canonical journal chain (complete)

```text
0000_shiny_blizzard
  → …
  → 0018_session_valid_after
  → 0019_users_email_unique      ✓ recorded + applied
  → 0020_account_classification
  → 0021_audit_events
  → 0022_order_tracking_token
  → 0023_customer_push_subscriptions
  → 0024_orders_ready_push_sent_at ✓ journal repaired (C1); hash pre-existing
  → 0025_orders_ready_at
```

### 7.2 Lineage reconciliation matrix (final)

| idx | Tag | Schema | Hash in DB | Status |
|----:|-----|:------:|:----------:|--------|
| 0–18 | `0000`–`0018` | ✓ | ✓ | **RECONCILED** (C2 baseline) |
| 19 | `0019` | ✓ | ✓ | **RECONCILED** (C3 DDL + hash) |
| 20 | `0020` | ✓ | ✓ | **RECONCILED** (C2 baseline) |
| 21–23 | `0021`–`0023` | ✓ | ✓ | **Already recorded** |
| 24 | `0024` | ✓ | ✓ | **Journal + hash aligned** |
| 25 | `0025` | ✓ | ✓ | **RECONCILED** (C2 baseline; column pre-existed) |

### 7.3 Orphan lineage (documented, retained)

Four `__drizzle_migrations` rows from parallel bootstrap (`0000_exotic_hellfire_club` through `0003_square_krista_starr`) remain. They are **superseded** by canonical journal `0000`–`0003` hashes now also recorded. **Do not delete** without ops sign-off and backup.

### 7.4 Orphan SQL on disk (unchanged)

10 SQL files remain outside journal (legacy `0000`–`0008` duplicates, etc.). **Do not execute manually.**

---

## 8. Before vs After Risk Assessment

| Risk | Before | After |
|------|--------|-------|
| Blind `db:migrate` on production | **Critical** — replay from `0000`, table-exists failure | **Low** — all journal hashes recorded; migrate should be no-op |
| `verify-schema-deployment` failure | **High** — `0019` index missing | **Low** — index present |
| Journal drift (`0024` gap) | **High** — fresh bootstrap would skip `0024` | **Resolved** — idx 24 present |
| Duplicate email → `0019` failure | **Low** (0 dupes at audit) | **Mitigated** — index enforced |
| Wrong DATABASE_URL cluster | **Critical** | **Medium** — requires ongoing env discipline |
| Orphan SQL accidental execution | **High** | **Medium** — documented; needs CI guard |
| `0025` double-ALTER | **High** if migrate run pre-baseline | **Eliminated** — hash baselined, column exists |
| Auth policy gap (duplicate accounts per email) | **Present** | **Closed** — unique index active |
| TRACKING-EXPIRY-1 deploy | **Blocked** (history drift) | **Unblocked** — `readyAt` present + hash recorded |

**Overall risk posture:** **Critical governance gap → Acceptable operational state** with recommended ongoing controls (Section 10).

---

## 9. Lessons Learned

1. **Schema presence ≠ migration history.** Production can be fully functional while `__drizzle_migrations` is severely incomplete. Always audit both layers.

2. **Orphan bootstrap lineages persist.** Early Drizzle naming (`0000_exotic_hellfire_club`) coexists with canonical journal names. Recovery must **baseline canonical hashes**, not delete historical rows.

3. **Journal repair is cheap; blind migrate is expensive.** Inserting one journal entry (C1) and hash rows (C2) is far safer than attempting automated migrate on evolved production.

4. **Hand-published migrations need explicit governance.** `0017`–`0025` without snapshots increases drift risk; `drizzle-kit generate` discipline must resume for new changes.

5. **Pre-execution checksums prevent package tampering.** C2 used approved checksum `8d99ab73…` verified before execution — effective control for ops-run SQL.

6. **Environment targeting must be verified per operation.** gateway01 vs gateway05 confusion was a recurring audit theme; host/database assertion in scripts prevented wrong-cluster writes.

7. **Deferred indexes block verification scripts.** `0019` was the only true schema gap; everything else was history reconciliation.

---

## 10. Governance Recommendations

### 10.1 Immediate (post-closure)

| # | Recommendation | Owner |
|---|----------------|-------|
| G1 | Run `node scripts/migration-preflight.cjs` and `node scripts/verify-schema-deployment.cjs` on gateway01; archive exit codes | Ops |
| G2 | Confirm Vercel Production `DATABASE_URL` host = gateway01 / `mineuqr` | Ops |
| G3 | Commit C1 journal repair if not yet merged to deploy branch | Engineering |
| G4 | Update `docs/DB_MIGRATION_GOVERNANCE.md` to reflect journal `0000`–`0025` and recovery outcome | Engineering |

### 10.2 Ongoing discipline

| # | Recommendation |
|---|----------------|
| G5 | **New schema changes:** `schema.ts` → `drizzle-kit generate` → review SQL → `migrate` on staging → `verify-schema-deployment` → production |
| G6 | **Never** run orphan SQL files from `drizzle/` |
| G7 | **Never** run `db:migrate` on production without preflight showing 0 pending or explicit ops plan |
| G8 | Add CI step: `migration-preflight.cjs` fails on journal/file mismatch |
| G9 | Retain `scripts/execute-baseline-c2.mjs`, `scripts/c3-preflight.mjs`, `scripts/execute-c3-0019.mjs` as audited recovery artifacts (or move to `scripts/recovery/`) |
| G10 | TiDB backup before any future manual `__drizzle_migrations` write |

### 10.3 Do-not-touch

- Orphan `__drizzle_migrations` rows (ids 1, 242596, 403383, 610290)
- Orphan SQL files on disk (document only)
- Rewriting `0000`–`0016` journal history

---

## 11. Roadmap Impact

| Program / Feature | Pre-recovery | Post-recovery |
|-------------------|--------------|---------------|
| **TRACKING-EXPIRY-1** (`orders.readyAt`) | Deploy blocked (history drift; column existed but unrecorded) | **Unblocked** — hash recorded, schema confirmed |
| **BACKGROUND-NOTIFICATIONS-1A** (`0023`/`0024`) | Schema present; governance broken | **Stable** — lineage aligned |
| **AUTH-POLICY-1B.5** (`0019`) | Index missing; verify script fails | **Complete** — unique email enforced |
| **ADMIN-SECURITY-CENTER** (`audit_events`) | Table present; hash recorded since Jun 2026 | **Unchanged** — no action needed |
| **Future `drizzle-kit migrate`** | **NO-GO** | **GO** on gateway01 after spot-check; should be no-op until next journal entry |
| **Fresh staging bootstrap** | Would miss `0024` without journal repair | **Safe** with repaired journal (26 entries) |
| **Commercial / EXEC programs** | Unaffected by migration recovery | Continue; no data migration performed |

---

## 12. Closure Decision

### 12.1 Success criteria (all met)

- [x] Live gateway01 audit completed (Phase B)
- [x] Recovery package simulated and checksum-verified (Phase B.5, C-PREFLIGHT-1)
- [x] TiDB backup confirmed (operator)
- [x] Journal repaired — `0024` at idx 24 (C1)
- [x] 21 baseline hashes inserted (C2)
- [x] `0019` DDL executed + hash recorded (C3)
- [x] 26/26 journal hashes in `__drizzle_migrations`
- [x] 0 duplicate migration hashes
- [x] `users_email_unique` index present
- [x] 0 duplicate email groups
- [x] No application table data modified

### 12.2 Residual items (non-blocking)

| Item | Severity | Action |
|------|----------|--------|
| 4 orphan bootstrap rows in `__drizzle_migrations` | Low | Document; retain |
| 10 orphan SQL files on disk | Low | INFRA cleanup phase; do not delete without backup |
| `docs/DB_MIGRATION_GOVERNANCE.md` stale | Low | Update in follow-up docs PR |
| Vercel Production DB host not re-verified in closure session | Low | Operator dashboard check |
| Legacy extra columns (`auth_provider`, etc.) | Low | Out of scope; production superset |

### 12.3 Final verdict

# **CLOSED — RECOVERY COMPLETE**

MIGRATION-RECOVERY-AUDIT-1 objectives are satisfied. Production migration governance on gateway01 is reconciled with repository journal and `schema.ts`. Normal migration workflow may resume for **new** changes using generate → review → migrate → verify discipline.

---

## Appendix A — Execution Timeline

| Timestamp (UTC) | Event |
|-----------------|-------|
| 2026-06-18T16:14:01Z | Phase B live audit |
| 2026-06-18T16:29:53Z | Phase C-PREFLIGHT-1 — **GO** |
| 2026-06-18T~16:35Z | C1 journal repair (repo) |
| 2026-06-18T17:02:07Z | C2 baseline inserts — 8 → 29 rows |
| 2026-06-18T17:08:30Z | C3-PREFLIGHT — **GO** |
| 2026-06-18T17:11:16Z | C3 `0019` execution — 29 → 30 rows |

## Appendix B — Package Checksums

| Package | SHA-256 |
|---------|---------|
| 21-baseline (C2 approved) | `8d99ab7356d5c532675435691f0e5040f44c6c825a60431dede9d2929fe30dd6` |
| Full execution package (preflight) | `177896b3fad2c7b432ac17d7804d1a00548cc0f928639c5d67f54026e10b84bf` |
| `0019_users_email_unique` | `fb42c4dd92c722f7ebb0f97e0a3fa9cac049cbff01735a4d0fdde4f647f2bc9b` |
| `0024_orders_ready_push_sent_at` | `9155f2d590a2e81807c09769f06b1d13321a91d62b4f196bc1bd3fb37d5639ff` |

## Appendix C — Recovery Scripts (audit artifacts)

| Script | Purpose |
|--------|---------|
| `scripts/execute-baseline-c2.mjs` | C2 baseline execution with checksum gate |
| `scripts/c3-preflight.mjs` | C3 read-only preflight |
| `scripts/execute-c3-0019.mjs` | C3 DDL + hash with reconciliation report |
| `scripts/migration-preflight.cjs` | Ongoing journal vs disk vs DB check |
| `scripts/verify-schema-deployment.cjs` | Auth-critical schema verification |

---

*End of MIGRATION-RECOVERY-AUDIT-1 Final Closure Report.*
