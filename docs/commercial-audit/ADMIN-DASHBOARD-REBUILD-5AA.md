# REBUILD-5AA — Platform Asset Inventory

**Program:** ADMIN-DASHBOARD-REBUILD-5A  
**Phase:** 5AA — Platform Asset Inventory  
**Mode:** Audit (inventory only — no code movement)  
**Date:** 2026-06-07

---

## Scope

Complete inventory of MineuQR Admin assets as of REBUILD-4 completion. Includes live surfaces, placeholder routes, transitional domains, server APIs, and supporting infrastructure.

**Approved platform domains (REBUILD-5 targets):** Security · Health · Customer Success · Reports · Launch Readiness

**Transitional live domains (not platform domains, but inventoried):** Overview · Commercial · Analytics · Operations

---

## 1. Route & Navigation Assets

| Asset id | Location | Status | Purpose |
|----------|----------|--------|---------|
| `ADMIN_ROUTE_DEFINITIONS` | `client/src/lib/admin/routes/adminRoutes.ts` | LIVE | 10 route definitions (paths, titles, breadcrumbs, categories) |
| `adminRouteRegistry` | `client/src/lib/admin/routes/adminRouteRegistry.ts` | LIVE | Nav derivation, shell resolver, active-state |
| `adminNavigation` shim | `client/src/lib/admin/adminNavigation.ts` | LIVE | Re-export compat |
| `AdminDashboardSidebar` | `client/src/components/admin/layout/AdminDashboardSidebar.tsx` | LIVE | Primary sidebar |
| `ADMIN_LEGACY_ROUTES` | `adminRoutes.ts` | LIVE (metadata) | Bookmark redirects (`/statistics`, `/users`, `/super-admin`, `/admin/tenants`) |
| App route table | `client/src/App.tsx` | LIVE | 10 admin routes + 4 legacy redirects |

### Route inventory

| Route | Page | Status |
|-------|------|--------|
| `/admin` | `AdminDashboardHome` | LIVE |
| `/admin/commercial` | `AdminCommercialPage` | LIVE |
| `/admin/analytics` | `AdminAnalyticsPage` | LIVE |
| `/admin/operations` | `AdminManagement` | LIVE |
| `/admin/tenants` | `AdminTenantsPage` | REDIRECT → operations tenants tab |
| `/admin/customer-success` | `AdminCustomerSuccessPage` | PLACEHOLDER |
| `/admin/health` | `AdminHealthPage` | PLACEHOLDER |
| `/admin/security` | `AdminSecurityPage` | PLACEHOLDER |
| `/admin/reports` | `AdminReportsPage` | PLACEHOLDER |
| `/admin/launch-readiness` | `AdminLaunchReadinessPage` | PLACEHOLDER |
| `/commercial/diagnostics` | `CommercialDiagnostics` | LIVE (non-admin shell) |

---

## 2. Page Assets

| Asset | Location | APIs / deps |
|-------|----------|-------------|
| `AdminDashboardHome` | `pages/admin/AdminDashboardHome.tsx` | Shell only; sections own queries |
| `AdminCommercialPage` | `pages/admin/AdminCommercialPage.tsx` | Shell + `CommercialOverviewSections` |
| `AdminAnalyticsPage` | `pages/admin/AdminAnalyticsPage.tsx` | Shell + `AnalyticsSummarySection` |
| `AdminManagement` | `pages/AdminManagement.tsx` | Tab shell; `AccountsTab`, `TenantsTab`, `CommunicationsTab` |
| `AdminSectionPlaceholder` | `pages/admin/AdminSectionPlaceholder.tsx` | Shared placeholder wrapper |
| `placeholderPages` | `pages/admin/placeholderPages.tsx` | Factory for 5 platform domain routes |
| `AdminLegacyRedirect` | `pages/admin/AdminLegacyRedirect.tsx` | Client redirect helper |
| `StatisticsPanel` | `pages/admin/StatisticsPanel.tsx` | `getCommercialAnalytics`, `exportCommercialReport` |
| `CommunicationsTab` | `pages/admin/operations/CommunicationsTab.tsx` | `getOwnerOverviewList`, `sendCustomNotification`, `sendBulkNotification` |
| `operationsTab` | `pages/admin/operations/operationsTab.ts` | Tab URL helpers |
| `CommercialDiagnostics` | `pages/CommercialDiagnostics.tsx` | `useCommercialEntitlements` (tenant-facing CRS read) |

---

## 3. Section Assets (REBUILD-4)

| Section | Location | APIs |
|---------|----------|------|
| `OverviewWelcomeSection` | `sections/overview/` | None |
| `OverviewKpiSection` | `sections/overview/` | `getDashboardSummary` |
| `OverviewFeaturedShortcutsSection` | `sections/overview/` | Static nav links |
| `OverviewAllSectionsSection` | `sections/overview/` | `ADMIN_NAV_ITEMS` |
| `OverviewStatusIndicator` | `sections/overview/` | Static badges |
| `OverviewDashboardSections` | `sections/overview/` | Composes overview sections |
| `CommercialOverviewSections` | `sections/commercial/` | `getCommercialOverview` |
| `CommercialOverviewExportActions` | `sections/commercial/` | `exportCommercialReport` |
| `useCommercialOverviewData` | `sections/commercial/` | Shared commercial query hook |
| `AnalyticsSummarySection` | `sections/analytics/` | Wraps `StatisticsPanel` |
| `AdminRoutePlaceholderSection` | `sections/placeholder/` | Route metadata only |
| `PlaceholderComingSoonIndicator` | `sections/placeholder/` | Static banner |

---

## 4. KPI & Summary Card Assets

| Widget | Location | Data source | Count |
|--------|----------|-------------|-------|
| Overview home KPI strip | `OverviewKpiSection` | `getDashboardSummary` | 5 cards |
| Commercial executive KPIs | `CommercialOverviewExecutiveKpis` | `getCommercialOverview` | 4 cards |
| Commercial subscription health | `CommercialOverviewSubscriptionHealth` | same | 5 count tiles |
| Commercial needs attention | `CommercialOverviewNeedsAttention` | same | 3 metrics |
| Commercial metadata panel | `CommercialOverviewMetadataPanel` | same | Authority summary |
| Commercial plan distribution | `CommercialOverviewPlanDistribution` | same | Table |
| Analytics platform overview | `StatisticsPanel` | `getCommercialAnalytics` | 5 cards |
| Analytics subscription KPIs | `StatisticsPanel` | same | 4 cards |
| Analytics subscription status | `StatisticsPanel` | same | 4 count tiles |
| `AdminKPISection` (unused) | `layout/AdminKPISection.tsx` | Props-driven | 5 cards — **orphan component** |
| `AdminStatCard` | `layout/AdminStatCard.tsx` | Primitive | Shared KPI card shell |

---

## 5. Quick Action & Navigation Assets

| Asset | Location | Actions |
|-------|----------|---------|
| `OverviewFeaturedShortcutsSection` | sections/overview | Analytics, Operations (accounts), Commercial |
| `OverviewAllSectionsSection` | sections/overview | All 9 non-overview nav routes |
| `NavShortcutCard` | sections/overview | Reusable shortcut card |
| `AdminDashboardSidebar` | layout | Full primary nav (10 items) |
| Accounts tab toolbar | `AdminManagement` AccountsTab | Create internal user, search, classification filter |
| Accounts row actions | AccountsTab | Role edit, classification edit, subscription CRUD, invoice PDF, delete, notify |
| Tenants tab toolbar | TenantsTab | Create restaurant, search, status filter |
| Tenants row actions | TenantsTab | Edit (owner dashboard), delete |
| Communications tab | `CommunicationsTab` | Bulk notify, per-user notify |

---

## 6. Report & Export Assets

| Asset | Location | Formats | API |
|-------|----------|---------|-----|
| `CommercialExportButtons` | `commercial/CommercialExportButtons.tsx` | CSV, XLSX, PDF | `exportCommercialReport` |
| Commercial page header export | `CommercialOverviewExportActions` | Same | Same |
| Analytics page export | `StatisticsPanel` | Same | Same |
| `downloadReportFile` | `lib/admin/downloadReportFile.ts` | Browser download helper | Consumer of export payload |
| `CommercialReportService` | `server/commercial/reporting/` | Package builder | Server |
| `renderCommercialExport` | `server/commercial/reporting/` | Format rendering | Server |
| `analyticsProjection` | `server/commercial/reporting/` | Analytics UI projection | Server |
| Export format adapters | `server/commercial/reporting/adapters/` | CSV/XLSX/PDF | Server |
| `/admin/reports` route | placeholder | **No UI** | — |

---

## 7. Analytics Widget Assets

| Widget | Location | Data |
|--------|----------|------|
| User & restaurant growth chart | `StatisticsPanel` | `extensions.userGrowth.series` |
| Owners by plan pie chart | `StatisticsPanel` | `commercial.planDistribution` |
| Revenue by month chart | `StatisticsPanel` | **Placeholder** (no canonical trend) |
| Renewal rate KPI | `StatisticsPanel` | **Unavailable** (`—`) |
| Subscriber overview table | `StatisticsPanel` | `subscribers[]` |
| Plan distribution table | `CommercialOverviewPlanDistribution` | Commercial snapshot |

---

## 8. Operational Workspace Assets

### AccountsTab (`AdminManagement.tsx`)

| Feature | API |
|---------|-----|
| Owner directory + pagination | `getOwnerOverviewList` |
| Restaurant count join | `listRestaurants` |
| Role edit | `updateUserRole` |
| Classification edit | `updateAccountClassification` |
| Create internal user | `createInternalUser` |
| Delete user | `deleteUser` |
| Subscription create/edit/delete | `createUserSubscriptionByAdmin`, `updateUserSubscriptionByAdmin`, `deleteUserSubscriptionByAdmin` |
| Invoice PDF | `generateInvoicePDF` |
| Plan picker | `subscription.listPlans` |
| Platform account protection | `isProtectedPlatformAccountUser` (client) |

### TenantsTab

| Feature | API |
|---------|-----|
| Restaurant directory | `listRestaurants` |
| Create restaurant | `restaurant.create` |
| Optional subscriber provisioning | `createSubscriberAccount` |
| Delete restaurant | `restaurant.delete` |
| Country/currency | `countryCurrency.getAll` |

### CommunicationsTab

| Feature | API |
|---------|-----|
| User picker | `getOwnerOverviewList` |
| Per-user notification | `sendCustomNotification` |
| Bulk announcement | `sendBulkNotification` |

---

## 9. Security-Related Assets

### Client

| Asset | Location | Role |
|-------|----------|------|
| `useAuthGate` | `_core/hooks/useAuthGate.ts` | Admin auth resolution |
| `AuthGate` components | `components/AuthGate.tsx` | `AdminAccessDenied`, `AuthGatePending` |
| `adminQueriesEnabled` | `lib/queryRuntime.ts` | Query gating |
| Platform account UI guards | `AdminManagement` AccountsTab | Hides mutations on protected rows |
| `isProtectedPlatformAccountUser` | `shared/platformAccount.ts` | Client flag check |

### Server

| Asset | Location | Role |
|-------|----------|------|
| `assertAdminAccess` | `server/_core/assertAdminAccess.ts` | Admin role gate on all procedures |
| `assertNotSelfAdminTarget` | same | Self-modify/delete prevention |
| `authAudit` | `server/_core/authAudit.ts` | Unauthorized admin access logging |
| `suspiciousActivity` | `server/_core/suspiciousActivity.ts` | Signal tracking |
| `accountClassificationAudit` | `server/accountClassificationAudit.ts` | Classification + internal user ops logs |
| `cascadeAudit` | `server/db/cascadeAudit.ts` | Delete audit metadata |
| `cascadeDeletes` + protected user guards | `server/db/cascadeDeletes.ts` | Protected user modify/delete errors |
| `platformAccount` | `server/platformAccount.ts` | ENV-based platform owner detection |
| `sessionRevocation` | `server/_core/sessionRevocation.ts` | Session validity boundary |
| `deploymentGuards` | `server/_core/deploymentGuards.ts` | CSRF origin checks |

**No dedicated `/admin/security` UI or security-viewer APIs exist.**

---

## 10. Health & Observability Assets

| Asset | Location | Status |
|-------|----------|--------|
| `/admin/health` route | placeholder | No implementation |
| `getExtendedStats` | `adminCoreRouter` | Server API — **no client consumer** |
| `CommercialDiagnostics` | `/commercial/diagnostics` | Live — CRS/entitlements read-only |
| `CommercialEntitlementsDiagnostics` | `components/commercial/` | Diagnostics panels |
| Ops logging (`opsLog`, `OPS_EVENT`) | `server/_core/authOpsMetadata.ts` | Server-side signals |
| `email-config.test.ts` | server tests | SMTP connectivity probe |
| `deploymentReadiness` | `server/_core/deploymentReadiness.ts` | Env readiness checks |
| `OverviewStatusIndicator` | sections/overview | Static legend only — **not health data** |
| `CommercialOverviewSubscriptionHealth` | commercial widgets | Subscription counts — **not platform health** |

---

## 11. Server API Inventory (31 procedures)

### Dashboard read router (`adminDashboardRouter.ts`) — 9

| Procedure | Client consumer |
|-----------|-----------------|
| `getOwnerOverview` | **None** |
| `getOwnerOverviewList` | AccountsTab, CommunicationsTab |
| `getSubscriptionOverview` | **None** |
| `getDashboardSummary` | OverviewKpiSection |
| `getCommercialOverview` | CommercialOverviewSections |
| `getCommercialAnalytics` | StatisticsPanel |
| `getCommercialExportPackage` | **None** (server-internal) |
| `exportCommercialReport` | CommercialExportButtons |
| `listRestaurants` | AccountsTab, TenantsTab |

### Core admin router (`routers.ts`) — 22

| Procedure | Client consumer | Notes |
|-----------|-----------------|-------|
| `createSubscriberAccount` | TenantsTab | |
| `resetSubscriberPassword` | **None** | |
| `createRestaurantSubscription` | **None** | DEPRECATED |
| `updateRestaurantSubscription` | **None** | DEPRECATED |
| `cancelRestaurantSubscription` | **None** | DEPRECATED |
| `deleteRestaurantSubscription` | **None** | DEPRECATED |
| `getStatistics` | **None** | DEPRECATED |
| `getRevenueByMonth` | **None** | DEPRECATED |
| `getExtendedStats` | **None** | Indirect via analytics projection |
| `listAllUsers` | **None** | Superseded by `getOwnerOverviewList` |
| `createInternalUser` | AccountsTab | |
| `updateAccountClassification` | AccountsTab | |
| `updateUserRole` | AccountsTab | |
| `deleteUser` | AccountsTab | |
| `createUserSubscriptionByAdmin` | AccountsTab | |
| `updateUserSubscriptionByAdmin` | AccountsTab | |
| `deleteUserSubscriptionByAdmin` | AccountsTab | |
| `sendCustomNotification` | CommunicationsTab | |
| `sendBulkNotification` | CommunicationsTab | |
| `generateInvoicePDF` | AccountsTab | |
| `getUserInvoices` | **None** | |

---

## 12. Supporting Server Modules

| Module | Location | Role |
|--------|----------|------|
| `CommercialReadService` | `server/commercial/` | Canonical owner commercial state (CRS) |
| `CanonicalMetricsService` | `server/commercial/metrics/` | MRR, ARR, dashboard summary, overview snapshot |
| `CommercialOverviewSnapshot` | `server/commercial/metrics/` | Snapshot schema contracts |
| `CommercialReportService` | `server/commercial/reporting/` | Export package assembly |
| `resolveOperationalCounts` | `server/commercial/reporting/` | Entity counts for dashboards |
| `adminKpiCalculations` | `server/` | MRR monthly-equivalent |
| `adminSubscriptionHelpers` | `server/` | Trial/period logic |
| `dashboardSummaryKpis` | `client/lib/admin/` | Summary → KPI mapping |
| `formatAdminCurrency` | `client/lib/admin/` | KPI/revenue formatting |
| `ownerCommercialDisplay` | `client/lib/admin/` | Plan/status display helpers |
| `accountClassificationDisplay` | `client/lib/admin/` | Classification labels |

---

## 13. Layout & Primitive Assets

| Asset | Location | Role |
|-------|----------|------|
| `AdminOperationsShell` | layout | Primary admin shell |
| `AdminSection` | layout | Commercial-style section container |
| `AdminPageSection` | sections | Overview-style section container |
| `AdminShellBreadcrumbs` | layout | Breadcrumb rendering |
| `OperationsTabFrame` | operations | Two-panel operations layout |
| `AdminEmptyState` | operations | Empty/error states |
| `AdminLoadingState` | operations | Loading skeletons |
| `SubscriptionAdminFormFields` | subscription | Subscription dialog form |
| `adminDashStyles` | layout | Shared presentation tokens |

---

## 14. Asset Count Summary

| Category | Live | Placeholder | Orphan / unwired |
|----------|------|-------------|------------------|
| Routes | 5 | 5 | 1 non-admin diagnostics |
| Pages | 6 | 5 (via placeholder factory) | — |
| Sections | 12 | 2 (placeholder) | — |
| KPI/summary widgets | 10 groups | — | 1 (`AdminKPISection`) |
| tRPC procedures | 19 wired | — | 12 unwired/deprecated |
| Export surfaces | 2 (commercial + analytics) | 1 (reports route) | 1 server-only package API |
