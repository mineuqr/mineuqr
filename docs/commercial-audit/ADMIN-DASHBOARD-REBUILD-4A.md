# REBUILD-4A — Section Ownership Inventory

**Program:** ADMIN-DASHBOARD-REBUILD-4  
**Phase:** 4A — Section Ownership Inventory  
**Mode:** Implementation (structural extraction only)

---

## Objective

Identify all admin dashboard page sections and document ownership boundaries before composition extraction.

---

## Page → Section Map

### `/admin` — `AdminDashboardHome`

| Section id | Component (post-4B) | Ownership |
|------------|---------------------|-----------|
| `overview-status` | `OverviewStatusIndicator` | Shell status badge reference (presentation only) |
| `overview-welcome` | `OverviewWelcomeSection` | Welcome title + body copy |
| `overview-kpi` | `OverviewKpiSection` | `getDashboardSummary` query, KPI mapping, loading boundary |
| `overview-featured-shortcuts` | `OverviewFeaturedShortcutsSection` | Analytics / Operations / Commercial quick links |
| `overview-all-sections` | `OverviewAllSectionsSection` | Full nav shortcut grid from registry |

**Page retains:** auth gate, `resolveAdminPageShell("overview")`, shell wrapper.

---

### `/admin/commercial` — `AdminCommercialPage`

| Section id | Component (post-4B) | Ownership |
|------------|---------------------|-----------|
| `commercial-export-actions` | `CommercialOverviewExportActions` | Header export buttons (shared query) |
| `commercial-executive-kpi` | `CommercialOverviewSections` → executive block | Executive KPIs |
| `commercial-metadata` | metadata panel block | Report metadata |
| `commercial-subscription-health` | health block | Subscription health breakdown |
| `commercial-needs-attention` | attention block | Expiring / canceled / expired counts |
| `commercial-plan-distribution` | plan distribution block | Plan distribution chart data |

**Shared data:** `useCommercialOverviewData` → `getCommercialOverview` (React Query dedupes header + body).

**Page retains:** auth gate, `resolveAdminPageShell("commercial")`, shell wrapper.

---

### `/admin/analytics` — `AdminAnalyticsPage`

| Section id | Component (post-4B) | Ownership |
|------------|---------------------|-----------|
| `analytics-summary` | `AnalyticsSummarySection` | Wraps `StatisticsPanel` (`getCommercialAnalytics`) |

**Page retains:** auth gate, `resolveAdminPageShell("analytics")`, shell wrapper.

---

### Placeholder routes — `AdminSectionPlaceholder`

Routes: `customer-success`, `health`, `security`, `reports`, `launch-readiness`

| Section id | Component (post-4B) | Ownership |
|------------|---------------------|-----------|
| `placeholder-coming-soon` | `PlaceholderComingSoonIndicator` | Shell status indicator |
| `placeholder-content` | `AdminRoutePlaceholderSection` | Card body, back link, route metadata |

**Page retains:** auth gate, `resolveAdminPageShell(routeId)`, shell wrapper.

---

### `/admin/operations` — `AdminManagement`

**Out of scope for REBUILD-4 page composition.** Tab bodies (`AccountsTab`, `TenantsTab`, `CommunicationsTab`) are operational workspaces with embedded table/dialog logic — not dashboard summary sections. No extraction in this program.

---

## Ownership Boundaries

| Layer | Owns |
|-------|------|
| Route registry (`adminRouteRegistry`) | Paths, titles, breadcrumbs, nav metadata |
| Page component | Auth gate, shell metadata, section composition |
| Section component | Section header, data fetch (where applicable), loading boundary, child layout |
| Domain widgets (`commercial/*`, `StatisticsPanel`) | Presentation of data contracts (unchanged) |

---

## Shared Contracts (REBUILD-4D)

| Contract | File | Purpose |
|----------|------|---------|
| `AdminSectionHeaderContract` | `adminSectionContracts.ts` | Title + optional description |
| `AdminSectionLoadingContract` | `adminSectionContracts.ts` | Loading state + min-height |
| `AdminPageSection` | `AdminPageSection.tsx` | Overview-style section shell |
| `AdminSection` (existing) | `layout/AdminSection.tsx` | Commercial-style section shell |

No visual redesign — contracts document existing patterns only.
