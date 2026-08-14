# FINAL-REPORT.md — COMMERCIAL-LIVE-PLANS-APPLICATION-CUTOVER-1

**Date:** 2026-08-15  
**Verdict:** **READY FOR DEPLOY**

DB remains **0086**. Application code is compatible with Live Plan schema. This program did not migrate, mutate production rows, commit, push, or deploy.

---

## Decision checklist

- [x] No production runtime references removed tables
- [x] Live Plan entitlement authority is correct (bound = current Live Plan; unbound = legacy only; no overlay)
- [x] Plan Editor uses `saveLive`
- [x] Public Pricing uses durable Live Plans
- [x] Cache invalidation works
- [x] Capability propagation passes (TEST A/C)
- [x] Pricing semantics pass (TEST B / 100 vs 150 SAR fixtures)
- [x] Checkout regression passes (charge path `subscription_plans` 19/39/99)
- [x] CRS passes for Live Plan source; unbound documented
- [x] Quotas pass (live / fail-closed / legacy exclusive)
- [x] Startup/hydration passes (hydrate live tables; already_initialized)
- [x] Production build passes
- [x] No new typecheck errors (186 = prior baseline)
- [x] Database remains intact
- [x] Owner data unchanged
- [x] Tap payment unchanged
- [x] No new owner-access regression
- [x] Authenticated smoke: **NOT RUN — DEPLOYMENT OUT OF SCOPE**
- [x] No unresolved P0 runtime blocker

## Application vs schema

| Layer | State |
|-------|--------|
| Production DB | 0086 Live Plans, 3 plans, 0 bindings |
| Current working-tree app | Queries live tables only |
| Currently **deployed** app | May still be old; **must be replaced** by this code at deploy time |

Deploy is safe **only** as replacement of the old runtime with this Live Plan application. Do not leave the old app on 0086.

## Dual price book (unchanged policy)

Catalog: Basic 0.00; Professional 26.40/264 USD + 99/990 SAR; Enterprise 79.73/797.33 USD + 299/2990 SAR.  
Checkout: 19/39/99 USD on `subscription_plans`. Books do not overwrite each other.

## Residuals

1. Unbound runtime still uses `planFeatureMatrix` (all current accounts, including owner).
2. Dual price book.
3. Owner expired-access P0 unchanged.
4. Leftover names: `snapshotLoader.ts`, ops `commercial_snapshot_*` events, unused UI `stateLabel`.
5. CRS `commercialName` uses charged-term live name; null charged terms fall back to `subscription_plans` name.
6. Three vitest `getDb` mock gaps (not runtime).
7. Authenticated HTTP smoke deferred to post-deploy.
8. Repo-wide 186 `tsc` errors; production `esbuild` build still passes.

---

**STOP.** Do not deploy from this program. Await explicit Architecture Authority authorization for application deployment.
