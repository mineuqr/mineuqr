# REBUILD-3BC — Navigation Adoption

**Program:** ADMIN-DASHBOARD-REBUILD-3B  
**Phase:** 3BC — Navigation Adoption  
**Mode:** Implementation (structural extraction only)

---

## Objective

Sidebar and navigation config consume the route registry as the single source of truth. Eliminate duplicated route definitions in `adminNavigation.ts`.

---

## Navigation Derivation

`ADMIN_NAV_GROUPS` and `ADMIN_NAV_ITEMS` are now built in `adminRouteRegistry.ts` from:

1. `ADMIN_ROUTE_DEFINITIONS` — route metadata
2. `ADMIN_ROUTE_NAV_GROUP_LAYOUT` — group order and membership

Nav items are projected via `routeToNavItem()`:

```ts
{ id, path, labelKey, descriptionKey, icon, exact }
```

`ADMIN_LEGACY_NAV` remains an empty array (REBUILD-3A compat).

---

## Sidebar Adoption

`AdminDashboardSidebar.tsx` imports directly from:

```ts
@/lib/admin/routes/adminRouteRegistry
```

| Import | Source |
|--------|--------|
| `ADMIN_NAV_GROUPS` | Registry-derived |
| `ADMIN_LEGACY_NAV` | Registry-derived |
| `isAdminNavItemActive` | Registry (unchanged logic) |
| `AdminNavItem` (type) | `adminRouteTypes.ts` |

---

## Home Page Shortcuts

`AdminDashboardHome.tsx`:

- **All sections grid:** `ADMIN_NAV_ITEMS` from registry (filters out `overview`)
- **Featured shortcuts:** unchanged inline paths; type narrowed to omit synthetic ids

---

## Active-State Behavior

`isAdminNavItemActive` preserved exactly:

| Route id | Active when |
|----------|-------------|
| `tenants` | `/admin/operations` + `tab=tenants` |
| `operations` | `/admin/operations` + tab `accounts` or `communications` |
| `overview` | exact `/admin` |
| others | path match or prefix match |

No sidebar logic, tab logic, or highlight behavior changes.

---

## Compatibility

`adminNavigation.ts` re-exports registry symbols for any legacy import paths. New code should import from `@/lib/admin/routes/adminRouteRegistry`.

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/lib/admin/adminNavigation.ts` | Thin re-export shim |
| `client/src/components/admin/layout/AdminDashboardSidebar.tsx` | Registry import path |
| `client/src/pages/admin/AdminDashboardHome.tsx` | Registry `ADMIN_NAV_ITEMS` |
