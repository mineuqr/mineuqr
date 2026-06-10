# OCC-MVP — Overview Command Center Implementation

**Project:** MineuQR  
**Program:** ADMIN-DASHBOARD-UX-REFINE-1 / OCC-MVP  
**Date:** 2026-06-10  
**Authority:** `OVERVIEW-COMMAND-CENTER-MVP-PLAN.md`, `OVERVIEW-COMMAND-CENTER-DISCOVERY.md`

---

## Summary

Transformed `/admin` from a navigation hub into a **Platform Command Center** with three sections:

1. **Executive Snapshot** — canonical platform KPIs  
2. **Needs Attention** — operational attention queues with drill actions  
3. **Quick Actions** — action-oriented workspace intents  

No new APIs, backend changes, routing changes, or security/commercial logic changes.

---

## 1. Components Removed (from Overview composition)

| Component | Path | Disposition |
|-----------|------|-------------|
| `OverviewFeaturedShortcutsSection` | `client/src/components/admin/sections/overview/OverviewFeaturedShortcutsSection.tsx` | **Unmounted** — file retained, `@deprecated` |
| `OverviewAllSectionsSection` | `client/src/components/admin/sections/overview/OverviewAllSectionsSection.tsx` | **Unmounted** — file retained, `@deprecated` |
| `ReportsStatusIndicator` (overview header) | `client/src/pages/admin/AdminDashboardHome.tsx` | **Removed from header** — component retained for other surfaces |

`OverviewWelcomeSection` was already unmounted before OCC-MVP (UX-REFINE-1C).

---

## 2. Components Added

| Component | Path | Domain | Responsibility |
|-----------|------|--------|----------------|
| `OverviewNeedsAttentionSection` | `client/src/components/admin/domains/customer-success/OverviewNeedsAttentionSection.tsx` | Customer Success | Attention queues, empty state, View Accounts / View Commercial actions |
| `OverviewQuickActionsSection` | `client/src/components/admin/sections/overview/OverviewQuickActionsSection.tsx` | Composition | Five action rows: Accounts, Tenants, Communications, Commercial Health, Analytics |

---

## 3. Reused Components

| Component | Path | MVP usage |
|-----------|------|-----------|
| `AdminOperationsShell` | `layout/AdminOperationsShell.tsx` | Unchanged page shell |
| `OverviewDashboardSections` | `sections/overview/OverviewDashboardSections.tsx` | Entry host |
| `LaunchReadinessOverviewComposition` | `domains/launch-readiness/LaunchReadinessOverviewComposition.tsx` | Rewired children |
| `ReportsHomeKpiSection` | `domains/reports/ReportsHomeKpiSection.tsx` | Executive snapshot (extended KPI set) |
| `AdminStatCard` | `layout/AdminStatCard.tsx` | KPI tiles |
| `AdminPageSection` | `sections/AdminPageSection.tsx` | KPI + quick actions shells |
| `AdminSection` | `layout/AdminSection.tsx` | Needs attention section header + actions |
| `CommercialOverviewNeedsAttention` | `commercial/CommercialOverviewNeedsAttention.tsx` | Attention count cards (+ drill links) |
| `AdminEmptyState` | `operations/AdminEmptyState.tsx` | All-clear attention state |
| `useCustomerSuccessCommercialData` | `domains/customer-success/` | `getCommercialOverview` query + labels |
| `mapDashboardSummaryToKPIs` | `lib/admin/dashboardSummaryKpis.ts` | KPI field mapping (+ `activeTrials`) |
| `operationsTabHref` | `pages/admin/operations/operationsTab.ts` | Accounts / tenants / communications drill targets |
| `adminDash.opsWorkspace`, `operationsCard`, `opsListRow` | `adminDashStyles.ts` | Command center rhythm |

---

## 4. Data Sources Used

| Procedure | Fields consumed | Section |
|-----------|-----------------|---------|
| `admin.getDashboardSummary` | `mrr`, `activeSubscriptions`, `activeTrials`, `expiringAccounts`, `totalUsers` | Executive Snapshot |
| `admin.getCommercialOverview` | `needsAttention.{expiringWithin30Days, expiredAccounts, canceledAccounts}` | Needs Attention |

**No new queries.** `getCommercialOverview` is shared with `/admin/commercial` (React Query cache deduplication on navigation).

**Client mapping:** `mapDashboardSummaryToKPIs` only — no client-side metric derivation.

---

## 5. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/admin/dashboardSummaryKpis.ts` | Added `activeTrials` to type + mapper |
| `client/src/lib/admin/dashboardSummaryKpis.test.ts` | Updated expectations for `activeTrials` |
| `client/src/components/admin/domains/reports/ReportsHomeKpiSection.tsx` | MVP KPI order: MRR, active subs, trials, expiring, total users; `grid-cols-1 lg:grid-cols-5` |
| `client/src/components/admin/commercial/CommercialOverviewNeedsAttention.tsx` | Reordered cards (expiring → expired → canceled); optional `drillHref` per card |
| `client/src/components/admin/domains/customer-success/OverviewNeedsAttentionSection.tsx` | **New** |
| `client/src/components/admin/sections/overview/OverviewQuickActionsSection.tsx` | **New** |
| `client/src/components/admin/domains/launch-readiness/LaunchReadinessOverviewComposition.tsx` | Composition swap |
| `client/src/pages/admin/AdminDashboardHome.tsx` | Removed `ReportsStatusIndicator` from header |
| `client/src/components/admin/sections/overview/OverviewDashboardSections.tsx` | JSDoc update |
| `client/src/components/admin/sections/overview/OverviewFeaturedShortcutsSection.tsx` | `@deprecated` |
| `client/src/components/admin/sections/overview/OverviewAllSectionsSection.tsx` | `@deprecated` |
| `client/src/components/admin/domains/customer-success/index.ts` | Export `OverviewNeedsAttentionSection` |
| `client/src/locales/en.json` | `admin.commandCenter.*` keys |
| `client/src/locales/ar.json` | `admin.commandCenter.*` keys |
| `docs/commercial-audit/OCC-MVP-IMPLEMENTATION.md` | **New** (this document) |

---

## 6. Validation Results

| Command | Result |
|---------|--------|
| `npm run check` | **PASS** — `tsc --noEmit` |
| `npm test` | **PASS** — 90 files, 639 passed, 2 skipped |

---

## Target Structure (achieved)

```
/admin
├── Executive Snapshot     (ReportsHomeKpiSection)
├── Needs Attention        (OverviewNeedsAttentionSection)
└── Quick Actions          (OverviewQuickActionsSection)
```

---

## Success Criteria

| Criterion | Status |
|-----------|--------|
| Overview becomes action-oriented | ✅ Attention queues + quick actions |
| No navigation directory behavior | ✅ Featured + all-sections grids removed |
| No new APIs | ✅ |
| No backend changes | ✅ |
| No architecture / routing changes | ✅ |
| Existing components reused | ✅ |
| Minimal blast radius | ✅ Composition + overview files only |
| Production-safe | ✅ All tests pass |

---

## Out of Scope (unchanged)

Activity feed, security alerts, health monitoring, forecasting, growth analytics, search, command palette, notification center, new queues, new backend endpoints, subscription health strip on hub (Phase 2).

---

*Implementation complete. Commercial page and Operations workspace unchanged.*
