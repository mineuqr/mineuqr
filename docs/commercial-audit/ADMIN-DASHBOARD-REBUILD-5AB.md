# REBUILD-5AB — Domain Ownership Matrix

**Program:** ADMIN-DASHBOARD-REBUILD-5A  
**Phase:** 5AB — Domain Ownership Matrix  
**Mode:** Audit (inventory only)

**Legend**

- **Current owner:** Where the asset lives and is rendered today
- **Future domain owner:** Approved REBUILD-5 platform domain assignment
- **Transitional:** Live surface not yet decomposed into platform domains

---

## Matrix — Routes & Pages

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| `/admin/security` route | Placeholder shell | **Security** |
| `/admin/health` route | Placeholder shell | **Health** |
| `/admin/customer-success` route | Placeholder shell | **Customer Success** |
| `/admin/reports` route | Placeholder shell | **Reports** |
| `/admin/launch-readiness` route | Placeholder shell | **Launch Readiness** |
| `/admin` (Overview) | `AdminDashboardHome` | **Transitional** → splits to **Reports** (KPIs) + nav hub |
| `/admin/commercial` | `AdminCommercialPage` | **Transitional** → splits to **Reports** + **Customer Success** |
| `/admin/analytics` | `AdminAnalyticsPage` | **Transitional** → **Reports** |
| `/admin/operations` | `AdminManagement` | **Transitional** → **Customer Success** + **Security** |
| `/commercial/diagnostics` | `CommercialDiagnostics` | **Health** (relocate to `/admin/health` or sub-route) |

---

## Matrix — Sections & Widgets

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| `OverviewWelcomeSection` | Overview page | **Transitional** (retire or move to Launch Readiness intro) |
| `OverviewKpiSection` | Overview page | **Reports** (executive KPI strip) |
| `OverviewFeaturedShortcutsSection` | Overview page | **Transitional** (shell nav — no domain) |
| `OverviewAllSectionsSection` | Overview page | **Transitional** (shell nav — no domain) |
| `OverviewStatusIndicator` | Overview page | **Reports** (status legend) or retire |
| `CommercialOverviewExecutiveKpis` | Commercial page | **Reports** |
| `CommercialOverviewMetadataPanel` | Commercial page | **Reports** (report authority metadata) |
| `CommercialOverviewSubscriptionHealth` | Commercial page | **Customer Success** (lifecycle health) |
| `CommercialOverviewNeedsAttention` | Commercial page | **Customer Success** (retention pipeline) |
| `CommercialOverviewPlanDistribution` | Commercial page | **Reports** |
| `CommercialOverviewExportActions` | Commercial page | **Reports** |
| `StatisticsPanel` (full) | Analytics page | **Reports** |
| `AdminRoutePlaceholderSection` | Placeholder pages | **Transitional** (remove when domains ship) |
| `PlaceholderComingSoonIndicator` | Placeholder pages | **Transitional** |

---

## Matrix — Operational Workspaces

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| Accounts directory | Operations → AccountsTab | **Customer Success** (account ops) + **Security** (roles/classification) |
| Role edit (`updateUserRole`) | AccountsTab | **Security** |
| Classification edit | AccountsTab | **Security** |
| Create internal user | AccountsTab | **Security** |
| Delete user | AccountsTab | **Security** + **Customer Success** (account lifecycle) |
| Platform account protection UI | AccountsTab | **Security** |
| Subscription CRUD dialogs | AccountsTab | **Customer Success** |
| Invoice PDF generation | AccountsTab | **Reports** (billing artifact) |
| Tenants directory | Operations → TenantsTab | **Customer Success** |
| Restaurant create/delete | TenantsTab | **Customer Success** |
| Subscriber provisioning in create flow | TenantsTab | **Customer Success** + **Security** (account creation) |
| Communications bulk notify | CommunicationsTab | **Customer Success** |
| Communications per-user notify | CommunicationsTab | **Customer Success** |

---

## Matrix — Security Assets

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| `useAuthGate` / `AdminAccessDenied` | All admin pages | **Security** (gate infrastructure — shared) |
| `assertAdminAccess` | All admin procedures | **Security** (gate infrastructure — shared) |
| `authAudit` logging | Server | **Security** |
| `suspiciousActivity` tracking | Server | **Security** |
| `accountClassificationAudit` | Server | **Security** |
| `cascadeAudit` on deletes | Server | **Security** |
| Protected platform account guards | Server + AccountsTab | **Security** |
| `sessionRevocation` | Server | **Security** |
| `deploymentGuards` (CSRF) | Server | **Security** |
| Self-guard (no self-delete/role edit) | AccountsTab | **Security** |
| **Security viewer / audit UI** | **Does not exist** | **Security** (future) |

---

## Matrix — Health & Observability Assets

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| `/admin/health` placeholder | Placeholder shell | **Health** |
| `getExtendedStats` API | Server (unwired) | **Health** + **Reports** (growth series) |
| `CommercialDiagnostics` page | `/commercial/diagnostics` | **Health** |
| `CommercialEntitlementsDiagnostics` | Commercial components | **Health** |
| Ops signal logging | Server | **Health** |
| `deploymentReadiness` checks | Server tests/runtime | **Launch Readiness** + **Health** |
| Email config verification | Server tests | **Health** |
| Subscription health widget | Commercial page | **Customer Success** (not platform health) |

---

## Matrix — Reports & Analytics Assets

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| `getDashboardSummary` | OverviewKpiSection | **Reports** |
| `getCommercialOverview` | Commercial sections | **Reports** |
| `getCommercialAnalytics` | StatisticsPanel | **Reports** |
| `exportCommercialReport` | Export buttons | **Reports** |
| `CommercialReportService` | Server | **Reports** |
| `analyticsProjection` | Server | **Reports** |
| `getCommercialExportPackage` | Server (unwired) | **Reports** |
| `getSubscriptionOverview` | Server (unwired) | **Reports** + **Customer Success** |
| `getUserInvoices` | Server (unwired) | **Reports** |
| `generateInvoicePDF` | AccountsTab | **Reports** |
| Revenue-by-month chart placeholder | StatisticsPanel | **Reports** (blocked on canonical trend) |
| Renewal rate placeholder | StatisticsPanel | **Reports** (blocked on data) |

---

## Matrix — Customer Success Assets

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| `/admin/customer-success` placeholder | Placeholder shell | **Customer Success** |
| Owner directory (`getOwnerOverviewList`) | AccountsTab | **Customer Success** |
| Tenant directory (`listRestaurants`) | TenantsTab | **Customer Success** |
| Needs-attention queue | Commercial page | **Customer Success** |
| Subscription lifecycle mutations | AccountsTab | **Customer Success** |
| Trial status display | AccountsTab, tenant cards | **Customer Success** |
| Notification workflows | CommunicationsTab | **Customer Success** |
| `getOwnerOverview` (single owner) | Server (unwired) | **Customer Success** |
| `createSubscriberAccount` | TenantsTab | **Customer Success** |
| `resetSubscriberPassword` | Server (unwired) | **Customer Success** + **Security** |

---

## Matrix — Launch Readiness Assets

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| `/admin/launch-readiness` placeholder | Placeholder shell | **Launch Readiness** |
| `PlaceholderComingSoonIndicator` | Placeholder pages | **Transitional** |
| `deploymentReadiness` module | Server | **Launch Readiness** |
| ASN-5A data readiness docs | `docs/commercial-audit/` | **Launch Readiness** (process) |
| Commercial snapshot schema version | Metadata panel | **Launch Readiness** + **Reports** |
| Feature visibility diagnostics | `featureVisibility.ts` | **Launch Readiness** |
| Go-live checklist UI | **Does not exist** | **Launch Readiness** (future) |

---

## Matrix — Orphan & Unwired Assets

| Asset | Current owner | Future domain owner |
|-------|---------------|---------------------|
| `AdminKPISection` | layout (unused) | **Reports** (consolidate with OverviewKpiSection) |
| `listAllUsers` | Server (unwired) | **Security** or retire (superseded) |
| `getStatistics` / `getRevenueByMonth` | Server (deprecated) | **Retire** |
| Restaurant-scoped subscription mutations | Server (deprecated) | **Retire** |
| `getCommercialExportPackage` | Server (unwired) | **Reports** (wire to export hub) |

---

## Domain Load Summary (future state)

| Domain | Asset count (assigned) | Implementation today |
|--------|------------------------|----------------------|
| **Security** | 14 assets + future viewer | Embedded in gates/ops — no domain UI |
| **Health** | 7 assets | 1 non-admin diagnostics page only |
| **Customer Success** | 16 assets | Operations monolith + commercial attention widget |
| **Reports** | 18 assets | Commercial + analytics pages (split ownership) |
| **Launch Readiness** | 5 assets | Placeholder route + server checks only |
