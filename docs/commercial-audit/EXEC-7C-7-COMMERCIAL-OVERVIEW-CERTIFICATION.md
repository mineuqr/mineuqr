# EXEC-7C-7 — Commercial Overview Completion & Certification

**Program:** Commercial Overview V1  
**Date:** 2026-06-07  
**Status:** Complete — certified for ADMIN-UX-1E prerequisite  
**Mode:** Read-only audit → validate → document → certify  
**No schema changes. No business logic rewrites. No authority redesign.**

**Prerequisites verified complete:** COMM-AUDIT-1A, AR-UX-7, AUTHORITY-CLEANUP-1, HOTFIX-UI-2, AR-UX-8

---

## 1. Certification Statement

Commercial Overview (`/admin/commercial`) is certified as the **official source of commercial truth** for platform operators, subject to documented exclusions (§7).

| Criterion | Status |
|-----------|--------|
| All commercial KPIs use owner-level authority | **PASS** |
| No active restaurant-scoped authority in overview path | **PASS** |
| No commercial metric depends on restaurant lifecycle | **PASS** (except explicitly labeled operational metrics) |
| KPI definitions formally documented | **PASS** — [EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md](./EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md) |
| Regression scenarios documented | **PASS** — §5 |
| Internal staff readiness assessed | **PASS** — §6 |
| Single snapshot read (`admin.getCommercialOverview`) | **PASS** |

---

## 2. Phase A — Commercial KPI Authority Audit

### 2.1 Data path (Commercial Overview only)

```text
/admin/commercial
  └── trpc.admin.getCommercialOverview
        └── adminDashboardRouter.getCommercialOverview
              ├── resolveAdminDashboardEntityCounts()  [operational counts only]
              └── CanonicalMetricsService.getCommercialOverviewSnapshot()
                    └── CommercialReadService.getAllOwnerCommercialStates()
                          └── per owner: getCommercialEntitlements
                                └── buildCommercialContextFromDb
                                      └── pickUserLevelSubscription (restaurantId = 0)
```

**UI query count:** 1 (`useQuery` on `getCommercialOverview` only — EXEC-7C.3–7C.6).

### 2.2 KPI authority table

| KPI / Metric | UI Section | Snapshot Field | Authority Source | Service / Query | Restaurant Sensitive | Subscription Sensitive |
|--------------|------------|----------------|------------------|-----------------|----------------------|------------------------|
| Commercial Subscribers | Executive | `executive.commercialSubscribers` | Owner entitlement (`isEntitled`) | CMS ← CRS | No | Yes |
| MRR | Executive | `executive.mrr` | Owner subscription (`countsInMrr`) | CMS ← CRS + plan catalog | No | Yes |
| ARR | Executive | `executive.arr` | Derived from MRR (`MRR × 12`) | CMS | No | Yes |
| Active Restaurants | Executive | `executive.activeRestaurants` | **Operational** — `restaurants.isActive` | `resolveAdminDashboardEntityCounts` | **Yes** | No |
| Total Users | *(contract only)* | `executive.totalUsers` | **Operational** — user registry | `getExtendedAdminStats` | No | No |
| Active Subscriptions | *(contract only)* | `executive.activeSubscriptions` | Owner `subscriptionStatus === "active"` | CMS ← CRS | No | Yes |
| Active Trials | *(contract only)* | `executive.activeTrials` | Owner `subscriptionStatus === "trial"` | CMS ← CRS | No | Yes |
| Health: Active | Subscription Health | `subscriptionHealth.active` | Owner authority status | CMS ← CRS | No | Yes |
| Health: Trial | Subscription Health | `subscriptionHealth.trial` | Owner authority status | CMS ← CRS | No | Yes |
| Health: Canceled | Subscription Health | `subscriptionHealth.canceled` | Owner authority status | CMS ← CRS | No | Yes |
| Health: Expired | Subscription Health | `subscriptionHealth.expired` | Owner authority status | CMS ← CRS | No | Yes |
| Health: Inactive | Subscription Health | `subscriptionHealth.inactive` | `!isEntitled && planCode === NONE` | CMS ← CRS | No | Yes |
| Expiring ≤30d | Needs Attention | `needsAttention.expiringWithin30Days` | Entitled owner period end | CMS ← CRS | No | Yes |
| Canceled Accounts | Needs Attention | `needsAttention.canceledAccounts` | Mirrors `health.canceled` | CMS ← CRS | No | Yes |
| Expired Accounts | Needs Attention | `needsAttention.expiredAccounts` | Mirrors `health.expired` | CMS ← CRS | No | Yes |
| Plan Distribution | Plan Distribution | `planDistribution.entries` | Owner `planCode` | CMS ← CRS | No | Yes |
| Grace Accounts | — | `needsAttention.graceAccounts` | **Not in authority** (`null`) | N/A | N/A | N/A |
| Suspended Accounts | — | `needsAttention.suspendedAccounts` | **Not in authority** (`null`) | N/A | N/A | N/A |
| Recent Activity | — | `recentActivity` | Unavailable | N/A | N/A | N/A |
| Growth | — | `growth` | Unavailable | N/A | N/A | N/A |

### 2.3 Phase A findings

| Finding | Severity | Disposition |
|---------|----------|-------------|
| All revenue/subscriber KPIs derive from CRS owner states | — | **Certified** |
| `activeRestaurants` is operational, correctly labeled in UI hint | Low | **Accepted** — not a revenue metric |
| Admin-role users count as entitled subscribers but not MRR | Medium | **Documented** — ADMIN-AUTH-1 follow-up |
| Scoped subscription rows do not affect any overview KPI | — | **Verified** (parity tests, AUTHORITY-CLEANUP-1) |
| `executive.activeSubscriptions` / `activeTrials` in contract but not executive cards | Low | **Accepted** — available for ADMIN-UX-1E export |

**Goal met:** No commercial KPI on `/admin/commercial` derives from restaurant-scoped subscription authority.

---

## 3. Phase B — Commercial Data Contract Audit

### 3.1 Active services in Commercial Overview path

| Component | File | Role | Authority |
|-----------|------|------|-----------|
| tRPC procedure | `server/commercial/adminDashboardRouter.ts` | `getCommercialOverview` entry | Delegates to CMS |
| Snapshot assembler | `server/commercial/metrics/CanonicalMetricsService.ts` | `getCommercialOverviewSnapshot` | CRS composition |
| Read facade | `server/commercial/CommercialReadService.ts` | `getAllOwnerCommercialStates` | CRS |
| Context builder | `server/commercial/buildCommercialContextFromDb.ts` | DB → context | `pickUserLevelSubscription` |
| Entitlements | `server/commercial/getCommercialEntitlements.ts` | Context → entitlements | Pure resolver |
| Pure resolver | `src/lib/commercial/resolveCommercialEntitlements.ts` | Plan/status logic | No DB |
| Authority mapper | `server/commercial/mapToCommercialAuthority.ts` | Entitlements + row → state | No row picking |
| Row picker | `server/subscriptionResolver.ts` | `pickUserLevelSubscription` | Account rows only |
| Snapshot contract | `server/commercial/metrics/CommercialOverviewSnapshot.ts` | EXEC-7C.1 schema | Type contract |
| UI page | `client/src/pages/admin/AdminCommercialPage.tsx` | Single query consumer | Presentation only |

### 3.2 Related canonical services (not direct overview path, same authority)

| Service | Procedure(s) | Used by overview? |
|---------|--------------|-------------------|
| `CanonicalMetricsService.getMRR/ARR/…` | `analytics.*` | No — separate routes; **same derivation** (parity tested) |
| `CanonicalMetricsService.getDashboardSummary` | `admin.getDashboardSummary` | No — `/admin` home; same CRS |
| `admin.getSubscriptionOverview` | Operations / analytics table | No — overview uses snapshot |

### 3.3 Legacy / alternate authority paths (outside overview)

| Path | File | Status | Risk to overview |
|------|------|--------|------------------|
| `getAdminStatistics` / `admin.getStatistics` | `server/db.ts`, `routers.ts` | **Active** — S6 row aggregates | **None** — not called by Commercial Overview; still used by `/admin/analytics` `StatisticsPanel` legacy dual-read |
| `computeAdminMrr` | `server/adminKpiCalculations.ts` | **Active** — raw row MRR | **None** for overview; **HIGH** if used for commercial decisions elsewhere |
| `getCanonicalUserSubscription` | `server/db.ts` | **Active** — any-scope row pick | **None** for overview; user subscription router only |
| `pickCanonicalSubscription` | `server/subscriptionResolver.ts` | **Active** | **None** for overview |
| `resolveOrderingSubscriptionRow` | `server/subscriptionResolver.ts` | **Active** — scoped fallback | Ordering only |
| `resolvePlanLimitsForUser(userId, restaurantId)` | `server/subscriptionPlanLimits.ts` | **Active** — scoped | Feature limits only |
| `wave1ReadAuthority` scoped fallback | `server/commercial/wave1ReadAuthority.ts` | **Active** | Trial read parity only |
| `getSubscriptionForRestaurant` | `server/db.ts` | **Active** | User-facing subscription display |
| Restaurant-scoped admin mutations | `server/routers.ts` | **Retired** (AUTHORITY-CLEANUP-1) | Throws `PRECONDITION_FAILED` |
| `AdminPageShell` | `client/` | **Dead** | None |

### 3.4 Duplicated authority logic

| Duplication | Assessment |
|-------------|------------|
| `analytics.*` vs `getCommercialOverview` | **Intentional composition** — same CMS methods; exec7c2 parity test enforces equality |
| `getDashboardSummary` vs overview executive | Shared CRS load pattern; entity counts injected separately |
| S6 `getAdminStatistics` vs CMS | **Legacy parallel** — documented mismatch; excluded from overview certification |

### 3.5 Phase B conclusion

**Commercial Overview path is clean.** No restaurant-scoped subscription logic participates in snapshot assembly. Legacy paths remain elsewhere in the monolith for non-overview surfaces — documented, not removed per EXEC-7C.7 scope.

---

## 4. Phase C — Metric Definitions

Formal definitions: **[EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md](./EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md)**

---

## 5. Phase D — Commercial Regression Matrix

Expected behavior when account subscription is canonical (`restaurantId = 0`) and scoped rows are legacy residue.

| # | Scenario | MRR / ARR | Commercial Subscribers | Plan Distribution | Health Buckets | Active Restaurants | Evidence |
|---|----------|-----------|------------------------|-------------------|----------------|-------------------|----------|
| 1 | **Create restaurant** | Unchanged | Unchanged | Unchanged | Unchanged | **+1** (if active) | Architecture: no subscription row created; entity count query |
| 2 | **Delete restaurant** | Unchanged | Unchanged | Unchanged | Unchanged | **−1** | COMM-AUDIT-1A: deleting `720002` did not affect account row `660001` |
| 3 | **Add second restaurant** | Unchanged | Unchanged | Unchanged | Unchanged | **+1** | Same as (1) |
| 4 | **Add multiple restaurants** | Unchanged | Unchanged | Unchanged | Unchanged | **+N** | Operational only |
| 5 | **Upgrade subscription** (account row plan change) | **Changes** | May change | **Changes** | May change | Unchanged | CMS `computeMrrFromStates` uses `planId` |
| 6 | **Downgrade subscription** | **Changes** | May change | **Changes** | May change | Unchanged | Same |
| 7 | **Cancel subscription** | **Decreases** (if was paying) | **Decreases** | **Changes** | canceled ↑ | Unchanged | `subscriptionHealth.canceled` |
| 8 | **Trial expiration** | Unchanged (trials excluded) | **Decreases** | TRIAL→NONE | trial ↓, inactive ↑ | Unchanged | `resolveCommercialEntitlements` period check |
| 9 | **Grace period entry** | N/A | N/A | N/A | N/A | Unchanged | **No grace model** — `graceAccounts: null` |
| 10 | **Grace period exit** | N/A | N/A | N/A | N/A | Unchanged | **No grace model** |
| 11 | **Future internal account creation** | Unchanged if `role=admin` | **+1** (ADMIN entitled) | ADMIN ↑ | Unchanged | Unchanged | `countsInMrr: false` for ADMIN plan — see §6 |

### 5.1 Scoped-row legacy scenarios (post-EXEC-4)

| Scenario | Overview behavior | Test / evidence |
|----------|-------------------|-----------------|
| Scoped rows only (no account row) | MRR = 0; entitled = 0; create allowed (post AUTHORITY-CLEANUP-1) | `authorityCleanup1.test.ts` Scenario C |
| Account row + expired scoped rows | Metrics from account row only | `exec4PostBackfill.parity.test.ts` |
| Account row deleted; scoped orphans remain | MRR = 0; health inactive; admin create allowed | COMM-AUDIT-1A incident pattern |

### 5.2 Automated parity evidence

| Test file | What it proves |
|-----------|----------------|
| `server/commercial/exec7c2CommercialOverview.test.ts` | Snapshot metadata; executive parity with `analytics.*` + `getDashboardSummary` |
| `server/commercial/authorityCleanup1.test.ts` | Authority alignment scenarios A/B/C |
| `server/commercial/CommercialReadService.parity.test.ts` | Scoped-only vs CRS mismatch documented |
| `server/commercial/metrics/CanonicalMetricsService.test.ts` | MRR excludes non-`countsInMrr` owners |

**Regression principle (certified):**

> Restaurant lifecycle must never alter subscription metrics.  
> Subscription lifecycle must alter subscription metrics.

---

## 6. Phase E — Internal Staff Readiness Assessment (ADMIN-AUTH-1)

**Scope:** Recommendations only — no implementation.

### 6.1 Current account model

| Field | Location | Commercial impact today |
|-------|----------|-------------------------|
| `users.role` | `enum('user','admin')` | `admin` → ADMIN plan, entitled, **not in MRR** |
| `users.email` | varchar | No filter |
| `accountType` | Runtime entitlements only | `PAYING`, `TRIAL`, `ADMIN`, `NONE` — not persisted |
| Internal / staff flag | **Does not exist** | — |
| `openId` / `ENV.ownerOpenId` | Bootstrap | Can elevate to `role=admin` |

### 6.2 Current analytics filters

| Filter | Exists? | Used in overview? |
|--------|---------|-------------------|
| `roleFilter` on `getOwnerOverviewList` | Yes | No |
| Exclude `role === admin` in CMS | **No** | Admin users included in all owner iterations |
| Email domain allow/deny | No | — |
| `accountType === ADMIN` exclusion | No | ADMIN users in subscriber count |

### 6.3 Impact on commercial metrics (today)

| Staff pattern | MRR | ARR | Commercial Subscribers | Trials | Plan dist. |
|---------------|-----|-----|------------------------|--------|------------|
| Platform `role=admin` | Excluded | Excluded | **Included** (entitled ADMIN) | Excluded | ADMIN bucket |
| Marketing/Sales/Support account (`role=user`, no sub) | Excluded | Excluded | Excluded | Excluded | NONE |
| Operations account with complimentary paid sub | **Included** | **Included** | Included | — | Plan bucket |
| Internal account with trial | Excluded from MRR | Excluded | Included if valid trial | Included | TRIAL |

### 6.4 Recommendations for ADMIN-AUTH-1

| Priority | Recommendation | Rationale |
|----------|----------------|-----------|
| P1 | Add persisted `accountKind` or `isInternal` on `users` | Schema has no staff discriminator; runtime `accountType` insufficient for filtering |
| P1 | Exclude internal accounts in `getAllOwnerCommercialStates` or CMS aggregation | Single choke point; overview + analytics inherit |
| P2 | Separate **platform admin** (`role=admin`) from **commercial internal** | Today `role=admin` conflates dashboard access with ADMIN plan bypass |
| P2 | Define explicit rules: which account kinds count in Commercial Subscribers vs MRR | ADMIN plan already excludes MRR; subscriber count still inflated |
| P3 | Support Marketing/Sales/Support/Ops account types without subscription rows | Already behave as NONE — low risk |
| P3 | Document complimentary subscription policy | Ops-created account subs **do** affect MRR today |

### 6.5 Architecture readiness verdict

| Question | Answer |
|----------|--------|
| Can current architecture support staff exclusion **without** CRS rewrite? | **Yes** — filter at `getAllOwnerCommercialStates` or CMS `loadOwnerStates` |
| Can it support multiple internal account types? | **Partial** — needs persisted classification field |
| Risk if ADMIN-AUTH-1 deferred? | Low for MRR/ARR; **medium** for Commercial Subscribers and plan distribution counts |

---

## 7. Known Exclusions (Not Certification Blockers)

| Exclusion | Reason |
|-----------|--------|
| `/admin/analytics` legacy `getStatistics` dual-read | Separate surface; not Commercial Overview |
| Grace / suspended metrics | Authority not defined |
| Recent activity / growth | No canonical API |
| Churn rate / retention | Out of EXEC-7C scope |
| Internal staff exclusion | ADMIN-AUTH-1 future work |
| Export / reporting | ADMIN-UX-1E next program |

---

## 8. Validation

```bash
npm run check
```

Automated commercial overview tests:

```bash
pnpm exec vitest run server/commercial/exec7c2CommercialOverview.test.ts server/commercial/metrics/CanonicalMetricsService.test.ts server/commercial/authorityCleanup1.test.ts
```

Manual: `/admin/commercial` — single query load; executive KPIs, metadata, health, attention, plan distribution render from snapshot.

---

## 9. Exit Criteria Checklist

| # | Criterion | Result |
|---|-----------|--------|
| 1 | All commercial KPIs use owner-level authority | ✅ |
| 2 | No active restaurant-scoped subscription authority in overview | ✅ |
| 3 | No commercial metric depends on restaurant lifecycle | ✅ (operational metrics excepted) |
| 4 | KPI definitions formally documented | ✅ |
| 5 | Regression scenarios documented | ✅ |
| 6 | Internal staff readiness assessed | ✅ |
| 7 | Commercial Overview = official commercial truth | ✅ |

**EXEC-7C.7 complete.** Cleared to begin **ADMIN-UX-1E (Reporting & Export Layer)**.

---

## 10. Related Documents

- [EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md](./EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md)
- [EXEC-7C.1-COMMERCIAL-OVERVIEW-DATA-CONTRACT.md](./EXEC-7C.1-COMMERCIAL-OVERVIEW-DATA-CONTRACT.md)
- [AUTHORITY-CLEANUP-1-SUBSCRIPTION-AUTHORITY-UNIFICATION.md](./AUTHORITY-CLEANUP-1-SUBSCRIPTION-AUTHORITY-UNIFICATION.md)
- [COMM-AUDIT-1A-FINAL-REPORT.md](./COMM-AUDIT-1A-FINAL-REPORT.md)
- [AR-UX-8-METADATA-PRESENTATION-POLISH.md](./AR-UX-8-METADATA-PRESENTATION-POLISH.md)
