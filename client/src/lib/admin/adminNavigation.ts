import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Rocket,
  Shield,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  parseOperationsTab,
  operationsTabHref,
} from "@/pages/admin/operations/operationsTab";

/** EXEC-7B — single configuration source for admin dashboard navigation. */
export type AdminNavItem = {
  id: string;
  path: string;
  labelKey: string;
  descriptionKey?: string;
  icon: LucideIcon;
  /** When true, only exact path match is active (e.g. /admin home). */
  exact?: boolean;
};

export type AdminNavGroup = {
  id: string;
  labelKey?: string;
  items: AdminNavItem[];
};

/** Primary sidebar navigation — drives all EXEC-7+ admin domains. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "main",
    items: [
      {
        id: "overview",
        path: "/admin",
        labelKey: "admin.nav.overview",
        descriptionKey: "admin.nav.overviewDesc",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        id: "commercial",
        path: "/admin/commercial",
        labelKey: "admin.nav.commercial",
        descriptionKey: "admin.nav.commercialDesc",
        icon: TrendingUp,
      },
      {
        id: "analytics",
        path: "/admin/analytics",
        labelKey: "admin.nav.analytics",
        descriptionKey: "admin.nav.analyticsDesc",
        icon: BarChart3,
      },
      {
        id: "tenants",
        path: operationsTabHref("tenants"),
        labelKey: "admin.nav.tenants",
        descriptionKey: "admin.nav.tenantsDesc",
        icon: Building2,
      },
      {
        id: "customer-success",
        path: "/admin/customer-success",
        labelKey: "admin.nav.customerSuccess",
        descriptionKey: "admin.nav.customerSuccessDesc",
        icon: Users,
      },
      {
        id: "health",
        path: "/admin/health",
        labelKey: "admin.nav.health",
        descriptionKey: "admin.nav.healthDesc",
        icon: HeartPulse,
      },
      {
        id: "security",
        path: "/admin/security",
        labelKey: "admin.nav.security",
        descriptionKey: "admin.nav.securityDesc",
        icon: Shield,
      },
      {
        id: "reports",
        path: "/admin/reports",
        labelKey: "admin.nav.reports",
        descriptionKey: "admin.nav.reportsDesc",
        icon: FileText,
      },
      {
        id: "launch-readiness",
        path: "/admin/launch-readiness",
        labelKey: "admin.nav.launchReadiness",
        descriptionKey: "admin.nav.launchReadinessDesc",
        icon: Rocket,
      },
      {
        id: "operations",
        path: "/admin/operations",
        labelKey: "admin.nav.operations",
        descriptionKey: "admin.nav.operationsDesc",
        icon: Store,
      },
    ],
  },
];

/** @deprecated REBUILD-3A — operations promoted to main nav; kept for import compatibility. */
export const ADMIN_LEGACY_NAV: AdminNavItem[] = [];

export type AdminLegacyRoute = {
  path: string;
  canonicalPath: string;
  labelKey: string;
  noteKey: string;
  /** PHASE-A — transitional until REBUILD-3B route extraction */
  transitional?: boolean;
};

/** Legacy routes retained for bookmarks — PHASE-A redirects implemented in App router. */
export const ADMIN_LEGACY_ROUTES: AdminLegacyRoute[] = [
  {
    path: "/statistics",
    canonicalPath: "/admin/analytics",
    labelKey: "admin.legacy.statistics",
    noteKey: "admin.legacy.statisticsNote",
  },
  {
    path: "/users",
    canonicalPath: operationsTabHref("accounts"),
    labelKey: "admin.legacy.users",
    noteKey: "admin.legacy.usersNote",
  },
  {
    path: "/super-admin",
    canonicalPath: "/admin",
    labelKey: "admin.legacy.superAdmin",
    noteKey: "admin.legacy.superAdminNote",
  },
  {
    path: "/admin/tenants",
    canonicalPath: operationsTabHref("tenants"),
    labelKey: "admin.legacy.tenants",
    noteKey: "admin.legacy.tenantsNote",
    transitional: true,
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.items
);

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
