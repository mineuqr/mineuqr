# REBUILD-5AC — Domain Boundary Report

**Program:** ADMIN-DASHBOARD-REBUILD-5A  
**Phase:** 5AC — Domain Boundary Report  
**Mode:** Audit (inventory only)

---

## 1. Executive Summary

All five approved platform domains have **registered routes and navigation** but **zero dedicated domain implementations**. Live functionality is concentrated in four transitional surfaces (Overview, Commercial, Analytics, Operations) that partially overlap the future platform domains.

**Primary risks before REBUILD-5 implementation:**

1. **Customer Success ↔ Security** — account operations mix lifecycle and access governance in one tab
2. **Reports ↔ Commercial ↔ Analytics** — three routes serve overlapping executive/reporting content
3. **Health ↔ Launch Readiness** — diagnostics and readiness checks exist outside admin shell
4. **12 unwired server APIs** — built for future domains but no UI consumer

---

## 2. Overlaps

### 2.1 Reports ↔ Customer Success

| Overlap | Locations | Conflict |
|---------|-----------|----------|
| Subscription health counts | `CommercialOverviewSubscriptionHealth` (Commercial) + StatisticsPanel status tiles (Analytics) | Same CRS data, two presentations |
| Needs-attention queue | `CommercialOverviewNeedsAttention` (Commercial) | Belongs to Customer Success pipeline but lives on Reports-oriented commercial page |
| `getSubscriptionOverview` API | Server only | Designed for subscription directory — overlaps `getOwnerOverviewList` + commercial snapshot |
| MRR / ARR KPIs | Overview home, Commercial executive, Analytics subscriptions | Three KPI strips from overlapping metric sources |

**Resolution direction:** Commercial page becomes Reports executive hub; attention/health queues migrate to Customer Success.

---

### 2.2 Security ↔ Customer Success

| Overlap | Locations | Conflict |
|---------|-----------|----------|
| Accounts tab | `AdminManagement` AccountsTab | Role/classification edits (Security) beside subscription CRUD (Customer Success) |
| `createInternalUser` | AccountsTab | Staff provisioning is Security; surfaced in customer account directory |
| `createSubscriberAccount` | TenantsTab | Account creation in tenant provisioning flow |
| `deleteUser` | AccountsTab | Access revocation (Security) + customer offboarding (Customer Success) |
| Platform account row | AccountsTab | Security policy enforced inline, not in Security domain |

**Resolution direction:** Split Accounts tab into Security (access governance) and Customer Success (lifecycle) workspaces, or sub-tabs within Customer Success with Security-gated mutations.

---

### 2.3 Health ↔ Launch Readiness

| Overlap | Locations | Conflict |
|---------|-----------|----------|
| `CommercialDiagnostics` | `/commercial/diagnostics` | Entitlements verification — Health diagnostic or Launch Readiness gate? |
| `deploymentReadiness` | Server module | Runtime health vs go-live checklist |
| Schema version in metadata panel | Commercial page | Report metadata (Reports) vs readiness certification (Launch Readiness) |
| `featureVisibility` inventory | `lib/commercial/` | Launch feature tracking vs runtime health |

**Resolution direction:** Health owns runtime/diagnostic signals; Launch Readiness owns checklist/scoring/certification using Health feeds.

---

### 2.4 Reports ↔ Analytics (transitional routes)

| Overlap | Locations | Conflict |
|---------|-----------|----------|
| `/admin/commercial` vs `/admin/analytics` | Two live routes | Both consume CRS canonical authority; analytics projects from export package |
| Export buttons | Both pages | Duplicate export entry points |
| Plan distribution | Commercial table + Analytics pie chart | Same data, different widgets |
| Platform entity counts | Overview KPIs + StatisticsPanel platform cards | `getDashboardSummary` vs `getCommercialAnalytics.platform` |

**Resolution direction:** Merge under Reports domain with sub-views (Executive, Analytics, Exports); retire duplicate route after migration.

---

### 2.5 Operations ↔ Platform Domains

| Overlap | Locations | Conflict |
|---------|-----------|----------|
| `/admin/operations` | Tabbed monolith | Hosts Customer Success (accounts, tenants, comms) + Security mutations |
| `/admin/tenants` nav item | Points to operations tab | Tenants nav domain vs operations workspace |
| Communications | Operations tab | Customer Success domain, not separate route |

**Resolution direction:** Decompose operations into Customer Success primary workspace; Security mutations relocate to Security domain.

---

## 3. Duplicated Ownership

| Capability | Duplicate locations | Canonical future owner |
|------------|---------------------|------------------------|
| Executive KPI strip | OverviewKpiSection, CommercialOverviewExecutiveKpis, StatisticsPanel subscription KPIs | **Reports** (single executive dashboard) |
| Export workflow | Commercial header, Analytics header | **Reports** (single export hub) |
| Owner directory query | `getOwnerOverviewList` (Accounts, Communications), `listAllUsers` (unwired) | **Customer Success** (`getOwnerOverviewList`; retire `listAllUsers`) |
| Subscription health display | Commercial widget, Analytics tiles | **Customer Success** (operational) + **Reports** (aggregate) |
| KPI section component | `OverviewKpiSection` (live), `AdminKPISection` (unused) | **Reports** (consolidate to one) |
| Diagnostics surface | `/commercial/diagnostics`, planned `/admin/diagnostics` | **Health** (single admin route) |
| Placeholder pattern | 5 identical placeholder pages | **Transitional** — replace per domain |

---

## 4. Unclear Ownership

| Asset | Why unclear | Recommended assignment |
|-------|-------------|------------------------|
| `OverviewWelcomeSection` | Onboarding copy — not mapped to any platform domain | Retire or assign to **Launch Readiness** (operator onboarding) |
| `OverviewFeaturedShortcutsSection` | Pure navigation — no domain data | Keep in **Transitional** overview hub |
| `OverviewStatusIndicator` | Static badge legend — presentation reference | **Reports** (legend) or retire |
| `generateInvoicePDF` | Billing artifact vs customer operation | **Reports** (document generation) |
| `getExtendedStats` | Growth series — analytics or health? | **Reports** (analytics feed) + **Health** (if used for monitoring) |
| `CommercialOverviewMetadataPanel` | Report provenance vs launch certification | **Reports** primary; **Launch Readiness** consumes schema version |
| `resetSubscriberPassword` | Security action on customer account | **Security** (credential) + **Customer Success** (support workflow UI) |
| `/admin` overview route | Executive home vs domain hub | **Transitional** shell until domains ship |

---

## 5. Orphan Functionality

### 5.1 Unwired server APIs (no client consumer)

| API | Likely intended domain | Notes |
|-----|------------------------|-------|
| `getOwnerOverview` | Customer Success | Single-owner detail view |
| `getSubscriptionOverview` | Customer Success / Reports | Status/plan filtered directory |
| `getUserInvoices` | Reports | Invoice history per user |
| `resetSubscriberPassword` | Security / Customer Success | Support password reset |
| `listAllUsers` | Security | Superseded by `getOwnerOverviewList` |
| `getCommercialExportPackage` | Reports | Server-only; export uses `exportCommercialReport` |
| `getExtendedStats` | Health / Reports | User growth — consumed indirectly via analytics |
| `getStatistics` | — | DEPRECATED |
| `getRevenueByMonth` | — | DEPRECATED |
| Restaurant-scoped subscription mutations (4) | — | DEPRECATED |

### 5.2 Unwired UI components

| Component | Location | Notes |
|-----------|----------|-------|
| `AdminKPISection` | `layout/AdminKPISection.tsx` | Superseded by `OverviewKpiSection`; different icon defaults |
| `/admin/reports` | Placeholder | Export exists elsewhere — reports hub never built |
| Revenue-by-month chart | StatisticsPanel | Placeholder — no canonical data source |
| Renewal rate KPI | StatisticsPanel | Hardcoded unavailable |

### 5.3 Orphan routes (outside admin shell)

| Route | Notes |
|-------|-------|
| `/commercial/diagnostics` | Not in admin nav; not assigned to Health domain yet |
| `/statistics`, `/users`, `/super-admin` | Legacy redirects — working, no orphan behavior |

---

## 6. Domain Readiness Assessment

| Domain | Route | Nav | APIs | UI widgets | Readiness |
|--------|-------|-----|------|------------|-----------|
| **Security** | ✅ placeholder | ✅ | ✅ (embedded) | ❌ no viewer | **Low** — backend only |
| **Health** | ✅ placeholder | ✅ | ⚠️ partial | ⚠️ non-admin diagnostics | **Low** |
| **Customer Success** | ✅ placeholder | ✅ | ✅ (in operations) | ✅ (operations tabs + attention widget) | **Medium** — needs decomposition |
| **Reports** | ✅ placeholder | ✅ | ✅ | ✅ (commercial + analytics) | **Medium** — needs consolidation |
| **Launch Readiness** | ✅ placeholder | ✅ | ⚠️ partial | ❌ no checklist | **Low** |

---

## 7. Boundary Rules (recommended for REBUILD-5 implementation)

1. **Security** owns *who can do what* — roles, classifications, protected accounts, audit visibility, session integrity
2. **Health** owns *is the platform running correctly* — runtime signals, diagnostics, email/queue/DB probes
3. **Customer Success** owns *who are our customers and how are they doing* — accounts, tenants, lifecycle, communications
4. **Reports** owns *what do the numbers say* — KPIs, analytics, exports, executive summaries
5. **Launch Readiness** owns *are we ready to ship* — checklists, certifications, blockers, go-live governance

**Cross-domain reads are allowed; cross-domain writes should route through the owning domain's workspace.**

---

## 8. Out of Scope Confirmation

This audit performed **no** code movement, route changes, UI changes, permission changes, or navigation changes. Inventory and ownership assignment only.
