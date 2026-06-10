# ADMIN-DASHBOARD-PHASE-A — Navigation Cleanup & Entrypoint Normalization

**Program:** Admin Dashboard Rebuild  
**Phase:** PHASE-A — Pre-REBUILD-3B cleanup  
**Date:** 2026-06-07  
**Status:** Complete  

**Prerequisites:** REBUILD-3A, UX-REFINE-1 series, ENTRYPOINT-AUDIT

---

## 1. Executive Summary

Retired duplicate admin entrypoints via client-side redirects and aligned sidebar navigation so every operational destination is functional before REBUILD-3B route extraction. No visual redesign, no new routes, no API or auth changes.

---

## 2. Redirect Inventory

| Source route | Target | Type | Component |
|--------------|--------|------|-----------|
| `/users` | `/admin/operations?tab=accounts` | Legacy redirect | `Users.tsx` |
| `/super-admin` | `/admin` | Legacy redirect | `SuperAdminDashboard.tsx` |
| `/admin/tenants` | `/admin/operations?tab=tenants` | Transitional redirect | `AdminTenantsPage` |
| `/statistics` | `/admin/analytics` | Legacy redirect (pre-existing) | `Statistics.tsx` |

All redirects use `AdminLegacyRedirect` (same pattern as `Statistics.tsx`) for bookmark compatibility.

---

## 3. Removed Duplicate Entrypoints

| Retired surface | Replaced by |
|-----------------|-------------|
| `/users` full user admin UI (~280 lines) | Operations **Accounts** tab |
| `/super-admin` extended stats dashboard | Executive **Overview** (`/admin`) |
| `/admin/tenants` placeholder page | Operations **Tenants** tab |

Operators no longer encounter parallel account or admin-home experiences.

---

## 4. Sidebar Alignment (A.4)

| Nav item | Path | Active when |
|----------|------|-------------|
| Overview | `/admin` | `pathname === /admin` |
| Operations | `/admin/operations` | `tab=accounts` or `tab=communications` (default accounts) |
| Tenants | `/admin/operations?tab=tenants` | `pathname=/admin/operations` && `tab=tenants` |
| Other placeholders | Unchanged | Exact / prefix match |

`isAdminNavItemActive` now accepts `search` (wouter `useSearch`) to distinguish Operations vs Tenants on the shared `/admin/operations` route.

---

## 5. Legacy Route Registry (`ADMIN_LEGACY_ROUTES`)

Updated in `client/src/lib/admin/adminNavigation.ts`:

| Path | `canonicalPath` | `transitional` |
|------|-----------------|----------------|
| `/statistics` | `/admin/analytics` | — |
| `/users` | `/admin/operations?tab=accounts` | — |
| `/super-admin` | `/admin` | — |
| `/admin/tenants` | `/admin/operations?tab=tenants` | ✅ |

Locale keys `admin.legacy.*Note` updated in `en.json` / `ar.json`.

---

## 6. REBUILD-3B Migration Notes

When route extraction lands:

| PHASE-A interim | REBUILD-3B target |
|-----------------|-------------------|
| `/admin/operations?tab=accounts` | `/admin/accounts` |
| `/admin/operations?tab=tenants` | `/admin/tenants` (real page — remove redirect) |
| `/admin/operations?tab=communications` | `/admin/communications` |
| `/admin/operations` | Redirect → `/admin/accounts` then retire |
| Sidebar Tenants path | `/admin/tenants` (replace `operationsTabHref`) |
| `/users` redirect | Retarget → `/admin/accounts` |
| `/admin/tenants` redirect | **Remove** (route becomes live) |

Keep `/super-admin` → `/admin` redirect indefinitely for bookmarks.

---

## 7. File Inventory

| File | Change |
|------|--------|
| `client/src/pages/admin/AdminLegacyRedirect.tsx` | **New** — shared redirect helper |
| `client/src/pages/Users.tsx` | Redirect only |
| `client/src/pages/SuperAdminDashboard.tsx` | Redirect only |
| `client/src/pages/admin/placeholderPages.tsx` | `AdminTenantsPage` → redirect |
| `client/src/lib/admin/adminNavigation.ts` | Tenants nav path, legacy registry, active state |
| `client/src/components/admin/layout/AdminDashboardSidebar.tsx` | Pass `search` to active matcher |
| `client/src/locales/en.json`, `ar.json` | Legacy route notes |

---

## 8. Out of Scope (Preserved)

- No REBUILD-3B extraction
- No `/admin/accounts`, `/admin/communications` routes
- No API, auth, OWNER_OPEN_ID, or commercial logic changes
- No visual redesign
