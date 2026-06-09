# ADMIN-DASHBOARD-REBUILD-2 — Route Architecture

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-2 — Operations Decomposition  
**Date:** 2026-06-09  
**Status:** Complete  

**Prerequisite:** [Domain Map](./ADMIN-DASHBOARD-REBUILD-2-DOMAIN-MAP.md)

---

## 1. Executive Summary

This document defines the **post-decomposition route tree** for MineuQR Admin. Routes are organized by operator workflow, not by the historical monolith layout. Commercial read surfaces (`/admin/commercial`, `/admin/analytics`) remain unchanged in REBUILD-2; new routes absorb operations CRUD.

---

## 2. Target Route Tree (2B)

```text
/admin
│
├── /admin                              Home (Executive)
│
├── Commercial (read + reports)
│   ├── /admin/commercial               Overview          [LIVE]
│   ├── /admin/analytics                Analytics         [LIVE]
│   ├── /admin/reports                  Reports           [PLACEHOLDER → REBUILD-4]
│   └── /admin/customer-success         Success queues    [PLACEHOLDER → REBUILD-5]
│
├── Accounts (mutations + directory)
│   ├── /admin/accounts                 Directory (default: Commercial tab)
│   ├── /admin/accounts/internal        Internal staff directory
│   ├── /admin/accounts/:ownerId        Account detail
│   └── /admin/accounts/protected       Platform account profile (read-only)
│
├── Tenants (restaurant / ownership)
│   ├── /admin/tenants                  Restaurant directory
│   ├── /admin/tenants/new              Create restaurant wizard
│   └── /admin/tenants/:restaurantId    Tenant detail (admin context)
│
├── Communications
│   ├── /admin/communications           Hub
│   ├── /admin/communications/notify    Per-user + bulk notifications
│   └── /admin/communications/campaigns Campaigns         [FUTURE]
│
├── Platform
│   ├── /admin/health                   Health Center       [PLACEHOLDER]
│   ├── /admin/security                 Security            [PLACEHOLDER]
│   └── /admin/launch-readiness         Launch Readiness    [PLACEHOLDER]
│
├── /admin/diagnostics                  CRS / gate diagnostics (relocated)
│
└── /admin/operations                   Coordination surface  [INTERIM → RETIRE]
```

### 2.1 Adjustment from REBUILD-1 target

| REBUILD-1 proposal | REBUILD-2 refinement | Rationale |
|--------------------|----------------------|-----------|
| `/admin/accounts/internal` as nested path | **Same** + query `?staff=marketing` | Marketing is staff category, not top-level route |
| `/admin/commercial/analytics` nested | **Keep** `/admin/analytics` peer | Already live; avoid breaking EXEC-7B routes |
| `/admin/operations` retired immediately | **Interim coordination** then redirect | Safer migration (see Extraction Plan) |
| `/admin/tenants/:ownerId` | **Split:** `/admin/tenants/:restaurantId` + `/admin/accounts/:ownerId` | Restaurant ≠ account; ownership linked |

---

## 3. Route Registry

### 3.1 Live today (unchanged in REBUILD-2 docs phase)

| Route | Component | Domain |
|-------|-----------|--------|
| `/admin` | `AdminDashboardHome` | Home |
| `/admin/commercial` | `AdminCommercialPage` | Commercial |
| `/admin/analytics` | `AdminAnalyticsPage` | Commercial |
| `/admin/operations` | `AdminManagement` | **Monolith (interim)** |
| `/admin/tenants` | Placeholder | Tenants |
| `/admin/customer-success` | Placeholder | Commercial |
| `/admin/health` | Placeholder | Platform |
| `/admin/security` | Placeholder | Platform |
| `/admin/reports` | Placeholder | Commercial |
| `/admin/launch-readiness` | Placeholder | Platform |

### 3.2 New routes (REBUILD-3 implementation target)

| Route | Component (proposed) | Extracted from | Priority |
|-------|---------------------|----------------|----------|
| `/admin/accounts` | `AdminAccountsPage` | `UsersSection` (directory) | P0 |
| `/admin/accounts/:ownerId` | `AdminAccountDetailPage` | New + `getOwnerOverview` | P0 |
| `/admin/accounts/internal` | `AdminInternalAccountsPage` or tab | Internal user dialog + INTERNAL filter | P1 |
| `/admin/tenants` | `AdminTenantsPage` | Restaurants section | P0 |
| `/admin/tenants/new` | `AdminTenantCreateWizard` | Create restaurant dialog | P1 |
| `/admin/tenants/:restaurantId` | `AdminTenantDetailPage` | Restaurant card + edit | P1 |
| `/admin/communications` | `AdminCommunicationsPage` | Notify dialogs | P1 |
| `/admin/diagnostics` | `CommercialDiagnostics` (moved) | `/commercial/diagnostics` | P2 |

### 3.3 Redirects (REBUILD-3)

| Legacy route | Redirect target | TTL |
|--------------|-----------------|-----|
| `/admin/operations` | `/admin/accounts` (interim) → coordination hub | 2 releases |
| `/users` | `/admin/accounts` | Immediate |
| `/super-admin` | `/admin` | Immediate |
| `/statistics` | `/admin/analytics` | Keep existing |
| `/commercial/diagnostics` | `/admin/diagnostics` | 1 release |

---

## 4. Navigation ↔ Route Alignment

### 4.1 Target sidebar groups (`adminNavigation.ts` — REBUILD-3)

```text
EXECUTIVE
  Overview                    /admin

COMMERCIAL
  Overview                    /admin/commercial
  Analytics                   /admin/analytics
  Customer Success            /admin/customer-success
  Reports                     /admin/reports

OPERATIONS
  Accounts                    /admin/accounts
  Tenants                     /admin/tenants
  Communications              /admin/communications

PLATFORM
  Health                      /admin/health
  Security                    /admin/security
  Launch Readiness            /admin/launch-readiness

[footer]
  Diagnostics                 /admin/diagnostics
```

**Remove:** `ADMIN_LEGACY_NAV` / “Legacy operations” group.

### 4.2 Breadcrumb conventions

| Route | Breadcrumb |
|-------|------------|
| `/admin/accounts` | Overview → Accounts |
| `/admin/accounts/:ownerId` | Overview → Accounts → [email] |
| `/admin/accounts/internal` | Overview → Accounts → Internal |
| `/admin/tenants` | Overview → Tenants |
| `/admin/tenants/:restaurantId` | Overview → Tenants → [nameAr] |
| `/admin/communications` | Overview → Communications |

---

## 5. Route Ownership Rules

| Rule | Enforcement |
|------|-------------|
| **Accounts routes own user mutations** | Role, classification, delete, internal create |
| **Tenants routes own restaurant mutations** | Create, delete, venue config |
| **Commercial routes own subscription mutations** | Sub CRUD moves to account detail Commercial panel or `/admin/customer-success` queues |
| **Communications routes own notify mutations** | No notify buttons on Accounts after migration |
| **Home owns executive KPIs** | No `getDashboardSummary` on Accounts/Tenants pages |
| **Platform routes are read-heavy** | No CRUD from operations monolith |

---

## 6. Interim vs Target State

### 6.1 REBUILD-3 interim (minimal breakage)

```text
/admin/operations  →  tabbed shell:
  [ Tenants | Accounts | Communications ]
```

Same component file split into three tab panels — routes unchanged, nav promoted.

### 6.2 REBUILD-3 target (route cutover)

```text
/admin/tenants      ← RestaurantsSection extracted
/admin/accounts     ← UsersSection extracted (minus notify → comms)
/admin/communications ← Notify dialogs extracted
/admin/operations   → redirect /admin/accounts
```

### 6.3 REBUILD-4+ (coordination hub optional)

```text
/admin/operations   → lightweight hub:
  Quick links + provisioning wizards only
  No embedded tables
```

Or **retire entirely** — home quick actions replace hub.

---

## 7. App.tsx Registration Plan (future)

```typescript
// REBUILD-3 additions (illustrative — not implemented in REBUILD-2)
<Route path="/admin/accounts/:ownerId" component={AdminAccountDetailPage} />
<Route path="/admin/accounts/internal" component={AdminAccountsPage} /> // tab mode
<Route path="/admin/accounts" component={AdminAccountsPage} />
<Route path="/admin/tenants/new" component={AdminTenantCreateWizard} />
<Route path="/admin/tenants/:restaurantId" component={AdminTenantDetailPage} />
<Route path="/admin/tenants" component={AdminTenantsPage} />
<Route path="/admin/communications" component={AdminCommunicationsPage} />
<Route path="/admin/diagnostics" component={CommercialDiagnostics} />
// /admin/operations → Redirect to /admin/accounts or OperationsHub
```

---

## 8. Success Criteria

| Question | Answer |
|----------|--------|
| **Route architecture after decomposition?** | Section 2 tree — Accounts, Tenants, Communications as operations triple; Commercial + Platform peers |
| **What remains temporarily?** | `/admin/operations` as tabbed interim or redirect shim |
| **What is unchanged?** | `/admin`, `/admin/commercial`, `/admin/analytics`, auth, CRS APIs |

**Companion:** [Operations Extraction Plan](./ADMIN-DASHBOARD-REBUILD-2-OPERATIONS-EXTRACTION.md)
