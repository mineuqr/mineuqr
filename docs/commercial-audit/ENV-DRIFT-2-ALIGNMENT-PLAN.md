# ENV-DRIFT-2 — Environment Alignment Plan

**Program:** Environment Drift (ENV-DRIFT-2)  
**Date:** 2026-06-07  
**Status:** Planning complete — **no implementation**  

**Mode:** Read-only verification + alignment planning only. No code, environment variable, migration, or deployment changes in this deliverable.

**Inputs:**

- `ENV-DRIFT-1-AUDIT.md` (drift confirmed; production Vercel env not inspectable from repo)
- ENV-DRIFT-2 operator confirmation (two distinct TiDB targets)
- Workspace `.env` (verified read-only)

---

## Executive summary

ENV-DRIFT-1 established that workspace tooling audited the **wrong data plane** relative to the launch candidate. ENV-DRIFT-2 confirms **two separate TiDB clusters**:

| Role | Host | Database | Evidence |
|------|------|----------|----------|
| **Legacy / Monu (local `.env` today)** | `gateway05.us-east-1.prod.aws.tidbcloud.com` | `fcy9GqTzfuy9H9eCsDbdLA` *(workspace file)* | `.env` verified 2026-06-07 |
| **Active MineuQR (launch candidate)** | `gateway01.eu-central-1.prod.aws.tidbcloud.com` | `mineuqr` | Operator TiDB Cloud manual counts |

**Name note:** ENV-DRIFT-2 context references legacy database `qTzfcy9Gfuy9H9eCsDbdLA`. Workspace `.env` contains `fcy9GqTzfuy9H9eCsDbdLA` on the **same host**. Treat as the same legacy Monu-era cluster unless TiDB console shows both names as distinct databases on `gateway05`.

This document plans safe alignment. **Nothing is executed here.**

---

## Section A — Current Environment Map

Evidence-only. **No assumptions** for Preview, Production, or Staging.

| Environment | Current target | Intended target | Status |
|-------------|----------------|-----------------|--------|
| **Local** | `gateway05.us-east-1…` / `fcy9GqTzfuy9H9eCsDbdLA` via workspace `.env` `DATABASE_URL` | `gateway01.eu-central-1…` / `mineuqr` (launch candidate) | **MISALIGNED** |
| **Preview** | **Unknown** — not in repo; Vercel platform env | `gateway01.eu-central-1…` / `mineuqr` *(intended per launch candidate)* | **UNVERIFIED** |
| **Production** | **Unknown** — not in repo; Vercel platform env | `gateway01.eu-central-1…` / `mineuqr` *(intended per launch candidate)* | **UNVERIFIED** |
| **Staging** | **Unknown** — no `.env.staging`, no staging URL in repo | Dedicated non-prod MineuQR DB or TiDB branch *(TBD)* | **NOT CONFIGURED IN REPO** |

### A.1 Local — verified evidence

| Item | Value |
|------|-------|
| Config file | `.env` (sole env file in workspace) |
| `DATABASE_URL` host | `gateway05.us-east-1.prod.aws.tidbcloud.com:4000` |
| `DATABASE_URL` database | `fcy9GqTzfuy9H9eCsDbdLA` |
| `VITE_APP_ID` | `mineuqr-local` |
| `JWT_SECRET` | `dev-local-jwt-secret-change-in-production` (weak dev placeholder) |
| Base URLs | `http://localhost:3000` |
| R2 / email / payment vars | **Not set** in workspace `.env` |
| Last automated inventory (legacy target) | users **1**, restaurants **0** (ENV-DRIFT-1 live query) |

### A.2 Active MineuQR — operator-verified evidence

| Item | Value |
|------|-------|
| Host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| Database | `mineuqr` |
| Manual TiDB Cloud counts | users **2**, restaurants **6**, categories **1**, menu_items **1** |
| Role | Launch candidate dataset |

### A.3 Preview / Production / Staging — evidence gap

| Source checked | Result |
|----------------|--------|
| `vercel.json` | No `DATABASE_URL` or env declarations |
| `.env.production`, `.env.preview`, `.env.staging` | **Absent** |
| Vercel CLI | **Not available** in audit session |
| GitHub secrets | **Not available** in audit session |
| `docs/MIGRATION_STAGING_CHECKLIST.md` | Expects staging `DATABASE_URL` discipline — **no value recorded** |

**Conclusion:** Only **Local** current target is proven from repository. Whether **Production already points at `mineuqr`** is **unknown** and must be verified in Vercel/TiDB console before any local alignment.

---

## Section B — Runtime Impact Analysis

**Scenario:** Local `DATABASE_URL` switched from **Monu legacy** (`gateway05` / `fcy9…`) → **MineuQR active** (`gateway01` / `mineuqr`).

Connection path is unchanged in code: `process.env.DATABASE_URL` → `getDb()` (`server/db.ts`). No code change required for switch — **only env + operational behavior changes**.

### B.1 Domain impact matrix

| Domain | Current behavior (Monu DB) | After switch (MineuQR DB) | Risk |
|--------|---------------------------|---------------------------|------|
| **Auth** | Sessions/JWT independent of DB host; users in Monu DB (1 admin, wiped) | Login resolves against **MineuQR users** (2 accounts); existing browser cookies may reference users absent or different in new DB | **High** — session/user mismatch until re-login |
| **Auth tokens** | `auth_tokens` on Monu DB | Tokens on MineuQR DB; password-reset/verify flows target new plane | **Medium** |
| **Uploads** | Dev uses local disk `uploads/` (`NODE_ENV=development`); URLs stored on DB rows | DB rows reference **MineuQR** asset URLs (likely R2 in prod data); local disk uploads **orphan** from prior Monu rows | **High** — broken images if URLs point to R2/production paths not reachable locally |
| **Menu management** | Empty menu on Monu | **1 category, 1 menu item** across **6 restaurants** | **Low** — functional; tenant guards apply per `restaurant.userId` |
| **Restaurant management** | 0 restaurants | **6 restaurants** under MineuQR owners | **Low–Medium** — must log in as correct owner; admin sees real launch data |
| **Subscriptions** | 0 rows on Monu | Unknown count on MineuQR — drives entitlements | **Medium** — ordering/commercial gates reflect real launch state |
| **Invoices** | 0 on Monu | Unknown on MineuQR | **Medium** — admin billing views show real data |
| **Reporting / admin KPIs** | Empty/wiped metrics | Live launch-candidate metrics | **Medium** — admin dashboards reflect production-like data |
| **Admin flows** | `role=admin` user id 1 on Monu | Admin identity may differ on MineuQR (different `users.id`, `openId`) | **High** — `OWNER_OPEN_ID` promotion path; protected user id assumptions in scripts |
| **Migrations / Drizzle** | `drizzle.config.ts` uses `DATABASE_URL` | `db:migrate` / `db:push` would run against **MineuQR** if env switched | **Critical** — accidental schema apply to launch DB |
| **Audit scripts** | All readonly scripts hit Monu | Would audit **correct** launch plane | **Positive** — fixes DATA-INTEGRITY false negatives |
| **CLEAN-DB scripts** | `scripts/clean-db-2-execute.mjs` wipes all except `users.id=1` | **Catastrophic** if run against MineuQR production | **Critical** |

### B.2 Cross-region considerations

| Factor | Legacy Monu | Active MineuQR |
|--------|-------------|----------------|
| Region | `us-east-1` | `eu-central-1` |
| Latency (local dev) | Baseline | Higher RTT from non-EU dev machines |
| Data residency | US | EU — relevant for compliance narrative |

### B.3 What does **not** change on DB switch

| Component | Binding |
|-----------|---------|
| `JWT_SECRET` / `VITE_APP_ID` | Still from `.env` — **not** auto-synced with DB |
| R2 credentials | Separate env — blobs stay in same R2 bucket; **DB URL columns** must match |
| Email / Tap / PayPal | Separate env — test charges/emails may hit real integrations if keys present |
| `NODE_ENV=development` | Still local uploads path unless overridden |

### B.4 Summary risk profile

Switching local to MineuQR **without guardrails** risks:

1. **Destructive scripts** against launch data  
2. **Schema migrations** against launch data  
3. **Session confusion** (wrong user after switch)  
4. **Asset URL breakage** (R2 vs local `uploads/`)  
5. **False confidence** if Production still points at Monu legacy  

---

## Section C — Safe Alignment Strategy

### Option A — Local → MineuQR production DB (`gateway01` / `mineuqr`)

| | |
|--|--|
| **Pros** | Immediate parity with launch candidate; fixes all DATA-INTEGRITY false empty counts; no branch cost; simplest connection string |
| **Cons** | Local dev writes go to **production data plane**; migration scripts and CLEAN-DB tools become launch-threatening; multi-developer collision; EU prod latency |
| **Risk** | **Critical** for writes/migrations; **Low** for read-only audit if enforced |

### Option B — Local → dedicated MineuQR development DB

| | |
|--|--|
| **Pros** | Isolated from launch data; safe writes and migration experiments; can seed from prod snapshot; clear environment boundary |
| **Cons** | Requires **new TiDB database** provisioning + connection string; drift between dev and launch until refresh; extra cost/ops |
| **Risk** | **Low** operationally; **Medium** — dev DB may diverge from launch truth |

### Option C — Local → TiDB branch of `mineuqr`

| | |
|--|--|
| **Pros** | Branch inherits launch schema + data snapshot; isolated writes; refreshable from parent; aligns schema with production without sharing live write plane |
| **Cons** | Branch connection string differs from parent; branch lifecycle/cost; URLs/R2 references still point at prod assets unless branch includes storage strategy; TiDB branch feature availability must be confirmed on plan |
| **Risk** | **Low–Medium** — best balance for daily dev if branching is available |

### Recommendation

## **Option C — TiDB branch** (primary)

**Rationale:**

1. **Launch candidate stays authoritative** on `gateway01` / `mineuqr` — local daily work must not write to it (Option A rejected for default dev).
2. **Option C** gives schema + data alignment with launch while isolating destructive local actions (migrations, CLEAN-DB, menu experiments).
3. **Option B** is the fallback if TiDB branching is unavailable or cost-prohibited — provision `mineuqr-dev` on same or separate cluster.

**Supplementary (not mutually exclusive):**

- **Read-only alignment pass:** temporarily use Option A connection **only** for `SELECT` audit scripts (no migrations, no CLEAN-DB) to complete DATA-INTEGRITY-1R before branch provisioning.
- **Never** point local `.env` at Option A for routine `pnpm dev` without write guards.

---

## Section D — Environment Variable Audit

`APP_ENV` is **not used** in codebase. Environment discrimination is via `NODE_ENV`, `DATABASE_URL`, and `VITE_APP_ID`.

### D.1 Primary — must change for DB alignment

| Variable | Current (local) | After alignment | Depends on DB? | Notes |
|----------|-----------------|-----------------|----------------|-------|
| `DATABASE_URL` | `gateway05` / `fcy9…` | `gateway01` / `mineuqr` *(or branch URL)* | **Yes — sole DB selector** | All runtime + scripts + Drizzle |

### D.2 Auth — review on alignment (may need sync, not auto-changed)

| Variable | Current (local) | Risk if unchanged |
|----------|-----------------|-------------------|
| `JWT_SECRET` | Weak dev placeholder | Sessions invalid across restarts anyway locally; **must differ** from production secret |
| `VITE_APP_ID` | `mineuqr-local` | JWT `appId` claim mismatch if prod uses different id — users appear logged out after switch |
| `OWNER_OPEN_ID` | Unset in `.env` | Admin promotion via OAuth upsert won't apply — verify admin exists in MineuQR DB |
| `PUBLIC_APP_URL` | Unset | Email verify/reset links use request Origin/Host — OK for localhost |
| `AUTH_REQUIRE_VERIFIED_EMAIL` | Unset (default policy) | May block flows against MineuQR user verification state |

### D.3 App URLs — independent of DB

| Variable | Current | DB coupling |
|----------|---------|-------------|
| `VITE_BASE_URL` | `http://localhost:3000` | None |
| `VITE_APP_URL` | `http://localhost:3000` | None |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | None |

### D.4 Storage — not in local `.env`; critical for asset parity

| Variable | Source | DB coupling |
|----------|--------|-------------|
| `R2_ACCOUNT_ID` | `server/_core/env.ts` | URLs in DB rows reference R2; local dev without R2 shows broken images |
| `R2_ACCESS_KEY_ID` | same | |
| `R2_SECRET_ACCESS_KEY` | same | |
| `R2_BUCKET_NAME` | same | |
| `R2_PUBLIC_BASE_URL` | same | |
| `R2_ENDPOINT` | same | |

**Local dev** uses disk `uploads/` when `NODE_ENV=development` (`server/local-uploads.ts`). MineuQR rows may contain **production R2 URLs** — switching DB without R2 config → **broken media** unless using branch snapshot + local re-upload.

### D.5 Email — not in local `.env`

| Variable | Purpose |
|----------|---------|
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_SECURE` | SMTP |
| `RESEND_API_KEY` | Resend API |

**Risk:** alignment + adding keys → real verification emails to launch users.

### D.6 Payments — not in local `.env`

| Variable | Purpose |
|----------|---------|
| `TAP_SECRET_KEY`, `VITE_TAP_PUBLISHABLE_KEY` | Tap checkout |
| PayPal | loaded dynamically in routers |

**Risk:** test payments against live merchant keys if env copied from production.

### D.7 Deployment-only (Vercel production/preview)

| Variable | Documented in |
|----------|---------------|
| `NODE_ENV=production` | Vercel runtime |
| `TRUST_PROXY` | `docs/deployment-auth-readiness.md` |
| `CSRF_ORIGIN_ENFORCE` | same |
| `DATABASE_URL` | **Must verify in Vercel dashboard** |

### D.8 Dependency graph (simplified)

```text
DATABASE_URL
  ├── server/db.ts (all persistence)
  ├── drizzle.config.ts (migrations)
  ├── scripts/*-readonly.mjs (audits)
  └── scripts/clean-db-*.mjs (DESTRUCTIVE)

NODE_ENV
  └── local-uploads vs R2 (orthogonal to DB host)

VITE_APP_ID + JWT_SECRET
  └── session validity (orthogonal to DB host, but affects login after switch)
```

---

## Section E — Alignment Execution Plan

**Status: PLANNED — do not execute in ENV-DRIFT-2.**

### Phase 0 — Prerequisites (read-only)

| Step | Action | Owner | Exit criteria |
|------|--------|-------|---------------|
| **0.1** | Export Vercel **Production** and **Preview** `DATABASE_URL` metadata (host + database name only) | Ops | Confirmed whether prod already on `gateway01` / `mineuqr` |
| **0.2** | Export TiDB connection string for `mineuqr` (store in secrets manager, not repo) | Ops | Redacted host/db matches operator confirmation |
| **0.3** | Confirm TiDB **branch** availability and create `mineuqr-dev` branch (if Option C) | Ops | Branch connection string issued |
| **0.4** | Run readonly inventory on `mineuqr` parent: users, restaurants, categories, menu_items, subscriptions | Audit | Counts match 2/6/1/1 baseline |
| **0.5** | Document legacy Monu DB as **read-only archive** — no further writes | Team | Legacy URL removed from active paths after cutover |

### Phase 1 — Read-only audit alignment (no `.env` commit)

| Step | Action |
|------|--------|
| **1.1** | Run `scripts/data-integrity-audit-phase2-readonly.mjs` with `DATABASE_URL=<mineuqr-readonly>` and `AUDIT_TARGET=mineuqr-launch` **without** changing workspace `.env` file |
| **1.2** | Complete DATA-INTEGRITY-1R sections 2–7 on mineuqr |
| **1.3** | Archive results under `docs/commercial-audit/` with explicit host/database provenance |

### Phase 2 — Local environment alignment (future)

| Step | Action |
|------|--------|
| **2.1** | Backup current `.env` offline (not committed) |
| **2.2** | Update `DATABASE_URL` to **branch URL** (Option C) or dev DB (Option B) — **not** parent `mineuqr` for daily dev |
| **2.3** | Keep `VITE_APP_ID=mineuqr-local` and distinct `JWT_SECRET` from production |
| **2.4** | Clear browser cookies / re-login after switch |
| **2.5** | Add `.env.example` documenting Monu legacy vs MineuQR targets (future doc task) |

### Phase 3 — Production / preview verification (future)

| Step | Action |
|------|--------|
| **3.1** | If Vercel Production ≠ `gateway01` / `mineuqr`, plan cutover window (separate change request) |
| **3.2** | If already aligned, document evidence in ENV-DRIFT-2 addendum |
| **3.3** | Define staging target: branch or `mineuqr-staging` DB |

### Phase 4 — Guardrails (future, recommended)

| Step | Action |
|------|--------|
| **4.1** | Add preflight script check: refuse CLEAN-DB / migrate if host = `gateway01` and database = `mineuqr` without explicit confirm env |
| **4.2** | Rename audit default `AUDIT_TARGET` from `local-env` to resolved host+db |
| **4.3** | Block `drizzle-kit migrate` against parent launch DB from local machines |

### Rollback strategy

| Trigger | Rollback |
|---------|----------|
| Wrong DB after local `.env` change | Restore backed-up `.env` Monu URL; restart dev server; clear sessions |
| Branch corrupt / bad migration | Delete branch; recreate from `mineuqr` parent snapshot |
| Production mis-pointed | Revert Vercel `DATABASE_URL` to previous value via dashboard; redeploy |
| Audit-only pass | No rollback needed — readonly scripts leave no state |

### Validation strategy

| Check | Command / method | Pass |
|-------|------------------|------|
| Connection target | Parse `DATABASE_URL` host + db before every audit | Matches intended row in Section A |
| Inventory | `SELECT COUNT(*)` users/restaurants/categories/menu_items | Matches launch baseline (2/6/1/1 on parent) |
| Auth smoke | Login as known MineuQR test owner + admin | `auth.me` returns expected user |
| Tenant isolation | Owner A cannot access Owner B restaurant | `assertRestaurantAccess` 403 |
| Schema | `node scripts/verify-schema-deployment.cjs` | Exit 0 |
| DATA-INTEGRITY | Phase 2 script 22 checks | Document counts; 0 critical orphans on launch data |
| Destructive guard | Attempt CLEAN-DB dry-run against launch — **must be blocked or use wrong env** | No delete on parent |

---

## Section F — DATA-INTEGRITY Impact

### F.1 Audits that **must be rerun** (after alignment to `mineuqr`)

All audits that produced **row-level findings** against Monu legacy `gateway05` / `fcy9…`:

| Audit | Why rerun |
|-------|-----------|
| **DATA-INTEGRITY-1 Phase B** | Orphan counts were vacuous on empty Monu DB |
| **DATA-INTEGRITY-1 Phase C** | Relational chains not exercised on launch data |
| **DATA-INTEGRITY-1 Phase D** | Quality probes mostly 0 on empty Monu |
| **DATA-INTEGRITY-1R** | Explicitly FAIL — wrong dataset |
| **ASN-5A** | Commercial reality 0/0 on Monu |
| **COMMERCIAL-DATA-SNAPSHOT** | 1 user / 0 restaurants — wrong plane |

### F.2 Audits / artifacts that **remain valid** (schema/code-level)

| Artifact | Validity |
|----------|----------|
| **DATA-INTEGRITY-1 Phase A** | **Valid** — schema inventory is code-derived, not DB-row-dependent |
| **ASN program code changes (ASN-5 execution)** | **Valid** — code-level; not invalidated by DB switch |
| **ENV-DRIFT-1** | **Valid** — drift diagnosis remains true |
| **Phase C/D POTENTIAL ISSUE** findings (M3, invoice dual-parent, etc.) | **Valid** — model-level; still apply on `mineuqr` |
| **Phase C/D CONFIRMED ISSUE** on Monu (stale auth token, missing email unique index) | **Invalid for launch** — must re-verify on `mineuqr` |

### F.3 Findings validity after alignment

| Finding class | On Monu legacy | After mineuqr rerun |
|---------------|----------------|---------------------|
| No FK constraints | Valid | **Still valid** (schema unchanged) |
| No soft delete | Valid | **Still valid** |
| Guest ordering ASN-5 chain | Valid (code) | **Still valid** — re-verify with real subscription rows |
| 0 restaurants / 0 subscriptions | **Artifact of wrong DB** | **Replace** with mineuqr inventory |
| Launch-ready / PASS verdicts | **Invalid** | **Superseded** by new audit pass |
| ENV-DRIFT FAIL | Valid | **Resolve** after alignment + rerun |

---

## Section G — Recommendation

## **DO NOT ALIGN YET**

### Rationale

| Gate | Status |
|------|--------|
| Production `DATABASE_URL` verified against `gateway01` / `mineuqr` | **Not done** |
| Vercel preview target known | **Not done** |
| Staging target defined | **Not done** |
| TiDB branch or dev DB provisioned for safe local writes | **Not done** |
| Read-only DATA-INTEGRITY rerun on `mineuqr` | **Not done** |
| Destructive-script guardrails | **Not in place** |

**Alignment plan is approved as documentation.** **Execution is blocked** until Phase 0 prerequisites complete.

### When to upgrade to **APPROVE ALIGNMENT** (execution)

All must be true:

1. Vercel Production confirmed on `gateway01` / `mineuqr` **or** explicit cutover plan approved  
2. Read-only DATA-INTEGRITY-1R PASS on `mineuqr`  
3. Local `DATABASE_URL` targets **branch or dev DB** (Option C or B), not parent for daily dev  
4. `.env` backup and rollback documented  
5. Team notified: Monu legacy URL is **deprecated** for MineuQR work  

### Immediate next action (read-only, safe)

Run Phase **1.1** — readonly integrity script against `mineuqr` using **shell-exported** `DATABASE_URL` (do not commit connection string, do not modify workspace `.env` until Phase 2 approved).

---

## Appendix A — Environment truth map

```text
┌─────────────────────────────────────────────────────────────────┐
│  LEGACY (Monu era) — MISALIGNED FOR MINEUQR                     │
│  gateway05.us-east-1.prod.aws.tidbcloud.com                     │
│  database: fcy9GqTzfuy9H9eCsDbdLA  (workspace .env today)       │
│  inventory: ~1 user, 0 restaurants (post-wipe)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  ENV-DRIFT-2 alignment
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ACTIVE MINEUQR — LAUNCH CANDIDATE                              │
│  gateway01.eu-central-1.prod.aws.tidbcloud.com                  │
│  database: mineuqr                                              │
│  inventory: 2 users, 6 restaurants, 1 category, 1 menu item   │
└─────────────────────────────────────────────────────────────────┘
         │
         ├──► Production (Vercel) — UNVERIFIED
         ├──► Preview (Vercel) — UNVERIFIED
         ├──► Staging — NOT CONFIGURED
         └──► Local dev (recommended) — TiDB BRANCH of mineuqr
```

---

## Appendix B — Related documents

| Document | Role |
|----------|------|
| `ENV-DRIFT-1-AUDIT.md` | Drift discovery |
| `DATA-INTEGRITY-1-AUDIT.md` | Phases A–D (Monu-targeted) |
| `DATA-INTEGRITY-1-PRODUCTION-VERIFICATION.md` | 1R attempt (if present) |
| `docs/MIGRATION_STAGING_CHECKLIST.md` | Post-alignment migration discipline |
| `docs/deployment-auth-readiness.md` | Vercel auth env vars |
| `scripts/clean-db-2-execute.mjs` | **Danger** on wrong DB |

---

*End of ENV-DRIFT-2. Alignment plan only. No implementation.*
