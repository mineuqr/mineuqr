# ADMIN-AUTH-1C — Commercial Analytics Exclusion

**Date:** 2026-06-09  
**Status:** Complete  
**Prerequisites:** ADMIN-AUTH-1A ✅, ADMIN-AUTH-1B ✅, EXEC-7C.7 ✅, ADMIN-UX-1E ✅, ANALYTICS-ALIGNMENT-1 ✅

---

## Objective

Activate `accountClassification` as the authoritative commercial population boundary. Exclude `INTERNAL` and `SYSTEM` accounts from the certified commercial pipeline while preserving `COMMERCIAL` accounts unchanged.

```text
Authorization          → role
Commercial Population  → accountClassification
```

---

## Deliverables

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Population audit | [ADMIN-AUTH-1C-POPULATION-AUDIT.md](./ADMIN-AUTH-1C-POPULATION-AUDIT.md) |
| 2 | Baseline snapshot | [ADMIN-AUTH-1C-BASELINE-SNAPSHOT.md](./ADMIN-AUTH-1C-BASELINE-SNAPSHOT.md) |
| 3 | Population filter | `server/commercial/commercialPopulation.ts`, `CommercialReadService.ts` |
| 4 | Legacy admin bypass removal | See Phase D below |
| 5 | Reconciliation | Phase E below |
| 6 | Regression tests | `server/commercial/adminAuth1c.test.ts` |

---

## Phase C — Single boundary enforcement

**Location:** `CommercialReadService.getAllOwnerCommercialStates()`

```ts
getAllUsers({ classificationFilter: "COMMERCIAL" })
users.filter(isCommercialPopulationMember)
```

**Rule:** `accountClassification === "COMMERCIAL"`

**Not filtered elsewhere:** Overview, Analytics, ExportPackage, ReportService, KPI services — all flow through CRS.

### Intentional non-filter paths

| Method | Scope |
|--------|-------|
| `getOwnerCommercialState(id)` | Any user — admin UI, entitlements, restaurant gates |
| `getOwnerCommercialStates(ids)` | Batch — same |
| `getOwnerOverviewList` | All classifications — admin display |

---

## Phase D — Legacy admin bypass removal

Removed `role === "admin"` as a commercial population / entitlement signal:

| File | Change |
|------|--------|
| `server/commercial/buildCommercialContextFromDb.ts` | Resolves subscription for all roles; preserves actual `role` |
| `src/lib/commercial/commercialContext.ts` | Removed admin branch forcing `subscription: null`; preserves `input.role` |
| `src/lib/commercial/resolveCommercialEntitlements.ts` | Removed `role === "admin"` → `ADMIN` plan shortcut |

### Behavior change

| Account | Before | After |
|---------|--------|-------|
| INTERNAL `role=admin`, no subscription | `ADMIN` plan, `isEntitled: true` | `NONE`, `isEntitled: false` |
| INTERNAL `role=admin`, with subscription | Ignored subscription → `ADMIN` | Resolves from subscription row |
| COMMERCIAL `role=user` | Unchanged | Unchanged |
| Authorization (`assertAdminAccess`, etc.) | `role`-based | **Unchanged** — still `role`-based |

`CommercialPlan.ADMIN` remains in the enum/matrix for compatibility but is no longer assigned via role bypass.

---

## Phase E — Reconciliation

Production population: COMMERCIAL=1, INTERNAL=1, SYSTEM=0.

| Metric | Before (X) | After (Y) | Delta |
|--------|------------|-----------|-------|
| Pipeline owners | 2 | 1 | INTERNAL removed |
| Commercial Subscribers | 2 | 1 | −1 (INTERNAL admin) |
| MRR | unchanged | unchanged | INTERNAL never in MRR |
| ARR | unchanged | unchanged | Same |
| Plan Distribution `ADMIN` | 1 | 0 | INTERNAL excluded |
| Subscriber table | 2 rows | 1 row | INTERNAL row removed |
| Trials / Grace / Suspended | COMMERCIAL only effect | COMMERCIAL only | INTERNAL zeroed |

**Preserved:** COMMERCIAL owner metrics identical before and after.

---

## Phase F — Cross-surface validation

Verified at fixed `asOf` via `adminAuth1c.test.ts` and existing parity suites:

```text
Commercial Overview
= Analytics (projectCommercialAnalytics)
= CommercialExportPackage.overviewReport
= CSV / Excel / PDF (same package)
```

No KPI drift — single `getAllOwnerCommercialStates()` boundary.

---

## Phase G — Regression tests

`server/commercial/adminAuth1c.test.ts`:

- `isCommercialPopulationMember` — COMMERCIAL only
- `getAllOwnerCommercialStates` — calls `classificationFilter: "COMMERCIAL"`
- INTERNAL excluded from subscribers, MRR, ADMIN plan bucket
- SYSTEM excluded from KPI population
- Overview = Analytics = ExportPackage parity
- INTERNAL admin resolves `NONE` without ADMIN bypass

Updated tests: `CommercialReadService.test.ts`, `CommercialReadService.parity.test.ts`, `getCommercialEntitlements.test.ts`, `exec4PostBackfill.parity.test.ts`, `commercialContext.test.ts`, `resolveCommercialEntitlements.test.ts`, `exec7c2CommercialOverview.test.ts`, `exec3DashboardApi.test.ts`, `analyticsAlignment.test.ts`, `CommercialReportService.test.ts`.

```text
npm run check  PASS
npm test       PASS (87 files, 624 tests)
```

---

## Exit criteria

| Criterion | Status |
|-----------|--------|
| Commercial population is classification-driven | ✅ |
| INTERNAL excluded from certified commercial metrics | ✅ |
| SYSTEM excluded from certified commercial metrics | ✅ |
| COMMERCIAL accounts unaffected | ✅ |
| Overview, Analytics, Reports, Exports aligned | ✅ |
| `role` no longer used as commercial population signal | ✅ |
| All tests pass | ✅ |
