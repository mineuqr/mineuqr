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
        path: "/admin/tenants",
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
    ],
  },
];

/** Interim operations surface until EXEC-7D tenant directory ships. */
export const ADMIN_LEGACY_NAV: AdminNavItem[] = [
  {
    id: "operations",
    path: "/admin/operations",
    labelKey: "admin.nav.operations",
    descriptionKey: "admin.nav.operationsDesc",
    icon: Store,
  },
];

export type AdminLegacyRoute = {
  path: string;
  canonicalPath: string;
  labelKey: string;
  noteKey: string;
};

/** Legacy routes retained in EXEC-7B — documented, not removed. */
export const ADMIN_LEGACY_ROUTES: AdminLegacyRoute[] = [
  {
    path: "/statistics",
    canonicalPath: "/admin/analytics",
    labelKey: "admin.legacy.statistics",
    noteKey: "admin.legacy.statisticsNote",
  },
  {
    path: "/users",
    canonicalPath: "/admin/tenants",
    labelKey: "admin.legacy.users",
    noteKey: "admin.legacy.usersNote",
  },
  {
    path: "/super-admin",
    canonicalPath: "/admin",
    labelKey: "admin.legacy.superAdmin",
    noteKey: "admin.legacy.superAdminNote",
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.items
);

export function isAdminNavItemActive(item: AdminNavItem, pathname: string): boolean {
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
