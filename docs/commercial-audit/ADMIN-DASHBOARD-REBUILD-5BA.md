# REBUILD-5BA — Domain Ownership Matrix

**Program:** ADMIN-DASHBOARD-REBUILD-5B  
**Phase:** 5BA — Domain Ownership Matrix  
**Mode:** Audit + Architecture Mapping (ownership only — no code movement)

**Rule:** Every asset has exactly **one** primary domain owner. No dual ownership. UI location ≠ ownership.

**Approved domains:** Customer Success · Reports · Security · Health · Launch Readiness

---

## 1. Routes

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `/admin` | `App.tsx` | Overview (transitional) | **Launch Readiness** |
| `/admin/commercial` | `App.tsx` | Commercial (transitional) | **Reports** |
| `/admin/analytics` | `App.tsx` | Analytics (transitional) | **Reports** |
| `/admin/operations` | `App.tsx` | Operations (transitional) | **Customer Success** |
| `/admin/tenants` (redirect) | `App.tsx` | Operations tab alias | **Customer Success** |
| `/admin/customer-success` | `App.tsx` | Placeholder | **Customer Success** |
| `/admin/health` | `App.tsx` | Placeholder | **Health** |
| `/admin/security` | `App.tsx` | Placeholder | **Security** |
| `/admin/reports` | `App.tsx` | Placeholder | **Reports** |
| `/admin/launch-readiness` | `App.tsx` | Placeholder | **Launch Readiness** |
| `/commercial/diagnostics` | `App.tsx` | Non-admin route | **Health** |
| `/statistics` redirect | `App.tsx` | Legacy | **Launch Readiness** |
| `/users` redirect | `App.tsx` | Legacy | **Launch Readiness** |
| `/super-admin` redirect | `App.tsx` | Legacy | **Launch Readiness** |

---

## 2. Pages

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `AdminDashboardHome` | `pages/admin/` | Overview | **Launch Readiness** |
| `AdminCommercialPage` | `pages/admin/` | Commercial | **Reports** |
| `AdminAnalyticsPage` | `pages/admin/` | Analytics | **Reports** |
| `AdminManagement` (tab shell) | `pages/` | Operations | **Customer Success** |
| `AccountsTab` | `AdminManagement.tsx` | Operations | **Customer Success** |
| `TenantsTab` | `AdminManagement.tsx` | Operations | **Customer Success** |
| `CommunicationsTab` | `operations/` | Operations | **Customer Success** |
| `StatisticsPanel` | `pages/admin/` | Analytics | **Reports** |
| `AdminSectionPlaceholder` | `pages/admin/` | Placeholder factory | **Launch Readiness** |
| `placeholderPages` | `pages/admin/` | Placeholder factory | **Launch Readiness** |
| `AdminLegacyRedirect` | `pages/admin/` | Legacy helper | **Launch Readiness** |
| `CommercialDiagnostics` | `pages/` | Non-admin | **Health** |
| `operationsTab` helpers | `operations/` | Operations | **Customer Success** |

---

## 3. Sections (REBUILD-4)

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `OverviewWelcomeSection` | `sections/overview/` | Overview | **Launch Readiness** |
| `OverviewKpiSection` | `sections/overview/` | Overview | **Reports** |
| `OverviewFeaturedShortcutsSection` | `sections/overview/` | Overview | **Launch Readiness** |
| `OverviewAllSectionsSection` | `sections/overview/` | Overview | **Launch Readiness** |
| `OverviewStatusIndicator` | `sections/overview/` | Overview | **Reports** |
| `OverviewDashboardSections` | `sections/overview/` | Overview | **Launch Readiness** |
| `NavShortcutCard` | `sections/overview/` | Overview | **Launch Readiness** |
| `CommercialOverviewSections` | `sections/commercial/` | Commercial | **Reports** |
| `CommercialOverviewExportActions` | `sections/commercial/` | Commercial | **Reports** |
| `useCommercialOverviewData` | `sections/commercial/` | Commercial | **Reports** |
| `AnalyticsSummarySection` | `sections/analytics/` | Analytics | **Reports** |
| `AdminRoutePlaceholderSection` | `sections/placeholder/` | Placeholder | **Launch Readiness** |
| `PlaceholderComingSoonIndicator` | `sections/placeholder/` | Placeholder | **Launch Readiness** |

---

## 4. Commercial Widgets

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `CommercialOverviewExecutiveKpis` | `commercial/` | Commercial page | **Reports** |
| `CommercialOverviewMetadataPanel` | `commercial/` | Commercial page | **Reports** |
| `CommercialOverviewPlanDistribution` | `commercial/` | Commercial page | **Reports** |
| `CommercialOverviewSubscriptionHealth` | `commercial/` | Commercial page | **Customer Success** |
| `CommercialOverviewNeedsAttention` | `commercial/` | Commercial page | **Customer Success** |
| `CommercialExportButtons` | `commercial/` | Commercial + Analytics | **Reports** |
| `CommercialStatusBadge` | `commercial/` | Overview + commercial | **Reports** |

---

## 5. Analytics Widgets (`StatisticsPanel` decomposed)

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| Platform overview KPI cards (5) | `StatisticsPanel` | Analytics | **Reports** |
| Subscription executive KPIs (4) | `StatisticsPanel` | Analytics | **Reports** |
| Subscription status count tiles (4) | `StatisticsPanel` | Analytics | **Reports** |
| User & restaurant growth chart | `StatisticsPanel` | Analytics | **Reports** |
| Owners-by-plan pie chart | `StatisticsPanel` | Analytics | **Reports** |
| Revenue-by-month chart (placeholder) | `StatisticsPanel` | Analytics | **Reports** |
| Renewal rate KPI (unavailable) | `StatisticsPanel` | Analytics | **Reports** |
| Subscriber overview table | `StatisticsPanel` | Analytics | **Reports** |
| Analytics export control | `StatisticsPanel` | Analytics | **Reports** |

---

## 6. KPI Primitives

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| Overview home KPI strip (5 cards) | `OverviewKpiSection` | Overview | **Reports** |
| `AdminStatCard` | `layout/` | Shared primitive | **Reports** |
| `AdminKPISection` (unused) | `layout/` | Orphan | **Reports** |

---

## 7. AccountsTab — Decomposed Controls

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| Owner directory + search | `AccountsTab` | Operations | **Customer Success** |
| Classification filter toolbar | `AccountsTab` | Operations | **Customer Success** |
| Restaurant count display (per row) | `AccountsTab` | Operations | **Customer Success** |
| Subscription status/plan columns | `AccountsTab` | Operations | **Customer Success** |
| Subscription create dialog | `AccountsTab` | Operations | **Customer Success** |
| Subscription edit dialog | `AccountsTab` | Operations | **Customer Success** |
| Subscription delete confirm | `AccountsTab` | Operations | **Customer Success** |
| Per-user notify action | `AccountsTab` | Operations | **Customer Success** |
| Invoice PDF action | `AccountsTab` | Operations | **Reports** |
| **Role edit control** | `AccountsTab` | Operations | **Security** |
| **Classification edit control** | `AccountsTab` | Operations | **Security** |
| **Create internal user dialog** | `AccountsTab` | Operations | **Security** |
| **Delete user dialog** | `AccountsTab` | Operations | **Security** |
| **Platform account mutation guards** | `AccountsTab` | Operations | **Security** |
| **Self-guard (no self-edit/delete)** | `AccountsTab` | Operations | **Security** |

---

## 8. TenantsTab — Decomposed Controls

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| Restaurant directory + search | `TenantsTab` | Operations | **Customer Success** |
| Subscription status filter | `TenantsTab` | Operations | **Customer Success** |
| Restaurant card list | `TenantsTab` | Operations | **Customer Success** |
| Owner commercial display on card | `TenantsTab` | Operations | **Customer Success** |
| Create restaurant dialog | `TenantsTab` | Operations | **Customer Success** |
| Delete restaurant confirm | `TenantsTab` | Operations | **Customer Success** |
| Edit → owner dashboard link | `TenantsTab` | Operations | **Customer Success** |
| Subscriber provisioning in create flow | `TenantsTab` | Operations | **Customer Success** |
| Country/currency selection | `TenantsTab` | Operations | **Customer Success** |

---

## 9. CommunicationsTab

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| Bulk notification dialog | `CommunicationsTab` | Operations | **Customer Success** |
| Per-user notification dialog | `CommunicationsTab` | Operations | **Customer Success** |
| User picker | `CommunicationsTab` | Operations | **Customer Success** |

---

## 10. Server APIs — Dashboard Read Router

| Procedure | Current location | Current owner | Future domain owner |
|-----------|------------------|---------------|---------------------|
| `admin.getOwnerOverview` | `adminDashboardRouter.ts` | Unwired | **Customer Success** |
| `admin.getOwnerOverviewList` | `adminDashboardRouter.ts` | Operations | **Customer Success** |
| `admin.getSubscriptionOverview` | `adminDashboardRouter.ts` | Unwired | **Customer Success** |
| `admin.getDashboardSummary` | `adminDashboardRouter.ts` | Overview | **Reports** |
| `admin.getCommercialOverview` | `adminDashboardRouter.ts` | Commercial | **Reports** |
| `admin.getCommercialAnalytics` | `adminDashboardRouter.ts` | Analytics | **Reports** |
| `admin.getCommercialExportPackage` | `adminDashboardRouter.ts` | Server-internal | **Reports** |
| `admin.exportCommercialReport` | `adminDashboardRouter.ts` | Commercial + Analytics | **Reports** |
| `admin.listRestaurants` | `adminDashboardRouter.ts` | Operations | **Customer Success** |

---

## 11. Server APIs — Core Admin Router

| Procedure | Current location | Current owner | Future domain owner |
|-----------|------------------|---------------|---------------------|
| `admin.createSubscriberAccount` | `routers.ts` | TenantsTab | **Customer Success** |
| `admin.resetSubscriberPassword` | `routers.ts` | Unwired | **Security** |
| `admin.createInternalUser` | `routers.ts` | AccountsTab | **Security** |
| `admin.updateAccountClassification` | `routers.ts` | AccountsTab | **Security** |
| `admin.updateUserRole` | `routers.ts` | AccountsTab | **Security** |
| `admin.deleteUser` | `routers.ts` | AccountsTab | **Security** |
| `admin.createUserSubscriptionByAdmin` | `routers.ts` | AccountsTab | **Customer Success** |
| `admin.updateUserSubscriptionByAdmin` | `routers.ts` | AccountsTab | **Customer Success** |
| `admin.deleteUserSubscriptionByAdmin` | `routers.ts` | AccountsTab | **Customer Success** |
| `admin.sendCustomNotification` | `routers.ts` | CommunicationsTab | **Customer Success** |
| `admin.sendBulkNotification` | `routers.ts` | CommunicationsTab | **Customer Success** |
| `admin.generateInvoicePDF` | `routers.ts` | AccountsTab | **Reports** |
| `admin.getUserInvoices` | `routers.ts` | Unwired | **Reports** |
| `admin.getExtendedStats` | `routers.ts` | Unwired (indirect) | **Reports** |
| `admin.listAllUsers` | `routers.ts` | Unwired | **Security** |
| `admin.getStatistics` | `routers.ts` | Deprecated | **Launch Readiness** |
| `admin.getRevenueByMonth` | `routers.ts` | Deprecated | **Launch Readiness** |
| `admin.createRestaurantSubscription` | `routers.ts` | Deprecated | **Launch Readiness** |
| `admin.updateRestaurantSubscription` | `routers.ts` | Deprecated | **Launch Readiness** |
| `admin.cancelRestaurantSubscription` | `routers.ts` | Deprecated | **Launch Readiness** |
| `admin.deleteRestaurantSubscription` | `routers.ts` | Deprecated | **Launch Readiness** |

---

## 12. Server Modules

| Module | Current location | Current owner | Future domain owner |
|--------|------------------|---------------|---------------------|
| `CommercialReadService` | `server/commercial/` | Shared data layer | **Customer Success** |
| `CanonicalMetricsService` | `server/commercial/metrics/` | Dashboard reads | **Reports** |
| `CommercialOverviewSnapshot` | `server/commercial/metrics/` | Commercial page | **Reports** |
| `CommercialReportService` | `server/commercial/reporting/` | Export pipeline | **Reports** |
| `analyticsProjection` | `server/commercial/reporting/` | Analytics page | **Reports** |
| `renderCommercialExport` | `server/commercial/reporting/` | Export pipeline | **Reports** |
| Export format adapters | `server/commercial/reporting/adapters/` | Export pipeline | **Reports** |
| `resolveOperationalCounts` | `server/commercial/reporting/` | Dashboard summary | **Reports** |
| `adminKpiCalculations` | `server/` | MRR math | **Reports** |
| `adminSubscriptionHelpers` | `server/` | Subscription logic | **Customer Success** |
| `platformAccount` (server) | `server/` | Protected user | **Security** |
| `accountClassificationAudit` | `server/` | Audit trail | **Security** |
| `cascadeAudit` | `server/db/` | Delete audit | **Security** |
| `cascadeDeletes` | `server/db/` | Protected guards | **Security** |
| `deploymentReadiness` | `server/_core/` | Env checks | **Launch Readiness** |
| `deploymentGuards` | `server/_core/` | CSRF guards | **Security** |
| `sessionRevocation` | `server/_core/` | Session boundary | **Security** |
| `authAudit` | `server/_core/` | Access logging | **Security** |
| `suspiciousActivity` | `server/_core/` | Threat signals | **Security** |
| `assertAdminAccess` | `server/_core/` | Admin gate | **Security** |
| `authOpsMetadata` / ops logging | `server/_core/` | Ops signals | **Health** |

---

## 13. Client Lib Helpers

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `dashboardSummaryKpis` | `lib/admin/` | Overview | **Reports** |
| `formatAdminCurrency` | `lib/admin/` | KPI display | **Reports** |
| `formatCommercialOverviewDisplay` | `lib/admin/` | Commercial | **Reports** |
| `commercialOverviewPlanDistribution` | `lib/admin/` | Commercial | **Reports** |
| `downloadReportFile` | `lib/admin/` | Export | **Reports** |
| `ownerCommercialDisplay` | `lib/admin/` | Operations display | **Customer Success** |
| `accountClassificationDisplay` | `lib/admin/` | Accounts display | **Security** |
| `isProtectedPlatformAccountUser` | `shared/` | Accounts guards | **Security** |
| `featureVisibility` | `lib/commercial/` | Diagnostics inventory | **Launch Readiness** |

---

## 14. Auth & Gate Infrastructure

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `useAuthGate` | `_core/hooks/` | All admin pages | **Security** |
| `AuthGate` (`AdminAccessDenied`, etc.) | `components/` | All admin pages | **Security** |
| `adminQueriesEnabled` | `lib/queryRuntime.ts` | All admin queries | **Security** |

---

## 15. Health Assets

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `CommercialEntitlementsDiagnostics` | `components/commercial/` | Diagnostics page | **Health** |
| `email-config.test.ts` patterns | `server/` | Test probe | **Health** |
| Ops signal aggregation | `authOpsMetadata` | Server | **Health** |

---

## 16. Navigation & Shell Infrastructure

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `ADMIN_ROUTE_DEFINITIONS` | `routes/adminRoutes.ts` | Route registry | **Launch Readiness** |
| `adminRouteRegistry` | `routes/` | Route registry | **Launch Readiness** |
| `adminNavigation` shim | `lib/admin/` | Compat | **Launch Readiness** |
| `ADMIN_LEGACY_ROUTES` | `routes/adminRoutes.ts` | Legacy metadata | **Launch Readiness** |
| `AdminDashboardSidebar` | `layout/` | Shell nav | **Launch Readiness** |
| `AdminOperationsShell` | `layout/` | Page shell | **Launch Readiness** |
| `AdminShellBreadcrumbs` | `layout/` | Breadcrumbs | **Launch Readiness** |
| `adminDashStyles` | `layout/` | Style tokens | **Launch Readiness** |
| `AdminSection` | `layout/` | Section container | **Reports** |
| `AdminPageSection` | `sections/` | Section container | **Launch Readiness** |
| `adminSectionContracts` | `sections/` | Section contracts | **Launch Readiness** |

---

## 17. Operations UI Primitives

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| `OperationsTabFrame` | `operations/` | Operations tabs | **Customer Success** |
| `AdminEmptyState` | `operations/` | Operations | **Customer Success** |
| `AdminLoadingState` | `operations/` | Operations | **Customer Success** |
| `AdminActionGroup` | `operations/` | Operations | **Customer Success** |
| `AdminIconButton` | `operations/` | Operations | **Customer Success** |
| `ResponsiveOperationsBar` | `operations/` | Operations | **Customer Success** |
| `SubscriptionAdminFormFields` | `subscription/` | Accounts dialog | **Customer Success** |
| `SubscriptionCycleSelector` | `subscription/` | Accounts dialog | **Customer Success** |
| `SubscriptionSummaryPreview` | `subscription/` | Accounts dialog | **Customer Success** |
| `SubscriptionPriceDisplay` | `subscription/` | Accounts dialog | **Customer Success** |

---

## 18. Documentation & Process Assets

| Asset | Current location | Current owner | Future domain owner |
|-------|------------------|---------------|---------------------|
| ASN-5A data readiness protocol | `docs/commercial-audit/` | Process doc | **Launch Readiness** |
| REBUILD program docs | `docs/commercial-audit/` | Architecture | **Launch Readiness** |

---

## 19. Domain Asset Totals

| Domain | Assigned assets |
|--------|-----------------|
| **Customer Success** | 52 |
| **Reports** | 48 |
| **Security** | 28 |
| **Health** | 6 |
| **Launch Readiness** | 24 |

**Total mapped:** 158 discrete assets — each with exactly one primary owner.

---

## 20. Coverage Attestation

| Criterion | Status |
|-----------|--------|
| Every inventoried asset (5AA) assigned | ✅ |
| No dual-primary ownership | ✅ |
| AccountsTab decomposed per Rule 2 | ✅ |
| Transitional surfaces assigned (not left unowned) | ✅ |
| Deprecated APIs assigned to retirement owner | ✅ |
| Cross-cutting infra assigned (auth → Security, shell → Launch Readiness) | ✅ |
