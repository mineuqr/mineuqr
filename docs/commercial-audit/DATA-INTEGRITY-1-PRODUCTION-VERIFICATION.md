# DATA-INTEGRITY-1R — Production Dataset Verification

**Program:** Data Integrity (DATA-INTEGRITY-1R)  
**Mode:** Read-only documentation. No code, database, migration, or deployment changes.

---

# Part I — Initial Run (Legacy Monu — Superseded)

**Date:** 2026-06-07  
**Status:** **Superseded** — wrong audit target (ENV-DRIFT-1 / ENV-DRIFT-2)

## I.1 Environment (initial run)

| Field | Value |
|-------|-------|
| Host | `gateway05.us-east-1.prod.aws.tidbcloud.com` |
| Database | `fcy9GqTzfuy9H9eCsDbdLA` |
| Source | Workspace `.env` via `node -r dotenv/config` |
| Region | US East |

**Authoritative launch dataset?** **NO** — legacy Monu-era cluster.

## I.2 Inventory (initial run — automated)

| Entity | Count |
|--------|------:|
| users | 1 |
| restaurants | 0 |
| categories | 0 |
| menu_items | 0 |
| orders | 0 |
| order_items | 0 |
| subscriptions | 0 |
| invoices | 0 |
| notifications | 0 |
| auth_tokens | 3 |

## I.3 Initial verdict

**FAIL** — empty post-wipe Monu baseline; not launch dataset.

---

# Part II — Re-Run (MineuQR Launch Candidate)

**Date:** 2026-06-08  
**Status:** **BLOCKED BY TOOLING** — TLS transport not configured in readonly audit script  
**Supersedes:** Part I inventory findings for environment targeting; automated row-level counts not produced

---

## Section 1 — Environment Verification (Re-Run)

### 1.1 Required audit target

| Field | Required value |
|-------|----------------|
| Host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| Database | `mineuqr` |

### 1.2 Connection method

| Item | Value |
|------|-------|
| Workspace `.env` | **Not used** (no `dotenv/config`) |
| Legacy Monu host/db | **Not used** |
| Connection source | Shell-exported `DATABASE_URL` only |
| Verification script | Ephemeral readonly probe (host/db pre-check + `mysql2` connect) |
| Captured at (UTC) | `2026-06-08T14:38:24.534Z` |

### 1.3 Parsed connection target (pre-connect)

| Field | Observed |
|-------|----------|
| Host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| Port | `4000` |
| Database | `mineuqr` |
| Username prefix | `2fe5J8XJDcV9Gt9.[REDACTED]` *(TiDB Cloud cluster prefix)* |

### 1.4 Connection results (attempt history)

| Attempt | Outcome | Error |
|---------|---------|-------|
| 2026-06-08 (early) | Failed before transport | `Access denied` — wrong cluster credential prefix |
| 2026-06-08 (corrected credentials) | Reached TiDB; stopped at transport | `Connections using insecure transport are prohibited` |

**Final blocking error:**

```text
Connections using insecure transport are prohibited
```

**Interpretation:** Connection reached TiDB Cloud on `gateway01` with correct MineuQR credentials and passed URL/host/database validation, but **mysql2** rejected the session because the readonly audit tooling did not supply TLS/SSL options required by TiDB Cloud Serverless.

### 1.5 Is the active audit target exactly `gateway01.eu-central-1.prod.aws.tidbcloud.com` / `mineuqr`?

| Check | Result |
|-------|--------|
| URL host matches required host | **YES** |
| URL database matches required database | **YES** |
| Credentials accepted to transport layer | **YES** (reached TiDB transport validation) |
| Successful authenticated readonly `SELECT` session | **NO** — TLS tooling gap |

**Answer: YES** for environment targeting; **NO** for completed automated audit execution.

**Evidence:** Host and database name verified against required MineuQR launch target. ENV-DRIFT investigation is **resolved** — legacy Monu (`gateway05` / `fcy9…`) and active MineuQR (`gateway01` / `mineuqr`) are distinct targets. Automated inventory queries did not run due to tooling, not wrong target.

---

## Section 2 — Dataset Inventory (Re-Run)

**Status:** **NOT EXECUTED** — audit stopped at connection failure.

### 2.1 Automated counts

| Entity | Re-run count |
|--------|-------------|
| users | *Not queried* |
| restaurants | *Not queried* |
| categories | *Not queried* |
| menu_items | *Not queried* |
| orders | *Not queried* |
| order_items | *Not queried* |
| subscriptions | *Not queried* |
| invoices | *Not queried* |
| notifications | *Not queried* |
| auth_tokens | *Not queried* |

### 2.2 Operator manual baseline (TiDB Cloud direct inspection — partially verified)

| Entity | Operator-reported count | Automated audit-verified |
|--------|----------------------:|:------------------------:|
| users | 2 | **No** (tooling blocked) |
| restaurants | 6 | **No** (tooling blocked) |
| categories | 1 | **No** (tooling blocked) |
| menu_items | 1 | **No** (tooling blocked) |

**Partial verification status:** Inventory counts accepted as **environmentally validated** via direct TiDB Cloud console inspection, pending automated readonly confirmation when TLS-capable audit tooling is available.

### 2.3 Comparison vs Part I (legacy Monu)

| Entity | Part I (Monu) | Re-run (MineuQR) |
|--------|-------------:|------------------|
| users | 1 | *Not verified* (operator: 2) |
| restaurants | 0 | *Not verified* (operator: 6) |
| categories | 0 | *Not verified* (operator: 1) |
| menu_items | 0 | *Not verified* (operator: 1) |

**Conclusion:** Part I counts are **invalidated** as launch inventory. Re-run **intended** to supersede with MineuQR counts but **could not produce automated counts** in this session.

---

## Section 3 — Ownership Verification (Re-Run)

**Status:** **NOT EXECUTED**

Planned checks (not run):

| Check | Result |
|-------|--------|
| Restaurants without owner user | — |
| Categories without restaurant | — |
| Menu items without parents | — |
| M3 (`menu_items.restaurantId` ≠ category restaurant) | — |
| Subscription owner ≠ restaurant owner | — |
| Invoice parent mismatch | — |
| Cross-account contamination | — |

---

## Section 4 — Admin Account Verification (Re-Run)

**Status:** **NOT EXECUTED**

| Check | Result |
|-------|--------|
| Admin account exists | — |
| Admin → Restaurant → Category → Menu Item chain | — |

*No secrets recorded.*

---

## Section 5 — Test Account Verification (Re-Run)

**Status:** **NOT EXECUTED**

**Expected:** Test user → **5 restaurants**

| Check | Result |
|-------|--------|
| Test user exists (`role = user`) | — |
| Restaurant count per test user | — |
| Duplicate slugs | — |
| Ownership anomalies | — |

---

## Section 6 — Data Quality Verification (Re-Run)

**Status:** **NOT EXECUTED**

| Check | Result |
|-------|--------|
| Duplicate emails | — |
| Duplicate restaurant slugs | — |
| Malformed URLs | — |
| Localhost remnants | — |
| Expired unused auth tokens | — |
| Invalid timestamps | — |

---

## Section 7 — Comparison Against Legacy Audit

### 7.1 Environment differences

| Dimension | Legacy Monu (Part I) | MineuQR launch (intended re-run) |
|-----------|----------------------|----------------------------------|
| Host | `gateway05.us-east-1…` | `gateway01.eu-central-1…` |
| Database | `fcy9GqTzfuy9H9eCsDbdLA` | `mineuqr` |
| Region | US East | EU Central |
| Connection in Part I | Workspace `.env` + dotenv | Shell `DATABASE_URL`, no dotenv |
| Automated access | **Success** (Monu only) | **Blocked** (TLS tooling gap on `gateway01`) |

### 7.2 Corrected findings

| Finding | Legacy audit | Re-run status |
|---------|--------------|---------------|
| Launch dataset identity | Incorrectly implied Monu was only DB | **Corrected** — MineuQR is `gateway01` / `mineuqr` |
| User/restaurant inventory | 1 / 0 reported as factual launch state | **Invalidated** — Monu post-wipe baseline |
| Orphan/ownership integrity on launch data | Vacuously 0 on empty Monu | **Pending** — requires successful MineuQR connection |
| ENV-DRIFT root cause | Unconfirmed | **Resolved** — distinct clusters confirmed; `gateway01`/`mineuqr` is launch target |
| Automated re-run blocker | Credential failure (early attempt) | **Tooling** — readonly script lacks TiDB TLS (`BLOCKED BY TOOLING`) |

### 7.3 Invalidated findings (from Part I)

| ID | Invalidated finding |
|----|---------------------|
| INV-01 | "Launch dataset has 0 restaurants" |
| INV-02 | "Launch dataset has 1 user only" |
| INV-03 | "Commercial/subscription inventory is empty on launch DB" |
| INV-04 | Part I **FAIL** verdict based on Monu emptiness as launch blocker |

### 7.4 Findings that remain valid

| Finding | Why still valid |
|---------|-----------------|
| ENV-DRIFT-1 / ENV-DRIFT-2 diagnosis | Independent of re-run connection |
| DATA-INTEGRITY-1 Phase A (schema) | Code/schema derived |
| Phase C/D model-level POTENTIAL ISSUES | Apply to any TiDB instance with same schema |
| Part I orphan counts on Monu | Factual for Monu at query time — not launch-relevant |

---

## Section 8 — Updated Verdict (Re-Run)

### 8.1 Success criteria answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Is this the launch dataset? | **Yes** — `gateway01` / `mineuqr` confirmed as launch target (ENV-DRIFT resolved); inventory via direct TiDB inspection |
| 2 | Are orphan records present? | **Unknown** — automated checks not run; Phase E/F may evaluate |
| 3 | Are ownership chains intact? | **Unknown** — automated checks not run |
| 4 | Are duplicate identifiers present? | **Unknown** — automated checks not run |
| 5 | Launch-blocking integrity issues? | **None identified** via environment validation; row-level integrity **pending** automated pass |
| 6 | MineuQR dataset ready for commercial launch? | **Partially verified** — environment and manual inventory only |

### 8.2 Classification

## **BLOCKED BY TOOLING**

*(Partial verification: environment targeting + direct TiDB inspection)*

### 8.3 Rationale

| Factor | Assessment |
|--------|------------|
| Environment targeting | **Verified** — host `gateway01.eu-central-1…`, database `mineuqr` |
| Credentials / database existence | **Verified** — connection reached TiDB transport validation |
| ENV-DRIFT | **Resolved** — Monu vs MineuQR distinction confirmed |
| Automated inventory / integrity checks | **Not produced** — script uses `mysql.createConnection(url)` without TLS |
| Root cause | `scripts/data-integrity-audit-phase2-readonly.mjs` L477 — no SSL config; runtime app uses `createRuntimeMysqlPool()` in `server/db.ts` L76–99 with TiDB TLS auto-injection |
| Part I supersession | **Environment and inventory baseline superseded**; automated orphan/quality findings **deferred** |

**Not blocked by:** data integrity findings, credentials, database existence, or environment targeting.

**Blocked by:** missing TLS transport configuration in readonly audit tooling.

### 8.4 Tooling gap (evidence — no fix applied in this deliverable)

| Component | TLS handling |
|-----------|--------------|
| `server/db.ts` → `createRuntimeMysqlPool()` | Parses `?ssl=` from URL; auto-injects `{ minVersion: 'TLSv1.2', rejectUnauthorized: true }` for `*.tidbcloud.com` |
| `scripts/data-integrity-audit-phase2-readonly.mjs` | `mysql.createConnection(url)` only — **no SSL options** |

### 8.5 Program recommendation (documentation only)

| Action | Status |
|--------|--------|
| Record DATA-INTEGRITY-1R as **partially verified** (environment + direct TiDB inspection) | **Approved** |
| Proceed with **Phase E — Legacy Data Audit** | **Recommended** |
| Proceed with **Phase F — Migration Safety Audit** | **Recommended** |
| Full DATA-INTEGRITY-1R automated completion | **Deferred** until TLS-capable readonly tooling (future change request; not in scope here) |

### 8.6 Future unblock (when tooling updated — not executed)

1. Align readonly audit connection with `createRuntimeMysqlPool()` TLS behavior (or equivalent `ssl` options on `createConnection`).
2. Run: `DATABASE_URL='<mineuqr-url>' AUDIT_TARGET=mineuqr-launch-rerun node scripts/data-integrity-audit-phase2-readonly.mjs`
3. Complete Part II Sections 2–6 automated counts and integrity checks.
4. Do **not** use workspace `.env` (Monu `gateway05` / `fcy9…`).

---

## Appendix A — Audit provenance

| Run | Timestamp | Host | Database | Method | Outcome |
|-----|-----------|------|----------|--------|---------|
| Part I | 2026-06-07 | `gateway05.us-east-1…` | `fcy9GqTzfuy9H9eCsDbdLA` | dotenv + readonly SQL | Complete (**wrong target**) |
| Part II (attempt 1) | 2026-06-08 | `gateway01.eu-central-1…` | `mineuqr` | Shell URL, no dotenv | Access denied (wrong credential prefix) |
| Part II (attempt 2) | 2026-06-08 | `gateway01.eu-central-1…` | `mineuqr` | Shell URL + MineuQR creds | **BLOCKED BY TOOLING** — insecure transport |
| Direct TiDB inspection | Operator | `gateway01.eu-central-1…` | `mineuqr` | TiDB Cloud console | **Partial** — 2/6/1/1 counts |

---

## Appendix B — Related documents

| Document | Role |
|----------|------|
| `ENV-DRIFT-1-AUDIT.md` | Drift discovery |
| `ENV-DRIFT-2-ALIGNMENT-PLAN.md` | MineuQR target definition |
| `DATA-INTEGRITY-1-AUDIT.md` | Phases A–D (Monu-targeted) |
| `scripts/data-integrity-audit-phase2-readonly.mjs` | Phase 2 checks (rerun when creds available) |

---

# Part III — Execution Status Update

**Date:** 2026-06-08  
**Classification:** **BLOCKED BY TOOLING**

## III.1 Summary

Re-run against MineuQR launch database (`gateway01.eu-central-1.prod.aws.tidbcloud.com` / `mineuqr`) confirmed:

| Verified | Not verified (automated) |
|----------|--------------------------|
| Correct host | Full readonly inventory script output |
| Correct database name | Orphan / ownership / quality probes |
| Credentials reach TiDB transport layer | Phase 2 script 22-check suite |
| ENV-DRIFT resolution | Launch-blocking row-level integrity verdict |

## III.2 Blocker detail

```text
Connections using insecure transport are prohibited
```

Readonly audit script (`scripts/data-integrity-audit-phase2-readonly.mjs`) passes `DATABASE_URL` directly to `mysql.createConnection()` without TLS configuration. TiDB Cloud Serverless requires encrypted transport. Application runtime (`server/db.ts`) already handles this via `createRuntimeMysqlPool()`; audit tooling does not.

## III.3 Implications

| Area | Status |
|------|--------|
| ENV-DRIFT investigation | **Resolved** |
| Launch target identity | **Confirmed** (`gateway01` / `mineuqr`) |
| DATA-INTEGRITY-1R automated completion | **Deferred** (tooling) |
| DATA-INTEGRITY program continuation | **Proceed** with Phase E (Legacy Data Audit) and Phase F (Migration Safety Audit) |

## III.4 Recorded verification level

**DATA-INTEGRITY-1R:** **Partially verified**

- Environment validation: **complete**
- Direct TiDB inspection inventory (2 users, 6 restaurants, 1 category, 1 menu item): **recorded**
- Automated integrity audit: **not complete**

---

*End of DATA-INTEGRITY-1R. Partially verified; blocked by readonly TLS tooling. Read-only. No remediation.*
