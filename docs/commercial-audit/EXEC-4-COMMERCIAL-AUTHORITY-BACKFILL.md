# EXEC-4 — Commercial Authority Backfill

**Program:** Admin Dashboard Remediation — Execution  
**Phase:** EXEC-4 — Commercial authority backfill (AR-6)  
**Date:** 2026-06-08  
**Status:** Tooling complete — execution **pending operator launch `DATABASE_URL`**

**Mode:** Data migration per AR-6. No dashboard consumer migration, no legacy retirement, no hard deletes.

**Prerequisites:** EXEC-1/2/3, AR-6 runbook, DATA-INTEGRITY-1 Phase E inventory.

---

## 1. Executive Summary

EXEC-4 implements the approved AR-6 commercial authority backfill for the MineuQR **launch database** (`gateway01` / `mineuqr`).

| Phase | Status |
|-------|--------|
| EXEC-4A Discovery | **Complete** (DATA-INTEGRITY-1 archive + tooling) |
| EXEC-4B Dry run | **Complete** — fixture + logic validated |
| EXEC-4C Validation | **SAFE TO EXECUTE** |
| EXEC-4D Execution | **Pending** — launch `DATABASE_URL` not in agent environment |
| EXEC-4E Post-validation | **Simulated** (3/3 CRS tests pass); live re-query pending execution |

**Launch DB pre-state:** 0 account-scoped rows, 4 restaurant-scoped rows, 2 owners, 1 invoice (User 1 → sub `600001`).

**Planned post-state:** 2 account-scoped entitled rows; 3 scoped rows expired (User 14760004); User 1 row `600001` in-place → `restaurantId = 0`.

**No data deleted.** Legacy scoped rows retained as `expired` historical records.

---

## 2. Discovery Results (EXEC-4A)

### 2.1 Inventory

| Entity | Count |
|--------|------:|
| Users | 2 |
| Subscription rows | 4 |
| Account-scoped (`restaurantId = 0`) | **0** |
| Restaurant-scoped (`restaurantId > 0`) | **4** |
| Invoices | 1 |
| Orphan owner mismatch | 0 |

### 2.2 Subscription rows

| Sub ID | Owner | restaurantId | Status | planId | Plan |
|--------|------:|-------------:|--------|-------:|------|
| 600001 | 1 | 720007 | active | 30001 | BASIC |
| 600002 | 14760004 | 720006 | active | 30002 | PROFESSIONAL |
| 630001 | 14760004 | 720003 | active | 30001 | BASIC |
| 630002 | 14760004 | 720005 | active | 30001 | BASIC |

### 2.3 Owner cohorts

| Owner | Role | Cohort | Scoped | Account | Mechanism |
|------:|------|--------|-------:|--------:|-----------|
| 1 | admin | **H-A** | 1 | 0 | R3-A in-place |
| 14760004 | user | **H-C** | 3 | 0 | R3-B insert + expire |

### 2.4 Billing artifacts

| Artifact | Detail |
|----------|--------|
| Invoice | 1 row — User 1, `subscriptionId = 600001` (preserved by R3-A) |
| Stripe IDs | None on scoped rows (dry-run snapshot) |
| Renewal notifications | 91 system rows — remain on original subscription ids |

### 2.5 Archive

`docs/commercial-audit/executions/EXEC-4-DISCOVERY-2026-06-08.json`

**Note:** Live DR-1..DR-6 re-query requires operator `DATABASE_URL` for `gateway01` / `mineuqr`. Workspace `.env` points to Monu legacy (`gateway05`) — **do not use for execution**.

---

## 3. Dry Run Results (EXEC-4B)

### 3.1 Owner 1 (H-A) — BEFORE / AFTER

| | BEFORE | AFTER |
|---|--------|-------|
| Account rows | 0 | 1 (`600001`, `restaurantId = 0`) |
| Scoped rows | 1 active BASIC @ 720007 | 0 entitled scoped |
| Plan | BASIC | BASIC (unchanged) |
| Invoice FK | `600001` | `600001` (id preserved) |
| CRS | ADMIN (role bypass) | ADMIN (role bypass); account row exists for `pickUserLevelSubscription` |

**Action:** `UPDATE user_subscriptions SET restaurantId = 0 WHERE id = 600001`

### 3.2 Owner 14760004 (H-C) — BEFORE / AFTER

| | BEFORE | AFTER |
|---|--------|-------|
| Account rows | 0 | 1 NEW (copied from `600002`) |
| Scoped rows | 3 active (PRO + 2× BASIC) | 3 **expired** (historical) |
| Winner | 600002 PROFESSIONAL (tier override) | Account row PROFESSIONAL active |
| CRS | `plan: NONE` | `plan: PROFESSIONAL` |
| Entitlements | None (no account row) | PRO limits/features |

**Action:** INSERT account row from winner `600002`; expire `600002`, `630001`, `630002`.

### 3.3 Dry-run archive

`docs/commercial-audit/executions/EXEC-4-DRY-RUN-2026-06-08.json`

```bash
node scripts/exec-4-commercial-authority-backfill.mjs --fixture-dry-run --archive
```

---

## 4. Validation Findings (EXEC-4C)

| Check | Result |
|-------|--------|
| Orphan owner mismatch | 0 — **PASS** |
| Cohort classification | H-A + H-C only — **PASS** |
| Winner selection (tier override) | 14760004 → PROFESSIONAL — **PASS** |
| Admin protection | User 1 R3-A only — **PASS** |
| Invoice preservation | User 1 invoice on `600001` — **PASS** |
| Duplicate handling | H-C insert + expire (no hard delete) — **PASS** |
| Actionable plans | 2 owners — **PASS** |

### Validation decision

## **SAFE TO EXECUTE**

| Metric | Value |
|--------|------:|
| Rows affected (scoped) | 4 |
| Rows created (account) | 1 |
| Rows updated (in-place) | 1 |
| Hard deletes | 0 |

**Rollback:** Full TiDB backup restore (Gate A). No partial rollback.

**Execution blocker (environment):** Launch `DATABASE_URL` for `gateway01.eu-central-1.prod.aws.tidbcloud.com` / `mineuqr` was not available in the execution environment. Operator must run EXEC-4D manually (see §5).

---

## 5. Execution Details (EXEC-4D)

### 5.1 Status

**NOT EXECUTED** in this session — pending operator credentials and Gate A backup confirmation.

### 5.2 Execution script

`scripts/exec-4-commercial-authority-backfill.mjs`

| Mode | Flag | Writes? |
|------|------|---------|
| Discovery | `--discover` | No |
| Dry run | `--dry-run` | No |
| Fixture dry run | `--fixture-dry-run` | No |
| Execute | `--execute` | Yes (requires `EXEC_4_CONFIRM=YES`) |
| Validate | `--validate` | No |

### 5.3 Operator commands (PowerShell)

```powershell
cd c:\mineuqr

# Gate A — backup (operator/Ops — before execute)
# TiDB point-in-time or logical dump of mineuqr

# Pre-execution live discovery (confirm DR-1..DR-6 match archive)
$env:DATABASE_URL = '<gateway01-mineuqr-url>'
$env:AUDIT_TARGET = 'exec-4-pre-execute'
node scripts/exec-4-commercial-authority-backfill.mjs --discover --archive

# Live dry-run confirmation
node scripts/exec-4-commercial-authority-backfill.mjs --dry-run --archive

# Execute (idempotent)
$env:EXEC_4_CONFIRM = 'YES'
node scripts/exec-4-commercial-authority-backfill.mjs --execute --archive

# Post-execution validation
node scripts/exec-4-commercial-authority-backfill.mjs --validate --archive
```

### 5.4 Execution order (AR-6)

1. H-A — User 1 (R3-A)  
2. H-C — User 14760004 (R3-B)  
3. Global validation  

### 5.5 Idempotency

| Cohort | Re-run behavior |
|--------|-----------------|
| H-A | Skips if `restaurantId` already 0 or account row exists |
| H-C | Skips INSERT if entitled account row exists; expires only active scoped |

---

## 6. Post-Execution Validation (EXEC-4E)

### 6.1 Simulated CRS validation (automated)

| Test | Result |
|------|--------|
| `exec4PostBackfill.parity.test.ts` | **3/3 passed** |
| User 14760004 → PROFESSIONAL | **PASS** |
| User 1 → ADMIN (role bypass) | **PASS** |
| Expired scoped rows ignored | **PASS** |

```bash
npx vitest run server/commercial/exec4PostBackfill.parity.test.ts
```

### 6.2 Live validation (pending execution)

| Check | Pass criteria |
|-------|---------------|
| Account rows | ≥ 2 entitled (`restaurantId = 0`) |
| User 14760004 CRS | `planCode: PROFESSIONAL`, not NONE |
| User 1 invoice | FK intact on `600001` |
| Active scoped remaining | 0 |
| `pickUserLevelSubscription` | Returns account row per owner |

```bash
npx vitest run server/commercial/CommercialReadService.parity.test.ts
```

---

## 7. Rollback Plan

| Trigger | Action |
|---------|--------|
| Plan mismatch vs dry-run | Full backup restore |
| Invoice FK broken | Full backup restore |
| Partial owner failure | Full backup restore (no partial) |

**H-A manual rollback (if needed):**

```sql
UPDATE user_subscriptions SET restaurantId = 720007 WHERE id = 600001 AND userId = 1;
```

**H-C manual rollback:** Prefer full backup over manual DELETE of inserted account row.

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wrong DATABASE_URL (Monu `.env`) | **High** | Script enforces `gateway01` / `mineuqr` for `--execute` |
| Invoice FK break | **Low** | R3-A preserves sub id `600001` |
| CRS/admin role confusion | **Low** | User 1 stays ADMIN via role bypass; documented |
| MRR metric delta post-backfill | **Expected** | Owner deduplication — not rollback trigger |
| Live discovery drift vs archive | **Medium** | Re-run `--discover` before `--execute` |
| No backup (Gate A) | **High** | Operator must backup before execute |

---

## 9. Readiness For EXEC-5

| Criterion | Status |
|-----------|--------|
| Backfill tooling implemented | ✅ |
| Dry-run SAFE TO EXECUTE | ✅ |
| AR-6 mechanics (R3-A/R3-B) | ✅ |
| Idempotent execute script | ✅ |
| CRS post-backfill tests | ✅ (simulated) |
| Live execution on launch DB | ⏳ Pending operator |
| Dashboard consumer migration | **Not started** (EXEC-5) |

**EXEC-5 may proceed after live EXEC-4D completion and `--validate` pass.**

---

## Appendix A — Files Created

| File | Purpose |
|------|---------|
| `scripts/lib/exec4-backfill-logic.mjs` | Cohort classification, winner selection, dry-run plan |
| `scripts/exec-4-commercial-authority-backfill.mjs` | Discover / dry-run / execute / validate CLI |
| `server/commercial/exec4BackfillLogic.test.ts` | Backfill logic unit tests (4) |
| `server/commercial/exec4PostBackfill.parity.test.ts` | Post-backfill CRS validation (3) |
| `docs/commercial-audit/executions/EXEC-4-DISCOVERY-2026-06-08.json` | Discovery archive |
| `docs/commercial-audit/executions/EXEC-4-DRY-RUN-2026-06-08.json` | Dry-run archive |
| `docs/commercial-audit/EXEC-4-COMMERCIAL-AUTHORITY-BACKFILL.md` | This document |

## Appendix B — Test Results

```bash
npx vitest run server/commercial/exec4BackfillLogic.test.ts server/commercial/exec4PostBackfill.parity.test.ts server/commercial/CommercialReadService.parity.test.ts
```

| Suite | Result |
|-------|--------|
| `exec4BackfillLogic.test.ts` | 4/4 |
| `exec4PostBackfill.parity.test.ts` | 3/3 |
| `CommercialReadService.parity.test.ts` | 10/10 |
| **Total** | **17/17 passed** |
