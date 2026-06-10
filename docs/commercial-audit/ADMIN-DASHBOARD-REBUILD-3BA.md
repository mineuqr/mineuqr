# REBUILD-3BA — Route Registry Foundation

**Program:** ADMIN-DASHBOARD-REBUILD-3B  
**Phase:** 3BA — Route Registry Foundation  
**Mode:** Implementation (structural extraction only)

---

## Objective

Establish a single source of truth for admin route identity, paths, titles, descriptions, breadcrumbs, and navigation ownership metadata.

---

## Files Created

| File | Responsibility |
|------|----------------|
| `client/src/lib/admin/routes/adminRouteTypes.ts` | `AdminRouteId`, `AdminRouteDefinition`, `AdminNavItem`, `AdminNavGroup`, `AdminLegacyRoute`, `AdminPageShellMeta` |
| `client/src/lib/admin/routes/adminRoutes.ts` | Canonical route definitions (`ADMIN_ROUTE_DEFINITIONS`), nav group layout, legacy route registry |
| `client/src/lib/admin/routes/adminRouteRegistry.ts` | `getAdminRoute`, `resolveAdminPageShell`, nav derivation, `isAdminNavItemActive`, `findAdminNavItemByPath` |

---

## Route Identity Model

Each route defines:

| Field | Purpose |
|-------|---------|
| `id` | Stable route identifier (`AdminRouteId`) |
| `path` | URL path (unchanged from pre-extraction) |
| `category` | Domain grouping (`dashboard`, `commercial`, `operations`, etc.) |
| `labelKey` | Sidebar / breadcrumb navigation label |
| `descriptionKey` | Nav description and placeholder subtitle fallback |
| `pageTitleKey` | Page shell title (optional; falls back to `labelKey`) |
| `pageSubtitleKey` | Page shell subtitle (optional) |
| `icon` | Sidebar icon |
| `exact` | Exact-path active matching (overview only) |
| `showInNav` | Sidebar visibility (defaults `true`) |
| `breadcrumbs` | Ordered breadcrumb ownership |

---

## Registry Routes (10)

| id | path | category |
|----|------|----------|
| `overview` | `/admin` | `dashboard` |
| `commercial` | `/admin/commercial` | `commercial` |
| `analytics` | `/admin/analytics` | `analytics` |
| `tenants` | `/admin/operations?tab=tenants` | `operations` |
| `customer-success` | `/admin/customer-success` | `customer-success` |
| `health` | `/admin/health` | `health` |
| `security` | `/admin/security` | `security` |
| `reports` | `/admin/reports` | `reports` |
| `launch-readiness` | `/admin/launch-readiness` | `launch-readiness` |
| `operations` | `/admin/operations` | `operations` |

Legacy redirect registry (`ADMIN_LEGACY_ROUTES`) moved into `adminRoutes.ts` — metadata only; no routing changes.

---

## Compatibility Shim

`client/src/lib/admin/adminNavigation.ts` reduced to re-exports from the registry for existing import paths.

---

## Out of Scope (Preserved)

- `App.tsx` route table unchanged
- No URL, redirect, auth, or query changes
- `isAdminNavItemActive` logic copied verbatim into registry
