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
import { operationsTabHref } from "@/pages/admin/operations/operationsTab";
import type {
  AdminLegacyRoute,
  AdminRouteDefinition,
  AdminRouteNavGroupLayout,
} from "./adminRouteTypes";

/** REBUILD-3B — canonical admin route metadata (paths, titles, breadcrumbs, ownership). */
export const ADMIN_ROUTE_DEFINITIONS: AdminRouteDefinition[] = [
  {
    id: "overview",
    path: "/admin",
    category: "dashboard",
    labelKey: "admin.nav.overview",
    descriptionKey: "admin.nav.overviewDesc",
    pageTitleKey: "admin.nav.homeTitle",
    pageSubtitleKey: "admin.nav.homeSubtitle",
    icon: LayoutDashboard,
    exact: true,
    breadcrumbs: [{ routeId: "overview" }],
  },
  {
    id: "commercial",
    path: "/admin/commercial",
    category: "commercial",
    labelKey: "admin.nav.commercial",
    descriptionKey: "admin.nav.commercialDesc",
    pageSubtitleKey: "admin.commercial.pageSubtitle",
    icon: TrendingUp,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "commercial" },
    ],
  },
  {
    id: "analytics",
    path: "/admin/analytics",
    category: "analytics",
    labelKey: "admin.nav.analytics",
    descriptionKey: "admin.nav.analyticsDesc",
    pageSubtitleKey: "admin.nav.analyticsPageSubtitle",
    icon: BarChart3,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "analytics" },
    ],
  },
  {
    id: "tenants",
    path: operationsTabHref("tenants"),
    category: "operations",
    labelKey: "admin.nav.tenants",
    descriptionKey: "admin.nav.tenantsDesc",
    icon: Building2,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "tenants" },
    ],
  },
  {
    id: "customer-success",
    path: "/admin/customer-success",
    category: "customer-success",
    labelKey: "admin.nav.customerSuccess",
    descriptionKey: "admin.nav.customerSuccessDesc",
    icon: Users,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "customer-success" },
    ],
  },
  {
    id: "health",
    path: "/admin/health",
    category: "health",
    labelKey: "admin.nav.health",
    descriptionKey: "admin.nav.healthDesc",
    icon: HeartPulse,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "health" },
    ],
  },
  {
    id: "security",
    path: "/admin/security",
    category: "security",
    labelKey: "admin.nav.security",
    descriptionKey: "admin.nav.securityDesc",
    icon: Shield,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "security" },
    ],
  },
  {
    id: "reports",
    path: "/admin/reports",
    category: "reports",
    labelKey: "admin.nav.reports",
    descriptionKey: "admin.nav.reportsDesc",
    icon: FileText,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "reports" },
    ],
  },
  {
    id: "launch-readiness",
    path: "/admin/launch-readiness",
    category: "launch-readiness",
    labelKey: "admin.nav.launchReadiness",
    descriptionKey: "admin.nav.launchReadinessDesc",
    icon: Rocket,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "launch-readiness" },
    ],
  },
  {
    id: "operations",
    path: "/admin/operations",
    category: "operations",
    labelKey: "admin.nav.operations",
    descriptionKey: "admin.nav.operationsDesc",
    pageTitleKey: "admin.operations.workspaceTitle",
    icon: Store,
    breadcrumbs: [
      { routeId: "overview", href: "/admin" },
      { routeId: "operations" },
    ],
  },
];

/** Sidebar group layout — order and grouping for navigation. */
export const ADMIN_ROUTE_NAV_GROUP_LAYOUT: AdminRouteNavGroupLayout[] = [
  {
    id: "main",
    routeIds: [
      "overview",
      "commercial",
      "analytics",
      "tenants",
      "customer-success",
      "health",
      "security",
      "reports",
      "launch-readiness",
      "operations",
    ],
  },
];

/** @deprecated REBUILD-3A — operations promoted to main nav; kept for import compatibility. */
export const ADMIN_LEGACY_NAV_ROUTE_IDS: never[] = [];

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
