# REBUILD-3BB — Metadata Extraction

**Program:** ADMIN-DASHBOARD-REBUILD-3B  
**Phase:** 3BB — Metadata Extraction  
**Mode:** Implementation (structural extraction only)

---

## Objective

Move page title, subtitle, breadcrumb, and section label ownership from page components into the route registry. Pages become consumers via `resolveAdminPageShell(routeId, t)`.

---

## Registry Helper

```ts
resolveAdminPageShell(routeId, t) → { title, subtitle?, breadcrumbs }
```

Breadcrumb labels resolve through referenced route `labelKey` entries in each route's `breadcrumbs` array.

---

## Ownership Transferred

| Source | Extracted metadata | Registry route |
|--------|-------------------|----------------|
| `AdminDashboardHome.tsx` | `homeTitle`, `homeSubtitle`, overview breadcrumb | `overview` |
| `AdminAnalyticsPage.tsx` | analytics title, page subtitle, breadcrumbs | `analytics` |
| `AdminCommercialPage.tsx` | commercial title, `pageSubtitle`, breadcrumbs | `commercial` |
| `AdminManagement.tsx` | `workspaceTitle`, breadcrumbs | `operations` |
| `AdminSectionPlaceholder.tsx` | title, subtitle, breadcrumbs per nav section | placeholder route ids |
| `placeholderPages.tsx` | nav id lookup | `getAdminRoute(routeId)` |

---

## Locale Addition (behavior-preserving)

Analytics page subtitle was previously hardcoded in `AdminAnalyticsPage.tsx`. Extracted to:

- `admin.nav.analyticsPageSubtitle` (en + ar)

Text matches pre-extraction hardcoded strings exactly.

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/pages/admin/AdminDashboardHome.tsx` | `resolveAdminPageShell("overview")` |
| `client/src/pages/admin/AdminAnalyticsPage.tsx` | `resolveAdminPageShell("analytics")` |
| `client/src/pages/admin/AdminCommercialPage.tsx` | `resolveAdminPageShell("commercial")` |
| `client/src/pages/AdminManagement.tsx` | `resolveAdminPageShell("operations")` |
| `client/src/pages/admin/AdminSectionPlaceholder.tsx` | `routeId` prop + registry lookups |
| `client/src/pages/admin/placeholderPages.tsx` | `getAdminRoute` + `routeId` |
| `client/src/locales/en.json` | `analyticsPageSubtitle` |
| `client/src/locales/ar.json` | `analyticsPageSubtitle` |

---

## Unchanged Page Output

- Overview shell: Operations Center / unified entry subtitle / single overview breadcrumb
- Analytics: same title and canonical-authority subtitle (now via i18n key)
- Commercial: same title and executive subtitle
- Operations: same workspace title and overview → operations breadcrumbs
- Placeholders: same title, description, and breadcrumb trail

No layout, spacing, or styling changes.
