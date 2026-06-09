# ADMIN-DASHBOARD-REBUILD-3A — Operations Tab Decomposition

**Program:** Admin Dashboard Rebuild  
**Phase:** REBUILD-3A — Low-risk implementation  
**Date:** 2026-06-09  
**Status:** Complete  

**Prerequisites:** REBUILD-1, REBUILD-2

---

## 1. Executive Summary

`/admin/operations` is no longer a single scrolling monolith. It is a **tabbed workspace** with three domains on one route:

```text
/admin/operations?tab=accounts      (default)
/admin/operations?tab=tenants
/admin/operations?tab=communications
```

No new routes. No API or authorization changes. KPI duplication removed from Operations. Legacy navigation language removed.

---

## 2. Tab Architecture (3A.1)

| Tab | Default | Deep link |
|-----|---------|-----------|
| **Accounts** | ✅ | `?tab=accounts` or no query |
| **Tenants** | | `?tab=tenants` |
| **Communications** | | `?tab=communications` |

**Implementation:**

| Module | Role |
|--------|------|
| `client/src/pages/admin/operations/operationsTab.ts` | Tab ids, `parseOperationsTab`, `operationsTabHref` |
| `client/src/pages/AdminManagement.tsx` | Shell + `AccountsTab`, `TenantsTab` exports |
| `client/src/pages/admin/operations/CommunicationsTab.tsx` | Communications domain |
| `client/src/pages/admin/operations/index.ts` | Barrel for REBUILD-3B extraction |

Tab state syncs to URL via wouter `useSearch` / `setLocation`.

---

## 3. Moved Sections (3A.2–3A.4)

### Accounts tab

| Content | Source |
|---------|--------|
| User directory (`getOwnerOverviewList`) | Former `UsersSection` |
| Classification filter | Unchanged |
| Role / classification inline edit | Unchanged |
| Subscription CRUD dialogs | Unchanged |
| Internal user create | Unchanged |
| Delete user | Unchanged |
| Invoice PDF | Unchanged |
| Platform protection (1D/1E) | Unchanged — actions gated |
| Platform badge | **Added** — `admin.operations.platformBadge` |

**Removed from Accounts:** per-user notify button, bulk notify toolbar, notify dialogs (moved to Communications).

### Tenants tab

| Content | Source |
|---------|--------|
| Restaurant directory | Former restaurants `AdminSection` |
| Search + status filter | Unchanged |
| Create restaurant dialog | Unchanged |
| Delete restaurant | Unchanged |
| Edit → owner dashboard | Unchanged |
| Add restaurant CTA | Moved to `AdminSection` actions |

### Communications tab

| Content | Source |
|---------|--------|
| Notify single user (select + message) | Former per-user notify dialog |
| Announcement to all users | Former bulk notify |
| Email operations placeholder | New — future home |

---

## 4. Removed Duplication (3A.5)

| Removed | From |
|---------|------|
| `AdminKPISection` | Operations page |
| `getDashboardSummary` query | `TenantsTab` / operations shell |
| Duplicate scroll layout | Replaced by tabs |

KPIs remain on `/admin`, `/admin/commercial`, `/admin/analytics` only.

---

## 5. Navigation Language (3A.6)

| Before | After |
|--------|-------|
| Sidebar “Legacy operations” group | Operations in **main** nav group |
| `operationsDesc` “(legacy)” | “Accounts, tenants, and communications” |
| Home legacy operations card | Removed |
| `ADMIN_LEGACY_NAV` | Empty array (compat) |

---

## 6. Constraints Honored

- No `/admin/accounts`, `/admin/tenants`, `/admin/communications` routes
- No CRS, authorization, classification, or OWNER_OPEN_ID changes
- No visual redesign / palette changes
- All existing mutations preserved

---

## 7. REBUILD-3B Readiness

| Ready | Item |
|-------|------|
| ✅ | `AccountsTab`, `TenantsTab` exported from `AdminManagement.tsx` |
| ✅ | `CommunicationsTab` in standalone file |
| ✅ | `operations/index.ts` barrel |
| ✅ | URL tab param maps 1:1 to future routes |
| Next | Move each tab to dedicated page component + route registration |

**Suggested 3B mapping:**

```text
?tab=accounts        → /admin/accounts
?tab=tenants         → /admin/tenants
?tab=communications  → /admin/communications
```

---

## 8. Files Changed

| File | Change |
|------|--------|
| `client/src/pages/AdminManagement.tsx` | Tabs shell; `AccountsTab`; `TenantsTab` |
| `client/src/pages/admin/operations/CommunicationsTab.tsx` | New |
| `client/src/pages/admin/operations/operationsTab.ts` | New |
| `client/src/pages/admin/operations/index.ts` | New |
| `client/src/lib/admin/adminNavigation.ts` | Operations in main nav |
| `client/src/components/admin/layout/AdminDashboardSidebar.tsx` | Hide empty legacy group |
| `client/src/pages/admin/AdminDashboardHome.tsx` | Remove legacy card; operations deep link |
| `client/src/locales/en.json`, `ar.json` | Operations workspace + tab labels |
