import {
  parseOperationsTab,
} from "@/pages/admin/operations/operationsTab";
import {
  ADMIN_LEGACY_NAV_ROUTE_IDS,
  ADMIN_LEGACY_ROUTES,
  ADMIN_ROUTE_DEFINITIONS,
  ADMIN_ROUTE_NAV_GROUP_LAYOUT,
} from "./adminRoutes";
import type {
  AdminLegacyRoute,
  AdminNavGroup,
  AdminNavItem,
  AdminPageShellMeta,
  AdminRouteDefinition,
  AdminRouteId,
} from "./adminRouteTypes";

const ROUTE_BY_ID = new Map<AdminRouteId, AdminRouteDefinition>(
  ADMIN_ROUTE_DEFINITIONS.map((route) => [route.id, route])
);

export function getAdminRoute(id: AdminRouteId): AdminRouteDefinition {
  const route = ROUTE_BY_ID.get(id);
  if (!route) {
    throw new Error(`Unknown admin route id: ${id}`);
  }
  return route;
}

function routeToNavItem(route: AdminRouteDefinition): AdminNavItem {
  return {
    id: route.id,
    path: route.path,
    labelKey: route.labelKey,
    descriptionKey: route.descriptionKey,
    icon: route.icon,
    exact: route.exact,
  };
}

function buildNavGroups(): AdminNavGroup[] {
  return ADMIN_ROUTE_NAV_GROUP_LAYOUT.map((layout) => ({
    id: layout.id,
    labelKey: layout.labelKey,
    items: layout.routeIds
      .map((id) => ROUTE_BY_ID.get(id))
      .filter((route): route is AdminRouteDefinition => route != null)
      .filter((route) => route.showInNav !== false)
      .map(routeToNavItem),
  }));
}

/** Primary sidebar navigation — drives all EXEC-7+ admin domains. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = buildNavGroups();

/** @deprecated REBUILD-3A — operations promoted to main nav; kept for import compatibility. */
export const ADMIN_LEGACY_NAV: AdminNavItem[] = ADMIN_LEGACY_NAV_ROUTE_IDS.map(
  (id) => routeToNavItem(getAdminRoute(id))
);

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.items
);

export { ADMIN_LEGACY_ROUTES };

export function resolveAdminPageShell(
  routeId: AdminRouteId,
  t: (key: string) => string
): AdminPageShellMeta {
  const route = getAdminRoute(routeId);
  const titleKey = route.pageTitleKey ?? route.labelKey;
  const subtitleKey = route.pageSubtitleKey ?? route.descriptionKey;

  return {
    title: t(titleKey),
    subtitle: subtitleKey ? t(subtitleKey) : undefined,
    breadcrumbs: route.breadcrumbs.map((crumb) => ({
      label: t(getAdminRoute(crumb.routeId).labelKey),
      href: crumb.href,
    })),
  };
}

export function isAdminNavItemActive(
  item: AdminNavItem,
  pathname: string,
  search = ""
): boolean {
  if (item.id === "tenants") {
    return pathname === "/admin/operations" && parseOperationsTab(search) === "tenants";
  }
  if (item.id === "operations") {
    if (pathname !== "/admin/operations") return false;
    const tab = parseOperationsTab(search);
    return tab === "accounts" || tab === "communications";
  }
  if (item.exact) {
    return pathname === item.path;
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export function findAdminNavItemByPath(pathname: string): AdminNavItem | undefined {
  const all = [...ADMIN_NAV_ITEMS, ...ADMIN_LEGACY_NAV];
  const exact = all.find((item) => item.path === pathname);
  if (exact) return exact;
  return all.find(
    (item) => !item.exact && pathname.startsWith(`${item.path}/`)
  );
}

export function getAdminRouteByPath(pathname: string): AdminRouteDefinition | undefined {
  return ADMIN_ROUTE_DEFINITIONS.find((route) => {
    if (route.exact) {
      return pathname === route.path;
    }
    return pathname === route.path || pathname.startsWith(`${route.path}/`);
  });
}
