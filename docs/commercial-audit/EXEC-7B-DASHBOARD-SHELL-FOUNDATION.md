# EXEC-7B — Dashboard Shell Foundation

**Program:** Commercial Authority Program — Execution  
**Phase:** EXEC-7B — Admin dashboard shell foundation  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** Navigation architecture, route organization, shell layout, discoverability only. No commercial logic, authority, or analytics redesign.

**Prerequisites:** EXEC-7A architecture (`EXEC-7A-DASHBOARD-REBUILD-ARCHITECTURE.md`).

---

## 1. Executive Summary

EXEC-7B delivers the **unified Admin Operations Shell** — persistent sidebar navigation, canonical `/admin/*` routes, dashboard home landing page, analytics discoverability via `/admin/analytics`, and the **CommercialStatusBadge** presentation component.

| Deliverable | Status |
|-------------|--------|
| Navigation config (single source) | `client/src/lib/admin/adminNavigation.ts` |
| AdminOperationsShell | Sidebar + header + breadcrumbs + content + status region |
| Canonical routes | `/admin`, `/admin/commercial`, … `/admin/launch-readiness` |
| Dashboard home | `/admin` — welcome, KPI strip, shortcuts |
| Analytics discoverability | `/admin/analytics` (+ legacy `/statistics` preserved) |
| CommercialStatusBadge | Presentation-only; 6 states |
| Legacy routes | Documented; not removed |

---

## 2. Navigation Architecture

### 2.1 Single configuration source

All sidebar items are defined in `ADMIN_NAV_GROUPS` and `ADMIN_LEGACY_NAV`:

| ID | Path | Label key |
|----|------|-----------|
| `overview` | `/admin` | `admin.nav.overview` |
| `commercial` | `/admin/commercial` | `admin.nav.commercial` |
| `analytics` | `/admin/analytics` | `admin.nav.analytics` |
| `tenants` | `/admin/tenants` | `admin.nav.tenants` |
| `customer-success` | `/admin/customer-success` | `admin.nav.customerSuccess` |
| `health` | `/admin/health` | `admin.nav.health` |
| `security` | `/admin/security` | `admin.nav.security` |
| `reports` | `/admin/reports` | `admin.nav.reports` |
| `launch-readiness` | `/admin/launch-readiness` | `admin.nav.launchReadiness` |
| `operations` (legacy) | `/admin/operations` | `admin.nav.operations` |

Active state: `isAdminNavItemActive()` — exact match for `/admin` home.

### 2.2 Shell components

| Component | Role |
|-----------|------|
| `AdminOperationsShell` | Layout wrapper: `SidebarProvider`, inset, header, breadcrumbs, title, status strip, main |
| `AdminDashboardSidebar` | Config-driven nav menu |
| `AdminShellBreadcrumbs` | Breadcrumb trail |

---

## 3. Route Map

### 3.1 Canonical routes (EXEC-7B)

| Route | Page | Content |
|-------|------|---------|
| `/admin` | `AdminDashboardHome` | Executive home + shortcuts |
| `/admin/commercial` | Placeholder | EXEC-7C |
| `/admin/analytics` | `AdminAnalyticsPage` | Existing statistics panel in shell |
| `/admin/tenants` | Placeholder | EXEC-7D |
| `/admin/customer-success` | Placeholder | EXEC-7G |
| `/admin/health` | Placeholder | EXEC-7G |
| `/admin/security` | Placeholder | EXEC-7F |
| `/admin/reports` | Placeholder | EXEC-7E |
| `/admin/launch-readiness` | Placeholder | EXEC-7H |
| `/admin/operations` | `AdminManagement` | Legacy restaurant/user ops (interim) |

### 3.2 Legacy routes (retained)

| Route | Canonical target | Status |
|-------|------------------|--------|
| `/statistics` | `/admin/analytics` | Re-exports `AdminAnalyticsPage` |
| `/users` | `/admin/tenants` | Unchanged orphan |
| `/super-admin` | `/admin` | Unchanged orphan |

**Breaking change (documented):** `/admin` no longer renders `AdminManagement` directly. Operations moved to `/admin/operations`. `LandingNavbar` still links to `/admin` (new home).

---

## 4. CommercialStatusBadge

**Path:** `client/src/components/admin/commercial/CommercialStatusBadge.tsx`

Presentation-only. Parent passes `status` + `label`.

| State | Visual |
|-------|--------|
| `trial` | Blue |
| `active` | Green |
| `grace` | Amber |
| `suspended` | Orange |
| `expired` | Red |
| `inactive` | Outline |

No authority derivation. Shown on dashboard home as reference strip only until EXEC-7C+ migration.

---

## 5. Analytics Discoverability

**Before:** `text-xs` outline button in `AdminPageShell` nav.  
**After:** First-class sidebar item **Analytics** → `/admin/analytics`.

`StatisticsPanel` extracted from `Statistics.tsx` — same queries and charts, wrapped in `AdminOperationsShell`. Legacy `/statistics` route preserved.

---

## 6. Files Modified / Created

| File | Change |
|------|--------|
| `client/src/lib/admin/adminNavigation.ts` | **Created** — nav config |
| `client/src/components/admin/layout/AdminOperationsShell.tsx` | **Created** |
| `client/src/components/admin/layout/AdminDashboardSidebar.tsx` | **Created** |
| `client/src/components/admin/layout/AdminShellBreadcrumbs.tsx` | **Created** |
| `client/src/components/admin/commercial/CommercialStatusBadge.tsx` | **Created** |
| `client/src/pages/admin/AdminDashboardHome.tsx` | **Created** |
| `client/src/pages/admin/AdminAnalyticsPage.tsx` | **Created** |
| `client/src/pages/admin/StatisticsPanel.tsx` | **Created** — extracted panel |
| `client/src/pages/admin/AdminSectionPlaceholder.tsx` | **Created** |
| `client/src/pages/admin/placeholderPages.tsx` | **Created** |
| `client/src/pages/Statistics.tsx` | Re-export analytics page |
| `client/src/pages/AdminManagement.tsx` | `AdminOperationsShell`; route `/admin/operations` |
| `client/src/App.tsx` | Canonical routes |
| `client/src/locales/en.json`, `ar.json` | `admin.nav.*` keys |

---

## 7. Validation

```bash
pnpm exec vitest run client/src/components/admin/commercial/CommercialStatusBadge.test.tsx
pnpm exec vitest run client/src/lib/admin/dashboardSummaryKpis.test.ts
```

---

## 8. Next Phase

**EXEC-7C** — Commercial Overview + complete analytics dual-read retirement.  
Placeholder pages already wired in shell — no navigation rewrite required.

---

*Stop boundary: EXEC-7B complete.*
