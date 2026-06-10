# REBUILD-5BB — Boundary Resolution Report

**Program:** ADMIN-DASHBOARD-REBUILD-5B  
**Phase:** 5BB — Boundary Resolution Report  
**Mode:** Audit + Architecture Mapping

Resolves all overlaps identified in REBUILD-5AC with **final single-owner decisions**. Secondary relationships are documented as **dependencies** (5BC), not ownership.

---

## 1. Reports ↔ Analytics ↔ Commercial

### Conflict (5AC §2.4)

Three live routes (`/admin`, `/admin/commercial`, `/admin/analytics`) present overlapping executive KPIs, plan distribution, exports, and CRS-backed metrics.

### Final decisions

| Overlapping capability | Previous locations | **Final owner** | Rationale |
|------------------------|-------------------|-----------------|-----------|
| Executive KPI strip (home) | `OverviewKpiSection` | **Reports** | Aggregate platform metrics — reporting surface |
| Executive KPIs (MRR/ARR) | `CommercialOverviewExecutiveKpis` | **Reports** | Revenue reporting authority |
| Analytics subscription KPIs | `StatisticsPanel` | **Reports** | Analytics summary — same domain as commercial reporting |
| Plan distribution table | `CommercialOverviewPlanDistribution` | **Reports** | Executive reporting artifact |
| Plan distribution chart | `StatisticsPanel` pie chart | **Reports** | Duplicate widget — consolidate under Reports, not separate domain |
| Export buttons (×2) | Commercial header + Analytics | **Reports** | Single export workflow owner |
| Report metadata panel | `CommercialOverviewMetadataPanel` | **Reports** | Report provenance and authority metadata |
| `/admin/commercial` route | Live page | **Reports** | Becomes Reports executive sub-view |
| `/admin/analytics` route | Live page | **Reports** | Becomes Reports analytics sub-view |
| `/admin/reports` route | Placeholder | **Reports** | Canonical Reports hub target |
| `getDashboardSummary` | Overview | **Reports** | Dashboard aggregate API |
| `getCommercialOverview` | Commercial | **Reports** | Commercial snapshot API |
| `getCommercialAnalytics` | Analytics | **Reports** | Analytics projection API |
| `getExtendedStats` | Unwired | **Reports** | Growth series feeds analytics — not runtime health |
| Platform entity counts (menus, categories) | StatisticsPanel | **Reports** | Usage reporting |

### Route retirement plan (mapping only — not implemented)

```text
/admin/commercial  ──merge──►  /admin/reports (executive)
/admin/analytics   ──merge──►  /admin/reports (analytics)
/admin             ──retain──►  /admin (Launch Readiness entry shell; KPIs move to Reports)
```

### Unresolved in 5AC → resolved

| Asset | 5AC ambiguity | **Final owner** |
|-------|---------------|-----------------|
| `OverviewStatusIndicator` | Reports or retire | **Reports** — status legend for report/badge reference |
| `OverviewWelcomeSection` | Transitional | **Launch Readiness** — operator entry onboarding |
| `OverviewFeaturedShortcutsSection` | Transitional | **Launch Readiness** — console navigation hub |

---

## 2. Security ↔ Customer Success

### Conflict (5AC §2.2)

`AccountsTab` co-locates access governance (roles, classification, internal users, delete) with customer lifecycle (subscriptions, directory, notify).

### Final decisions — granular split

| Capability | Was grouped as | **Final owner** | Rationale |
|------------|----------------|-----------------|-----------|
| `AccountsTab` workspace shell | Operations monolith | **Customer Success** | Primary workspace for owner directory and lifecycle |
| Owner directory + search | AccountsTab | **Customer Success** | Customer account operations |
| Subscription CRUD (UI + API) | AccountsTab | **Customer Success** | Subscription lifecycle |
| Per-user notify from accounts row | AccountsTab | **Customer Success** | Support workflow |
| TenantsTab (entire) | Operations | **Customer Success** | Tenant directory and provisioning |
| CommunicationsTab (entire) | Operations | **Customer Success** | Communication workflows |
| `CommercialOverviewNeedsAttention` | Commercial page | **Customer Success** | Retention pipeline — not reporting |
| `CommercialOverviewSubscriptionHealth` | Commercial page | **Customer Success** | Lifecycle health counts — operational, not executive report |
| `getOwnerOverviewList` | Operations | **Customer Success** | Owner directory API |
| `getOwnerOverview` | Unwired | **Customer Success** | Owner detail API |
| `getSubscriptionOverview` | Unwired | **Customer Success** | Subscription-filtered directory |
| `listRestaurants` | Operations | **Customer Success** | Tenant directory API |
| `createSubscriberAccount` | TenantsTab | **Customer Success** | Customer provisioning (not staff) |
| `CommercialReadService` | Shared | **Customer Success** | Canonical per-owner commercial state |
| **Role edit control + API** | AccountsTab | **Security** | Access governance |
| **Classification edit + API** | AccountsTab | **Security** | Access governance |
| **Create internal user + API** | AccountsTab | **Security** | Staff provisioning |
| **Delete user + API** | AccountsTab | **Security** | Destructive access authority (not lifecycle workflow) |
| **Platform account guards** | AccountsTab | **Security** | Protected account policy |
| **Self-guard** | AccountsTab | **Security** | Access policy |
| `resetSubscriberPassword` | Unwired | **Security** | Credential governance |
| `listAllUsers` | Unwired | **Security** | Legacy directory — retire; Security owns deprecation |
| Auth gate infrastructure | All pages | **Security** | Authentication and authorization |

### Key boundary rule (final)

> **Customer Success** owns *who the customer is and what state they are in*.  
> **Security** owns *who may access the platform and how access is governed*.

`deleteUser` resolves to **Security** (not Customer Success) because it is a destructive access-revocation operation with cascade audit, protected-user guards, and security policy — even when triggered from a customer directory context.

### UI composition note (not ownership)

Customer Success workspace may **surface** Security-gated controls (role/classification) via embedded actions. Ownership remains Security; CS is the **host surface** only.

---

## 3. Health ↔ Launch Readiness

### Conflict (5AC §2.3)

Diagnostics, deployment checks, and schema versioning span runtime health and go-live certification.

### Final decisions

| Overlapping capability | Previous ambiguity | **Final owner** | Rationale |
|------------------------|-------------------|-----------------|-----------|
| `CommercialDiagnostics` page | Health or Launch | **Health** | Runtime CRS/entitlements diagnostic — operational signal |
| `CommercialEntitlementsDiagnostics` | Health or Launch | **Health** | Diagnostic panel component |
| Ops signal logging (`OPS_EVENT`) | Health or Security | **Health** | Operational reliability monitoring |
| Email config probe | Health or Launch | **Health** | Runtime email health check |
| `deploymentReadiness` | Health or Launch | **Launch Readiness** | Go-live env certification — not continuous monitoring |
| `featureVisibility` inventory | Health or Launch | **Launch Readiness** | Feature completion tracking for launch |
| Schema version in metadata panel | Reports or Launch | **Reports** (field) / **Launch Readiness** (consumer) | Reports owns metadata display; Launch Readiness **reads** schema version as certification input — dependency only |
| ASN-5A data readiness protocol | Process | **Launch Readiness** | Launch gate process |
| `/admin/health` route | Placeholder | **Health** | Health center |
| `/admin/launch-readiness` route | Placeholder | **Launch Readiness** | Readiness scorecard |

### Key boundary rule (final)

> **Health** owns *is the system running correctly right now*.  
> **Launch Readiness** owns *are we certified to go live*.

Launch Readiness **consumes** Health probe results and Reports schema metadata as **inputs** — it does not own those assets.

---

## 4. Reports ↔ Customer Success (subscription health)

### Conflict (5AC §2.1)

Subscription health counts appear on Commercial page and Analytics page.

### Final decisions

| Widget | Location | **Final owner** | Rationale |
|--------|----------|-----------------|-----------|
| `CommercialOverviewSubscriptionHealth` | Commercial page | **Customer Success** | Operational lifecycle view — moves to CS domain |
| `CommercialOverviewNeedsAttention` | Commercial page | **Customer Success** | Retention queue — moves to CS domain |
| StatisticsPanel subscription status tiles | Analytics page | **Reports** | Aggregate reporting snapshot — stays in Reports |
| StatisticsPanel subscriber table | Analytics page | **Reports** | Executive/analytics reporting |

Same CRS data source (`CommercialReadService` / analytics projection) is a **shared dependency** (5BC). Ownership is determined by **presentation purpose**: operational lifecycle → CS; aggregate reporting → Reports.

---

## 5. Operations ↔ Platform Domains

### Conflict (5AC §2.5)

`/admin/operations` hosts Customer Success and Security controls; `/admin/tenants` nav points to operations tab.

### Final decisions

| Asset | **Final owner** | Rationale |
|-------|-----------------|-----------|
| `/admin/operations` route | **Customer Success** | Primary workspace route |
| `AdminManagement` tab shell | **Customer Success** | Workspace host |
| `/admin/tenants` nav + redirect | **Customer Success** | Tenant directory entry |
| Security controls within AccountsTab | **Security** | Decomposed — not Operations |
| `/admin/operations` Security mutations | **Security** | Controls relocate to Security domain UI; may remain callable from CS surface |

Operations as a **named domain** is retired. The route becomes Customer Success workspace.

---

## 6. Orphan & Deprecated Resolution

| Orphan (5AC §5) | **Final owner** | Action |
|-----------------|-----------------|--------|
| `AdminKPISection` (unused) | **Reports** | Consolidate into Reports KPI components on extraction |
| `getUserInvoices` (unwired) | **Reports** | Wire to Reports billing section |
| `getCommercialExportPackage` (unwired) | **Reports** | Internal to export pipeline |
| `resetSubscriberPassword` (unwired) | **Security** | Wire to Security credential management |
| `listAllUsers` (unwired) | **Security** | Retire — superseded by `getOwnerOverviewList` (CS) |
| Deprecated restaurant subscription APIs (4) | **Launch Readiness** | Retirement queue — migration cleanup |
| `getStatistics` / `getRevenueByMonth` | **Launch Readiness** | Retirement queue |
| Revenue-by-month chart placeholder | **Reports** | Reports owns widget; blocked on canonical data source |
| Renewal rate placeholder | **Reports** | Reports owns widget; blocked on data |

---

## 7. Overlap Resolution Summary

| Overlap pair (5AC) | Resolution | Status |
|--------------------|------------|--------|
| Reports ↔ Analytics ↔ Commercial | Merge under **Reports**; CS widgets extracted | ✅ Resolved |
| Security ↔ Customer Success | Granular split; AccountsTab decomposed | ✅ Resolved |
| Health ↔ Launch Readiness | Health = runtime; Launch = certification | ✅ Resolved |
| Reports ↔ Customer Success (health widgets) | CS = operational; Reports = aggregate | ✅ Resolved |
| Operations ↔ Platform domains | Operations retired; route → **Customer Success** | ✅ Resolved |

**No unresolved overlaps remain.** Domain extraction may proceed without architectural debate on ownership.
