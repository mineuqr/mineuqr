# COMPATIBILITY-CLEANUP-1 — Implementation Report

**Status:** Implemented  
**Date:** 2026-07-22  
**Authority:** ADR-ARCH-020 Financial Settlement Platform  
**Prior:** COMPATIBILITY-READINESS-VALIDATION-1 → **GO**  
**Code policy:** Permanently delete GO-approved financial compatibility layers; do not change business behaviour

---

## Architecture Notes

This program deletes dead financial compatibility code only. Production paths already used Membership + Check-centric APIs after COMPATIBILITY-DEPENDENCY-ELIMINATION-1. Session Aggregate, Session operational APIs, Kitchen, Expo, Pickup, Printing, Reporting (`reporting.*`), Membership, and Check remain.

| Domain | Authority after cleanup |
|--------|-------------------------|
| Order discovery for Check money | Membership (`listActiveOrderIdsForCheck`) only |
| Check settle / void / complimentary | `*ById` Check-centric APIs only |
| Membership enroll / sync / void | Authoritative helpers only (no dual-write) |
| Restaurant Revenue KPIs | `reporting.getBusinessMetrics*` (Check `grandTotal`) |
| Session Aggregate | Operational context only (not money SSOT) |

---

## 1. Every file removed

| File | Reason |
|------|--------|
| `server/analytics/settlementMetrics.ts` | Session `totalAmount` settlement analytics (non-canonical) |
| `server/analytics/settlementMetrics.test.ts` | Tests for deleted module |

---

## 2. Every compatibility component removed

| Component | Former location | Removal |
|-----------|-----------------|---------|
| `dualWriteEnrollOrderForSession` | `checkMembershipService.ts` | Deleted |
| `dualWriteSyncSessionOrdersToCheck` | `checkMembershipService.ts` | Deleted |
| `dualWriteDeactivateMembershipsOnVoid` | `checkMembershipService.ts` | Deleted |
| `dualWriteEnabled()` gate | `checkMembershipService.ts` | Deleted |
| `loadOrdersSubtotalCompatibilitySessionScan` | `CheckService.ts` | Deleted |
| Session money scan branch in `loadOrdersSubtotal` | `CheckService.ts` | Membership-only |
| `settleCheckPaid` (sessionId façade) | `CheckService.ts` + barrels | Deleted |
| `settleCheckComplimentary` (sessionId façade) | `CheckService.ts` + barrels | Deleted |
| `voidCheck` (sessionId façade) | `CheckService.ts` + barrels | Deleted |
| `finalizeOpenCheck` (sessionId façade) | `CheckService.ts` | Deleted (kept internal `finalizeOpenCheckById`) |
| Soft-sunset registry entries for ops settlement | `legacyReportingSurfaces.ts` | Deleted |
| Client soft-sunset aliases | `queryRuntime.ts` | Deleted |

**Retained (operational / ADR-020):** `createOpenCheckForSession`, `ensureOpenCheckForSession`, `recalculateOpenCheckForSession`, `enrollOrderForSessionCheck`, `syncSessionOrdersToCheck`, `deactivateMembershipsOnCheckVoid`, Session Aggregate, `session.*` ops boards.

---

## 3. Every deleted API

| API | Surface |
|-----|---------|
| `ops.getSettlementSummary` | tRPC ops router |
| `ops.getSettlementTrend` | tRPC ops router |
| `ops.getSettlementBreakdown` | tRPC ops router |
| `getSettlementSummary` / `getSettlementTrend` / `getSettlementBreakdown` | `server/analytics/settlementMetrics.ts` |
| `settleCheckPaid({ sessionId })` | Check service export |
| `settleCheckComplimentary({ sessionId })` | Check service export |
| `voidCheck({ sessionId })` | Check service export |
| `opsSettlementSummaryQueryOptions` | Client query runtime alias |
| `opsSettlementTrendQueryOptions` | Client query runtime alias |

Canonical replacements (unchanged): `reporting.getBusinessMetricsSummary` / `reporting.getBusinessMetricsTrend`; settle/void via `settleCheckPaidById` / `settleCheckComplimentaryById` / `voidCheckById`.

---

## 4. Deleted feature flags

| Flag / env | Former default | Status |
|------------|----------------|--------|
| `CHECK_MEMBERSHIP_DUAL_WRITE` / `ENV.checkMembershipDualWrite` | ON | **Removed** from `server/_core/env.ts` |
| `CHECK_MEMBERSHIP_AUTHORITATIVE_READ` / `ENV.checkMembershipAuthoritativeRead` | ON | **Removed** from `server/_core/env.ts` |

**Not removed (out of scope / non-financial):** `TABLE_SESSION_DUAL_WRITE` / `ENV.tableSessionDualWrite` (order↔session wiring, not Check money).

---

## 5. Deleted adapters

| Adapter | Notes |
|---------|-------|
| `server/analytics/settlementMetrics.ts` | Session settlement metrics adapter for ops procedures |
| Soft-sunset ops settlement registry rows | Removed from `LEGACY_REPORTING_SURFACES` |
| `opsSettlement*QueryOptions` | Client aliases → reporting query options |

Forbidden names remain in `FORBIDDEN_RESTAURANT_KPI_CLIENT_APIS` and `NON_CANONICAL_REVENUE_SURFACES` so revival is guarded.

---

## 6. Regression summary

| Suite | Result |
|-------|--------|
| Check / Membership unit tests (`CheckService.m3/m4/m5`, `checkMembershipService`) | **PASS** |
| Ops router tests (settlement APIs absent) | **PASS** |
| Operational-session architecture guards (M1–M5, cleanup, check management, settlement methods) | **PASS** |
| Reporting sunset / KPI governance guards + `kpiGovernance` | **PASS** |
| Dining Session tests (`sessionService`, aggregates, actions) | **PASS** |
| Reporting platform shared + server aggregator tests | **PASS** |
| TypeScript `tsc --noEmit` | Pre-existing repo errors remain; cleanup-introduced `listArchitecturalGaps` typing fixed |
| ESLint | No project ESLint config / local binary in this workspace |

Architecture guards now assert **absence** of dual-write helpers, Session-scan money, Session settle/void façades, membership flags, `ops.getSettlement*`, and `settlementMetrics.ts`.

---

## 7. Final architecture state after cleanup

```
Order place / Session attach
  → enrollOrderForSessionCheck | enrollOrderInCheck | ensureCheckForOrder
  → syncSessionOrdersToCheck (table Check create)
  → recalculateOpenCheck* (Membership order ids → Check money)

Settle / void (Dashboard Session UX + lifecycle)
  → settleCheckPaidById | settleCheckComplimentaryById | voidCheckById
  → finalizeOpenCheckById (Membership subtotal + freeze + settlement lines)

Revenue / business KPIs
  → reporting.getBusinessMetrics* (Paid Check grandTotal)

Session Aggregate
  → operational visit context only (status, table, activeCheckId)
  → NOT financial SSOT
```

No financial compatibility rollback path remains in code.

---

## 8. Certification statement

**Financial Settlement Platform contains no remaining financial compatibility layer.**

---

## Modified files (supporting cleanup)

- `server/operational-session/check/CheckService.ts`
- `server/operational-session/check/checkMembershipService.ts`
- `server/operational-session/check/index.ts`
- `server/operational-session/index.ts`
- `server/_core/env.ts`
- `server/ops/opsRouter.ts`
- `server/ops/opsRouter.test.ts`
- `client/src/lib/queryRuntime.ts`
- `shared/reporting-platform/legacyReportingSurfaces.ts`
- `shared/reporting-platform/kpiDictionary.ts`
- Architecture / unit tests under `shared/operational-session/__tests__/`, `shared/reporting-platform/__tests__/`, `server/operational-session/check/__tests__/`
