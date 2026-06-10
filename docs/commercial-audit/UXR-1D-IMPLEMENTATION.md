# UXR-1D — Layout Alignment Implementation

**Program:** ADMIN-DASHBOARD-UX-REFINE-1  
**Task:** UX-REFINE-1D  
**Reference:** `OVERVIEW-REPORTS-LAYOUT-AUDIT.md`  
**Scope:** Shell configuration + workspace density only — no routing, permissions, or business logic changes.

## Objective

Eliminate configuration drift by propagating the **Operations** `AdminOperationsShell` pattern (`compact`, `narrowContent`, inline header actions) to all non-operations admin pages.

**Operations (`/admin/operations`) was not modified.**

---

## Shell Alignment Matrix

| Page | Before | After |
|------|--------|-------|
| `/admin` | `compact`, `max-w-7xl`, custom `overviewMain` | `compact` + `narrowContent` (`max-w-5xl`) |
| `/admin/commercial` | Default shell, subtitle, `max-w-7xl` | `compact` + `narrowContent`, no subtitle |
| `/admin/analytics` | Default shell, subtitle, `max-w-7xl` | `compact`, **no** `narrowContent` (chart exception) |
| `/admin/health` | Default shell, subtitle, `statusIndicator` strip | `compact` + `narrowContent`, inline `headerActions` |
| `/admin/security` | Same as health | Same alignment |
| `/admin/reports` | Same as health | Same alignment |
| `/admin/launch-readiness` | Same as health | Same alignment |
| `/admin/operations` | Unchanged | Unchanged |

---

## Header Changes

| Change | Pages affected |
|--------|----------------|
| `compact` → `pageTitleCompact` sizing | All target pages |
| Removed `subtitle` prop | Commercial, Analytics, placeholders |
| `statusIndicator` below header removed | Health, Security, Reports, Launch Readiness |
| Indicators moved to `headerActions` (inline, end-aligned) | Placeholders (`PlaceholderComingSoonIndicator compact`), Overview (unchanged pattern) |
| Header block padding | Inherited Operations `py-2 sm:py-3` via `compact` |

---

## Width Changes

| Page | Width strategy |
|------|----------------|
| Overview, Commercial, Health, Security, Reports, Launch Readiness | `narrowContent` → `adminDash.opsShellMax` (`max-w-5xl`) |
| Analytics | **Exception retained:** `max-w-7xl` for chart readability |
| Operations | Unchanged (`max-w-5xl`) |

---

## Workspace / Section Changes

| Component | Change |
|-----------|--------|
| `LaunchReadinessOverviewComposition` | `overviewWorkspace` → `opsWorkspace` (`space-y-1.5`) |
| `ReportsCommercialPageContent` | Wrapped sections in `opsWorkspace` |
| `AdminSection` | Added `density="console"` (compact title, `space-y-2`, end-aligned actions) |
| Reports + CS commercial sections | `density="console"` on all `AdminSection` usages |
| `StatisticsPanel` | Root `space-y-8` → `consoleSections` (`space-y-3`); compact section headings; tighter grids |
| `adminDashStyles` | Removed `overviewMain` / `overviewWorkspace`; added `consoleSections` |

---

## RTL Consistency

No page-specific RTL overrides were introduced. Alignment uses existing logical properties:

- Shell padding: `px-4 sm:px-6 lg:px-8`
- `AdminSection` actions: `justify-end` (mirrors Operations toolbar end alignment)
- Breadcrumbs: existing `AdminShellBreadcrumbs` with locale-aware separator
- Title block: `text-start` / flex row unchanged from Operations shell

---

## Exceptions Retained

1. **Analytics width** — `narrowContent` not applied; charts use full `max-w-7xl`.
2. **Analytics section rhythm** — `consoleSections` (`space-y-3`) instead of `opsWorkspace` (`space-y-1.5`) to preserve chart card breathing room.
3. **Operations tabs** — `headerFooter` tab list remains operations-only.

---

## Files Changed

| File | Change |
|------|--------|
| `pages/admin/AdminDashboardHome.tsx` | `narrowContent`; remove custom main override |
| `pages/admin/AdminCommercialPage.tsx` | `compact`, `narrowContent`, no subtitle |
| `pages/admin/AdminAnalyticsPage.tsx` | `compact`, no subtitle |
| `pages/admin/AdminSectionPlaceholder.tsx` | `compact`, `narrowContent`, inline coming-soon badge |
| `layout/adminDashStyles.ts` | `consoleSections`; remove overview-specific tokens |
| `layout/AdminSection.tsx` | `density="console"` variant |
| `domains/launch-readiness/LaunchReadinessOverviewComposition.tsx` | `opsWorkspace` |
| `domains/reports/ReportsCommercialPageContent.tsx` | `opsWorkspace` wrapper |
| `domains/reports/ReportsExecutiveSection.tsx` | `density="console"` |
| `domains/reports/ReportsMetadataSection.tsx` | `density="console"` |
| `domains/reports/ReportsPlanDistributionSection.tsx` | `density="console"` |
| `domains/customer-success/CustomerSuccessHealthSection.tsx` | `density="console"` |
| `domains/customer-success/CustomerSuccessAttentionSection.tsx` | `density="console"` |
| `sections/placeholder/PlaceholderComingSoonIndicator.tsx` | `compact` prop for header |
| `pages/admin/StatisticsPanel.tsx` | Console section density |

**Not changed:** `pages/AdminManagement.tsx` (Operations baseline).

---

## Verification

```bash
npm run check
npm test
```

---

## Success Criteria

- ✓ Operations unchanged
- ✓ Target pages use same shell props family as Operations
- ✓ Configuration drift reduced (shared `compact` / `narrowContent` matrix)
- ✓ Consistent content start point and horizontal centering
- ✓ Consistent compact header behavior
- ✓ Operations workspace density propagated
- ✓ No business logic or routing changes
