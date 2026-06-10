# REBUILD-4C — Page Simplification

**Program:** ADMIN-DASHBOARD-REBUILD-4  
**Phase:** 4C — Page Simplification

---

## Target Pattern

```
Page
└─ Composition Only (auth + shell + sections)

Sections
└─ Own section responsibilities
```

---

## Before / After Line Counts

| Page | Before | After | Responsibility |
|------|--------|-------|----------------|
| `AdminDashboardHome.tsx` | ~192 | ~35 | Auth, shell, `<OverviewDashboardSections />` |
| `AdminCommercialPage.tsx` | ~170 | ~35 | Auth, shell, export actions + sections |
| `AdminAnalyticsPage.tsx` | ~36 | ~32 | Auth, shell, `<AnalyticsSummarySection />` |
| `AdminSectionPlaceholder.tsx` | ~72 | ~42 | Auth, shell, placeholder section |

---

## Page Responsibilities (after)

Each page performs exactly three roles:

1. **Auth gate** — `useAuthGate` → pending / denied branches
2. **Shell metadata** — `resolveAdminPageShell(routeId, t)`
3. **Section composition** — render section components inside `AdminOperationsShell`

Embedded section markup, queries, label assembly, and shortcut grids removed from pages.

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/pages/admin/AdminDashboardHome.tsx` | Thin orchestration |
| `client/src/pages/admin/AdminCommercialPage.tsx` | Thin orchestration |
| `client/src/pages/admin/AdminAnalyticsPage.tsx` | Section import swap |
| `client/src/pages/admin/AdminSectionPlaceholder.tsx` | Section import swap |

## Files Unchanged

- `App.tsx` — routing
- `adminRouteRegistry.ts` — route metadata
- `AdminDashboardSidebar.tsx` — navigation
- `StatisticsPanel.tsx` — analytics domain widget
- `AdminManagement.tsx` — operations workspace
