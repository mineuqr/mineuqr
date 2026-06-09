# HOTFIX-UI-2 — Commercial Route & Layout Audit

**Program:** Admin Dashboard Stabilization  
**Date:** 2026-06-07  
**Status:** Complete  
**Scope:** Route ownership, shell ownership, navigation consistency, layout duplication — **no commercial logic changes**

**Prerequisite programs (complete):** COMM-AUDIT-1A, AR-UX-7, AUTHORITY-CLEANUP-1

---

## 1. Executive Summary

The EXEC-7B admin shell migration is **structurally sound**. All `/admin/*` routes use a **single** `AdminOperationsShell` with **one** sidebar and **one** breadcrumb chain per page. The previously reported duplicate-sidebar symptom is **resolved** (root cause was pre-EXEC-7B dual layouts).

Remaining gaps are **route-family fragmentation**, not layout duplication:

| Issue | Severity | Status after HOTFIX-UI-2E |
|-------|----------|---------------------------|
| Duplicate sidebar on one route | High (historical) | **Resolved** — no nested shells |
| `/statistics` alias URL vs canonical | Medium | **Fixed** — redirect to `/admin/analytics` |
| `/users`, `/super-admin` standalone chrome | Medium | **Documented** — legacy orphans, no redirect (functionality not yet in canonical destinations) |
| `ADMIN_LEGACY_ROUTES` config unused | Low | **Documented** — metadata only |
| `AdminPageShell` dead code | Low | **Documented** — unused export |

---

## 2. HOTFIX-UI-2A — Route Inventory

Router source: `client/src/App.tsx` (wouter `Switch`). Specific `/admin/*` paths are registered **before** `/admin`.

| Route | Component | File | Classification | Canonical destination | Notes |
|-------|-----------|------|----------------|----------------------|-------|
| `/admin` | `AdminDashboardHome` | `pages/admin/AdminDashboardHome.tsx` | **Canonical** | `/admin` | Executive overview; EXEC-7B home |
| `/admin/commercial` | `AdminCommercialPage` | `pages/admin/AdminCommercialPage.tsx` | **Canonical** | `/admin/commercial` | Commercial Overview (EXEC-7C) |
| `/admin/analytics` | `AdminAnalyticsPage` | `pages/admin/AdminAnalyticsPage.tsx` | **Canonical** | `/admin/analytics` | Analytics suite; wraps `StatisticsPanel` |
| `/admin/operations` | `AdminManagement` | `pages/AdminManagement.tsx` | **Canonical** (interim) | `/admin/operations` | Live ops surface; sidebar “legacy” group until EXEC-7D |
| `/admin/tenants` | `AdminTenantsPage` | `pages/admin/placeholderPages.tsx` | **Canonical** (placeholder) | `/admin/tenants` | Coming soon — no user directory yet |
| `/admin/customer-success` | `AdminCustomerSuccessPage` | placeholder | **Canonical** (placeholder) | `/admin/customer-success` | — |
| `/admin/health` | `AdminHealthPage` | placeholder | **Canonical** (placeholder) | `/admin/health` | — |
| `/admin/security` | `AdminSecurityPage` | placeholder | **Canonical** (placeholder) | `/admin/security` | — |
| `/admin/reports` | `AdminReportsPage` | placeholder | **Canonical** (placeholder) | `/admin/reports` | — |
| `/admin/launch-readiness` | `AdminLaunchReadinessPage` | placeholder | **Canonical** (placeholder) | `/admin/launch-readiness` | — |
| `/statistics` | `Statistics` | `pages/Statistics.tsx` | **Alias** | `/admin/analytics` | **Redirect** (HOTFIX-UI-2E) |
| `/users` | `Users` | `pages/Users.tsx` | **Legacy** | `/admin/tenants` (future) | Standalone page; role governance; not linked from shell |
| `/super-admin` | `SuperAdminDashboard` | `pages/SuperAdminDashboard.tsx` | **Legacy** | `/admin` (partial) | Standalone page; Arabic hardcoded nav; not linked from shell |

**Non-admin routes (out of scope but noted):** `/commercial/diagnostics` — commercial diagnostics, not admin shell.

### Classification legend

| Class | Meaning |
|-------|---------|
| **Canonical** | Intended long-term URL under `/admin/*` hierarchy |
| **Alias** | Old URL preserved; forwards to canonical |
| **Legacy** | Standalone pre-EXEC-7B page; retained until EXEC-7D parity |
| **Orphan** | Legacy route with no in-app navigation links |

---

## 3. HOTFIX-UI-2B — Shell Ownership Matrix

| Component | Shell owner? | Renders sidebar? | Renders breadcrumbs? | Renders page header? | Used by |
|-----------|--------------|------------------|----------------------|----------------------|---------|
| `AdminOperationsShell` | **Yes** (sole shell) | Via `AdminDashboardSidebar` | Via `AdminShellBreadcrumbs` | `title` + `subtitle` props | All `/admin/*` pages |
| `AdminDashboardSidebar` | No | **Yes** (once per shell) | No | No | Only inside `AdminOperationsShell` |
| `AdminShellBreadcrumbs` | No | No | **Yes** | No | Only inside `AdminOperationsShell` header |
| `AdminPageShell` | **Unused** | Had top nav (pre-7B) | No | Yes | **No imports** — dead code |
| `Users` | No | No (standalone `cinematic-bg`) | No | Inline `<h1>` | `/users` only |
| `SuperAdminDashboard` | No | No (custom sticky `<nav>`) | No | Inline nav title | `/super-admin` only |
| `StatisticsPanel` | No | No | No | No | Child of `AdminAnalyticsPage` only |

### Per-page shell audit

| Page | `AdminOperationsShell` count | Nesting violation? | Breadcrumb pattern |
|------|------------------------------|--------------------|--------------------|
| `AdminDashboardHome` | 1 | No | `[Overview]` |
| `AdminCommercialPage` | 1 | No | `[Overview → Commercial]` |
| `AdminAnalyticsPage` | 1 | No | `[Overview → Analytics]` |
| `AdminManagement` | 1 | No | `[Overview → Operations]` |
| `AdminSectionPlaceholder` | 1 | No | `[Overview → Section]` |
| `Statistics` (post-fix) | 0 | No | Redirect only |
| `Users` | 0 | No | None |
| `SuperAdminDashboard` | 0 | No | None |

**`AdminManagement` note:** Wraps shell in `TooltipProvider` — not a second layout layer.

---

## 4. HOTFIX-UI-2C — Navigation Audit

Source: `client/src/lib/admin/adminNavigation.ts`  
Consumer: `AdminDashboardSidebar` + `AdminDashboardHome` shortcuts

### Primary sidebar (`ADMIN_NAV_GROUPS`)

```
/admin                          [overview]     exact match
/admin/commercial               [commercial]
/admin/analytics                [analytics]
/admin/tenants                  [tenants]
/admin/customer-success         [customer-success]
/admin/health                   [health]
/admin/security                 [security]
/admin/reports                  [reports]
/admin/launch-readiness         [launch-readiness]
```

### Legacy sidebar group (`ADMIN_LEGACY_NAV`)

```
/admin/operations               [operations]   ← live ops UI (interim label)
```

### Documented legacy routes (`ADMIN_LEGACY_ROUTES`) — metadata only

| Path | Documented canonical | In sidebar? | In-app links? | Enforced redirect? |
|------|---------------------|-------------|---------------|-------------------|
| `/statistics` | `/admin/analytics` | No | None (pre-7B button removed) | **Yes** (HOTFIX-UI-2E) |
| `/users` | `/admin/tenants` | No | None | No — tenants is placeholder |
| `/super-admin` | `/admin` | No | None | No — partial feature overlap only |

### Navigation verification

| Check | Result |
|-------|--------|
| Every sidebar entry resolves to a route | **Pass** — all 10 items + operations have `App.tsx` routes |
| Dead links in sidebar | **None** |
| Duplicate destinations in sidebar | **None** — each path unique |
| Hidden legacy entries in sidebar | **None** — operations is visible under “legacy” group |
| `findAdminNavItemByPath` coverage | Covers `ADMIN_NAV_ITEMS` + `ADMIN_LEGACY_NAV` only (not `/statistics`) |

### Home page shortcuts (`AdminDashboardHome`)

Hardcoded cards: analytics, operations, commercial.  
Grid: all `ADMIN_NAV_ITEMS` except overview.  
Legacy card: `ADMIN_LEGACY_NAV` (operations only).

**Gap:** `/users` and `/super-admin` are not linked from any canonical admin surface (intentional orphan status).

---

## 5. HOTFIX-UI-2D — Layout Defect Verification

### Symptom 1 — Duplicated sidebar rendering

| Field | Finding |
|-------|---------|
| **Historical root cause** | Pre-EXEC-7B: `Statistics.tsx` was a standalone full-page layout; navigating between `/admin` and `/statistics` swapped between `AdminPageShell` (top nav) and a separate statistics layout — perceived as “two admin UIs,” not literal double sidebar on one route |
| **EXEC-7B fix** | `StatisticsPanel` extracted; `AdminAnalyticsPage` owns single shell |
| **Affected routes (historical)** | `/admin`, `/statistics` |
| **Current status** | **Resolved** — one `AdminDashboardSidebar` per mounted page |
| **Regression risk** | Mounting `AdminOperationsShell` inside another shell — **not present** in codebase |

### Symptom 2 — Nested shell rendering

| Field | Finding |
|-------|---------|
| **Affected pages (if present)** | Would affect any page wrapping `AdminOperationsShell` twice |
| **Code scan** | `AdminOperationsShell` imported only by page-level components; `StatisticsPanel` has no shell |
| **Current status** | **Resolved** — zero shell-in-shell nesting |

### Symptom 3 — Breadcrumb ownership inconsistencies

| Page | Breadcrumb owner | Issue | Status |
|------|------------------|-------|--------|
| `/admin` | Shell | Single crumb (overview) — correct for home | OK |
| `/admin/commercial` | Shell | `Overview → Commercial` | OK |
| `/admin/analytics` | Shell | `Overview → Analytics` | OK |
| `/admin/operations` | Shell | `Overview → Operations`; page title uses `admin.title` (not `admin.nav.operations`) | **Minor** — title/breadcrumb label differ by design (ops branding) |
| Placeholders | Shell | Consistent `Overview → Section` | OK |
| `/users` | Page inline header | No breadcrumbs | **Legacy** — expected until tenants migration |
| `/super-admin` | Custom nav | No breadcrumbs | **Legacy** |

---

## 6. HOTFIX-UI-2E — Remediation Summary

### Applied (this phase)

| Change | File | Rationale |
|--------|------|-----------|
| `/statistics` → `/admin/analytics` redirect | `client/src/pages/Statistics.tsx` | Route ownership; sidebar active state; eliminates alias URL rendering duplicate content at non-canonical path |

### Not applied (documented deferrals)

| Item | Reason |
|------|--------|
| Redirect `/users` → `/admin/tenants` | Tenants page is placeholder; would break role governance |
| Redirect `/super-admin` → `/admin` | Super-admin page retains distinct user-delete UX |
| Remove `AdminPageShell` | Dead code; removal is cleanup not required for layout stability |
| Move operations out of “legacy” sidebar group | Navigation redesign — out of scope |
| Wire `ADMIN_LEGACY_ROUTES` into sidebar | Navigation redesign — out of scope |

### Canonical route hierarchy (post-remediation)

```text
/admin                          ← executive home
├── /admin/commercial           ← commercial overview
├── /admin/analytics            ← analytics (canonical; /statistics redirects here)
├── /admin/operations           ← live operations (interim)
├── /admin/tenants              ← placeholder
├── /admin/customer-success     ← placeholder
├── /admin/health               ← placeholder
├── /admin/security             ← placeholder
├── /admin/reports              ← placeholder
└── /admin/launch-readiness     ← placeholder

Legacy (standalone, no shell):
  /users
  /super-admin
```

---

## 7. Validation

### Automated

```bash
npm run check
```

### Manual verification checklist

| URL | Expected |
|-----|----------|
| `/admin` | One sidebar, one breadcrumb (`Overview`), executive home |
| `/admin/commercial` | One sidebar, breadcrumbs `Overview → Commercial` |
| `/admin/operations` | One sidebar, breadcrumbs `Overview → Operations` |
| `/admin/analytics` | One sidebar, breadcrumbs `Overview → Analytics`, `StatisticsPanel` content |
| `/statistics` | Immediate redirect to `/admin/analytics` |

### Success criteria

| Criterion | Status |
|-----------|--------|
| One shell per canonical admin page | **Pass** |
| One sidebar per page | **Pass** |
| One breadcrumb chain per page | **Pass** |
| One canonical route hierarchy under `/admin/*` | **Pass** |
| No duplicated layout elements | **Pass** |

---

## 8. Related Documents

- [EXEC-7B-DASHBOARD-SHELL-FOUNDATION.md](./EXEC-7B-DASHBOARD-SHELL-FOUNDATION.md) — shell introduction
- [EXEC-7A-DASHBOARD-REBUILD-ARCHITECTURE.md](./EXEC-7A-DASHBOARD-REBUILD-ARCHITECTURE.md) — planned route convergence
- [AR-UX-7-COMMERCIAL-AUTHORITY-UX-ALIGNMENT.md](./AR-UX-7-COMMERCIAL-AUTHORITY-UX-ALIGNMENT.md) — operations UX alignment
