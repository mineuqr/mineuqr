import type { LucideIcon } from "lucide-react";

/** Canonical admin route identifiers — single source for route identity. */
export type AdminRouteId =
  | "overview"
  | "commercial"
  | "analytics"
  | "tenants"
  | "customer-success"
  | "health"
  | "security"
  | "reports"
  | "launch-readiness"
  | "operations";

export type AdminRouteCategory =
  | "dashboard"
  | "commercial"
  | "analytics"
  | "operations"
  | "customer-success"
  | "health"
  | "security"
  | "reports"
  | "launch-readiness";

export type AdminRouteBreadcrumbDef = {
  /** Route whose labelKey supplies the breadcrumb text. */
  routeId: AdminRouteId;
  /** When set, breadcrumb renders as a link; omit for the current page. */
  href?: string;
};

export type AdminRouteDefinition = {
  id: AdminRouteId;
  path: string;
  category: AdminRouteCategory;
  /** Sidebar and shortcut navigation label. */
  labelKey: string;
  descriptionKey?: string;
  /** Page shell title — falls back to labelKey when omitted. */
  pageTitleKey?: string;
  pageSubtitleKey?: string;
  icon: LucideIcon;
  /** When true, only an exact path match is active (e.g. /admin home). */
  exact?: boolean;
  /** When false, route is omitted from sidebar navigation. Defaults to true. */
  showInNav?: boolean;
  breadcrumbs: AdminRouteBreadcrumbDef[];
};

export type AdminLegacyRoute = {
  path: string;
  canonicalPath: string;
  labelKey: string;
  noteKey: string;
  /** PHASE-A — transitional until REBUILD-3B route extraction */
  transitional?: boolean;
};

/** Sidebar navigation item — derived from route definitions. */
export type AdminNavItem = {
  id: AdminRouteId;
  path: string;
  labelKey: string;
  descriptionKey?: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type AdminNavGroup = {
  id: string;
  labelKey?: string;
  items: AdminNavItem[];
};

export type AdminRouteNavGroupLayout = {
  id: string;
  labelKey?: string;
  routeIds: AdminRouteId[];
};

export type AdminPageShellMeta = {
  title: string;
  subtitle?: string;
  breadcrumbs: { label: string; href?: string }[];
};
