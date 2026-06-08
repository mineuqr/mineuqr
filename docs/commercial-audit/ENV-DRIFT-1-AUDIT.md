# ENV-DRIFT-1 — Environment Drift Resolution Audit

**Program:** Environment Drift (ENV-DRIFT-1)  
**Date:** 2026-06-07  
**Status:** Complete — read-only documentation  

**Mode:** Configuration and provenance audit. No code, database, environment variable, migration, or deployment changes.

**Trigger:** Count divergence between DATA-INTEGRITY audits (`users = 1`, `restaurants = 0`) and operator direct TiDB inspection (`users = 2`, `restaurants = 6`, `categories = 1`, `menu_items = 1`).

---

## Executive summary

| Question | Answer |
|----------|--------|
| Does environment drift exist? | **Yes** — labeling drift, temporal data drift on the same nominal database, and unresolved divergence between operator TiDB view and workspace `DATABASE_URL` |
| Which environments are affected? | **Local/Cursor audit path**, **TiDB operator console** (unverified connection parity), **production deployment** (unverified — not in repo) |
| Which audits are impacted? | **DATA-INTEGRITY-1 Phases B–D**, **DATA-INTEGRITY-1R**, **ASN-5A**, **COMMERCIAL-DATA-SNAPSHOT** — all executed against workspace `.env` at wipe baseline |
| Is production pointing to the correct database? | **Unknown** — Vercel/production `DATABASE_URL` not inspectable from repository; cannot confirm |
| Can DATA-INTEGRITY continue safely? | **No** — until authoritative launch connection string is confirmed and counts reconciled |
| Must DATA-INTEGRITY-1R be rerun? | **Yes** — against the confirmed authoritative launch target |

**Final verdict:** **FAIL** (see Section G).

---

## Section A — Environment Inventory

### A.1 Files inspected

| File | Present in repo? | Notes |
|------|------------------|-------|
| `.env` | **Yes** | Sole env file found |
| `.env.local` | **No** | Not in workspace |
| `.env.production` | **No** | Not in workspace |
| `.env.preview` | **No** | Not in workspace |
| `.env.staging` | **No** | Not in workspace |
| `.env.example` | **No** | Not in workspace |

### A.2 Workspace `.env` (secrets redacted)

| Variable | Target / value (redacted) |
|----------|---------------------------|
| `DATABASE_URL` | `mysql://[REDACTED]:[REDACTED]@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/fcy9GqTzfuy9H9eCsDbdLA?ssl={...}` |
| `JWT_SECRET` | `dev-local-jwt-secret-change-in-production` (weak dev placeholder) |
| `VITE_APP_ID` | `mineuqr-local` |
| `VITE_BASE_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` |
| `VITE_APP_URL` | `http://localhost:3000` |

**Parsed database target:**

| Field | Value |
|-------|-------|
| Host | `gateway05.us-east-1.prod.aws.tidbcloud.com` |
| Port | `4000` |
| Database name | `fcy9GqTzfuy9H9eCsDbdLA` |
| Provider | TiDB Cloud (`*.prod.aws.tidbcloud.com`) |
| TLS | Required (`ssl` JSON param) |

### A.3 Vercel configuration references

| Artifact | `DATABASE_URL` reference? |
|----------|---------------------------|
| `vercel.json` | **No** — build/routing only; no env vars declared |
| `scripts/vercel-handler.ts` | Uses `createApp.production`; inherits runtime `process.env` from Vercel platform |
| Vercel CLI / dashboard | **Not accessible** in this audit session (`vercel` CLI not installed) |

Production deployment env vars are **platform-managed** and **not versioned** in this repository.

### A.4 TiDB configuration references

| Source | Reference |
|--------|-----------|
| Workspace `.env` | Single TiDB Cloud connection string (see A.2) |
| `server/db.ts` | Auto-TLS for `*.tidbcloud.com` hosts |
| `drizzle.config.ts` | `process.env.DATABASE_URL` for migrations |
| Audit scripts | `process.env.DATABASE_URL` only — no hardcoded alternates |
| Repo-wide search | **No second** TiDB host or database name found in tracked files |

### A.5 Other runtime database configuration

| Consumer | Variable | Fallback |
|----------|----------|----------|
| `server/db.ts` → `getDb()` | `process.env.DATABASE_URL` | Returns `null` if unset / connect fails |
| `server/_core/env.ts` | `ENV.databaseUrl` = `DATABASE_URL ?? ""` | Empty string |
| `drizzle.config.ts` | `DATABASE_URL` | Throws if missing |
| All `scripts/*.mjs` audit tools | `DATABASE_URL` | Exit 1 if missing |
| `server/_core/index.ts` | `import "dotenv/config"` at startup | Loads `.env` from cwd |

**No alternate variable names** (`MYSQL_URL`, `TIDB_URL`, etc.) found in application code.

---

## Section B — Runtime Resolution Audit

### B.1 Connection factory

```text
process.env.DATABASE_URL
  → parseDatabaseUrl()          [server/db.ts]
  → createRuntimeMysqlPool()    [TiDB TLS if *.tidbcloud.com]
  → drizzle(mysql2 pool)
  → getDb()
```

**Evidence:** `server/db.ts` L54–112. Single code path; no environment-specific database selector.

### B.2 Environment selection logic

| Runtime | How `DATABASE_URL` is resolved | Evidence |
|---------|-------------------------------|----------|
| **Local dev** (`pnpm dev`) | `import "dotenv/config"` in `server/_core/index.ts` loads **workspace `.env`**; OS env vars override dotenv | `server/_core/index.ts` L1 |
| **Audit scripts** | `node -r dotenv/config scripts/...` loads **workspace `.env`** unless shell exports override | All DATA-INTEGRITY audit invocations |
| **Drizzle CLI** | `DATABASE_URL` from shell or dotenv when run from project root | `drizzle.config.ts` |
| **Vercel preview** | Vercel-injected `process.env` at cold start | Not inspectable locally; `vercel.json` does not define it |
| **Vercel production** | Same as preview — platform env only | Not inspectable locally |

### B.3 Fallback and override logic

| Mechanism | Present? |
|-----------|----------|
| Fallback to second database URL | **No** |
| `NODE_ENV`-based database switch | **No** |
| `.env.local` / `.env.production` cascade | **No files** — dotenv default loads `.env` only unless extended |
| Read replica routing | **No** |
| Connection pool branch selection | **No** |

**Shell override:** If `DATABASE_URL` is exported in the parent shell before `node -r dotenv/config`, it **overrides** `.env`. Cursor audit sessions did not document shell exports; default path is workspace `.env`.

### B.4 Labeling vs infrastructure mismatch

| Label used in audits | Actual connection target |
|----------------------|--------------------------|
| `local-env` | TiDB Cloud **prod-tier** gateway (`gateway05.us-east-1.prod.aws.tidbcloud.com`) |
| `AUDIT_TARGET=local-env` (default in phase2 script) | Same |
| `VITE_APP_ID=mineuqr-local` | Suggests local app identity while DB is cloud |

**Finding:** Audits were **mislabeled** as local-dev environment while connecting to a **managed TiDB Cloud cluster**. This is **naming drift**, not proof of a different database — but it obscures which logical environment was audited.

### B.5 Which `DATABASE_URL` is actually used?

| Context | Answer |
|---------|--------|
| Local development (this workspace) | Workspace `.env` → `fcy9GqTzfuy9H9eCsDbdLA` on `gateway05...tidbcloud.com` |
| Cursor-agent audit execution | **Same** — verified by live re-query 2026-06-07T22:05:55Z |
| Preview deployments | **Unknown** — requires Vercel dashboard / CLI |
| Production deployments | **Unknown** — requires Vercel dashboard / CLI; may differ from workspace `.env` |

---

## Section C — Historical Audit Target Verification

### C.1 Audit provenance matrix

| Audit | Date (UTC) | Connection source | Host | Database | Reported counts (users / restaurants) |
|-------|------------|-------------------|------|----------|--------------------------------------|
| COMMERCIAL-DATA-SNAPSHOT | 2026-06-07T10:56 | `.env` `DATABASE_URL` | TiDB Cloud prod gateway | `fcy9GqTzfuy9H9eCsDbdLA` | 1 / 0 |
| ASN-5A | 2026-06-07T19:24 | `.env` `DATABASE_URL` | Same | Same | 1 / 0 |
| DATA-INTEGRITY-1 Phase B | 2026-06-07 | `node -r dotenv/config` + phase2 script | Same | Same | 1 / 0 |
| DATA-INTEGRITY-1 Phase C | 2026-06-07 | Schema + same DB re-run | Same | Same | 1 / 0 |
| DATA-INTEGRITY-1 Phase D | 2026-06-07 | Readonly probes via dotenv | Same | Same | 1 / 0 |
| DATA-INTEGRITY-1R | 2026-06-07T21:45 | `.env` `DATABASE_URL` | Same | Same | 1 / 0 |
| **ENV-DRIFT-1 reconciliation** | 2026-06-07T22:05 | `.env` `DATABASE_URL` | Same | Same | **1 / 0** |

**Evidence for Cursor path:** Phase2 script output includes `"databaseName": "fcy9GqTzfuy9H9eCsDbdLA"` and `"auditTarget": "local-env"`. All audits are **internally consistent** on the workspace connection.

### C.2 Operator TiDB inspection (reported, not independently reproduced)

| Source | users | restaurants | categories | menu_items |
|--------|------:|------------:|-----------:|-----------:|
| Operator direct TiDB inspection | **2** | **6** | **1** | **1** |
| Workspace `DATABASE_URL` (live) | **1** | **0** | **0** | **0** |

**Reconciliation:** At audit time, workspace connection **does not** observe the operator-reported inventory. Divergence is **active**, not stale documentation.

### C.3 Temporal history on nominal database `fcy9GqTzfuy9H9eCsDbdLA`

| Snapshot | Timestamp | users | restaurants | categories | menu_items | Source |
|----------|-----------|------:|------------:|-----------:|-----------:|--------|
| CLEAN-DB-2 dry-run | 2026-06-04T20:49 | 3 | 3 | 5 | 20 | `audit-clean-db-2-dryrun.json` |
| Commercial snapshot | 2026-06-07T10:56 | 1 | 0 | 0 | 0 | `COMMERCIAL-DATA-SNAPSHOT.md` |
| DATA-INTEGRITY audits | 2026-06-07 | 1 | 0 | 0 | 0 | Phase B–D scripts |
| Operator TiDB console | *(undated)* | 2 | 6 | 1 | 1 | User report |
| ENV-DRIFT-1 live query | 2026-06-07T22:05 | 1 | 0 | 0 | 0 | This audit |

**Interpretation:** The same **database name** has held **at least four distinct inventory states** over four days. Data is **mutable** and audits captured **one specific state** (post-wipe admin-only baseline).

### C.4 What dataset did prior audits actually hit?

| Classification | Applies? | Rationale |
|----------------|----------|-----------|
| Launch dataset | **No** | 0 restaurants; no test account footprint |
| Legacy dataset | **Partially** | 2026-06-04 had legacy content (3/3); 2026-06-07 audits hit wiped state |
| Empty dataset | **Yes** | Operational tables empty except 1 admin user |
| Unknown dataset | **Yes** | Operator view (2/6) does not match any automated snapshot |

**Answer:** DATA-INTEGRITY-1 Phases B–D and DATA-INTEGRITY-1R were executed against an **empty / post-wipe dataset** on the workspace `DATABASE_URL` target — **not** the operator-observed launch-like dataset.

---

## Section D — Database Inventory

All database/cluster references discovered in the repository and audit trail.

| ID | Host | Database name | Declared usage | Observed states | Status |
|----|------|---------------|----------------|-----------------|--------|
| **DB-1** | `gateway05.us-east-1.prod.aws.tidbcloud.com:4000` | `fcy9GqTzfuy9H9eCsDbdLA` | Workspace `.env`; all local scripts; all Cursor audits | 1/0 (current), 3/3 (2026-06-04), operator reports 2/6 | **ACTIVE** (sole repo connection) |
| **DB-2** | *(not in repo)* | *(unknown)* | Implied Vercel production / preview | **Not observed** | **UNKNOWN** |
| **DB-3** | *(not in repo)* | *(unknown)* | Implied TiDB console operator session | 2 users / 6 restaurants per operator | **UNKNOWN** — may be DB-1 branch/view or separate endpoint |

### D.1 TiDB branch hypothesis (not confirmable from repo)

TiDB Cloud Serverless supports **branches** with **separate connection strings** that may share similar host patterns. Operator console SQL editor may default to a **different branch** than the connection string in `.env`, producing **identical database names with different row counts**.

**Status:** **UNKNOWN** — branch name and operator connection string were not available in this audit.

### D.2 Multiple active databases?

| Evidence | Conclusion |
|----------|------------|
| Only one `DATABASE_URL` in repo | **One configured target** in workspace |
| Operator count divergence | **At least two observable data planes** (workspace URL vs operator console) |
| Vercel env not inspected | **Possible third** production deployment target |

---

## Section E — Drift Findings

| ID | Type | Description | Evidence | Risk |
|----|------|-------------|----------|------|
| **ED-01** | Environment labeling | Audits labeled `local-env` while connecting to TiDB Cloud prod-tier gateway | `.env` host; phase2 `auditTarget: local-env` | **High** — wrong mental model for launch readiness |
| **ED-02** | Temporal data drift | Same DB name ranged 3/3 → 1/0 → operator 2/6 within days | Timeline §C.3 | **High** — audit conclusions expire quickly |
| **ED-03** | Connection / inventory drift | Workspace URL returns 1/0; operator TiDB shows 2/6/1/1 | Live re-query 2026-06-07T22:05 vs user report | **Critical** — audits may not reflect operator truth |
| **ED-04** | Configuration ambiguity | `VITE_APP_ID=mineuqr-local` + cloud prod DB host | `.env` | **Medium** — local vs prod identity mixed |
| **ED-05** | Missing env templates | No `.env.example`, `.env.staging`, `.env.production` | File inventory §A.1 | **Medium** — no documented per-environment matrix |
| **ED-06** | Production env invisible | Vercel `DATABASE_URL` not in repo; CLI unavailable | `vercel.json`; CLI check | **High** — cannot verify prod ↔ TiDB alignment |
| **ED-07** | Stale audit target assumption | DATA-INTEGRITY-1R concluded FAIL on empty DB; operator sees populated DB | §C.2 | **High** — launch verdict may be wrong target |
| **ED-08** | CLEAN-DB-2 artifact | Documented wipe script targets same DB name; explains 1/0 state | `scripts/clean-db-2-execute.mjs`, dry-run JSON | **Medium** — intentional wipe vs launch data confusion |
| **ED-09** | Migration journal drift | Repo journal lists 20 migrations; live `__drizzle_migrations` had 4 rows (per Phase D) | Phase D index audit | **Medium** — schema state may differ across connections |
| **ED-10** | Single-variable coupling | All tooling uses one `DATABASE_URL` with no `AUDIT_TARGET` enforcement | Scripts grep | **Medium** — easy to audit wrong DB if URL not verified before run |

---

## Section F — Authoritative Source Decision

### AUTHORITATIVE LAUNCH DATABASE

**Provisional designation (audit session):**

> **The database observed by the operator in direct TiDB inspection** — **2 users, 6 restaurants, 1 category, 1 menu item** — is the **preferred authoritative launch candidate** until its connection string is captured and verified.

**Rationale:**

1. **Launch intent** — DATA-INTEGRITY-1R and program context expect a populated test footprint (including multi-restaurant test account), which matches operator counts more closely than the wiped 1/0 baseline.
2. **Workspace `.env` state** — Returns **admin-only empty** inventory inconsistent with expected launch readiness and operator observation.
3. **Audit insufficiency** — All automated audits on workspace `.env` documented an **empty/post-wipe** plane, not a launch plane.
4. **Cannot confirm DB-1 = operator DB** — Same database **name** is insufficient; **connection string parity** (host, port, user, branch, endpoint) must be proven.

**Not authoritative for launch (current evidence):**

| Target | Why |
|--------|-----|
| Workspace `.env` → `fcy9GqTzfuy9H9eCsDbdLA` at 1/0/0/0 | Post-wipe; contradicts operator inventory |
| DATA-INTEGRITY-1R verdict on 1/0 state | Based on ED-03 drift |
| 2026-06-04 dry-run 3/3 snapshot | Historical; superseded |

**Required before locking authority:**

1. Export operator TiDB connection string (redacted host/user/db) and compare to workspace `.env` **byte-for-byte** (except secrets).
2. Export Vercel production and preview `DATABASE_URL` metadata from dashboard.
3. Confirm TiDB **branch** name for each connection.
4. Re-run inventory counts on the designated launch connection.

---

## Section G — Final Verdict

### G.1 Success criteria answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Does environment drift exist? | **Yes** — labeling, temporal data, and operator vs workspace inventory divergence |
| 2 | Which environments are affected? | Workspace/Cursor audit path; operator TiDB console (unverified parity); production Vercel (unverified) |
| 3 | Which audits are impacted? | DATA-INTEGRITY-1 B–D, DATA-INTEGRITY-1R, ASN-5A, COMMERCIAL-DATA-SNAPSHOT |
| 4 | Is current production pointing to the correct database? | **Cannot determine** — production env not inspectable from repo |
| 5 | Can DATA-INTEGRITY continue safely? | **No** — until authoritative connection is confirmed |
| 6 | Must DATA-INTEGRITY-1R be rerun? | **Yes** — on confirmed launch `DATABASE_URL` after ED-03 resolution |

### G.2 Classification

## **FAIL**

### G.3 Rationale

| PASS criterion | Result |
|----------------|--------|
| Single truth map | **Failed** — two conflicting inventories on same nominal DB name |
| Audits hit launch dataset | **Failed** — automated audits hit empty/wiped state |
| Production verified | **Failed** — not inspectable |
| Safe to continue integrity program | **Failed** — ED-03 blocks |

**PASS WITH WARNINGS** would require a single confirmed connection with only labeling issues. **Operator 2/6 vs workspace 1/0** exceeds labeling — it is **active connection or branch drift**.

### G.4 Immediate documentation actions (no fixes executed)

1. Record operator TiDB connection metadata (host, database, branch) alongside workspace `.env` redacted target.
2. Capture Vercel production/preview `DATABASE_URL` host + database name from dashboard.
3. Re-run DATA-INTEGRITY-1R inventory template against the **designated authoritative** connection only.
4. Rename audit targets from `local-env` to **`tidb-cloud-<branch-or-role>`** in future audit JSON.

---

## Appendix A — Live reconciliation query (ENV-DRIFT-1)

**Executed:** 2026-06-07T22:05:55.188Z  
**Method:** `node -r dotenv/config` readonly `SELECT COUNT(*)`  
**Connection:** Workspace `.env` `DATABASE_URL`

| Table | Count |
|-------|------:|
| users | 1 |
| restaurants | 0 |
| categories | 0 |
| menu_items | 0 |
| user_subscriptions | 0 |
| orders | 0 |

**users by role:** `admin` = 1  
**restaurants by user:** *(none)*

---

## Appendix B — Related documents

| Document | Relevance |
|----------|-----------|
| `DATA-INTEGRITY-1-AUDIT.md` | Phases A–D on workspace URL |
| `DATA-INTEGRITY-1-PRODUCTION-VERIFICATION.md` | 1R pass (if present); FAIL on empty inventory |
| `ASN-5A-COMMERCIAL-DATA-REALITY-AUDIT.md` | Same 1/0 counts; warned prod may differ |
| `COMMERCIAL-DATA-SNAPSHOT.md` | Same target; 1/0 |
| `audit-clean-db-2-dryrun.json` | Prior 3/3 state on same DB name |
| `scripts/clean-db-2-execute.mjs` | Wipe tooling explaining 1/0 |
| `docs/MIGRATION_STAGING_CHECKLIST.md` | Staging `DATABASE_URL` discipline |

---

*End of ENV-DRIFT-1. Environment drift audit. Read-only. No remediation.*
