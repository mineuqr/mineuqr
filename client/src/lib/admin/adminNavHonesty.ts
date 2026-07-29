/**
 * PLATFORM-P0-PRODUCTION-READINESS-1
 * Admin primary-navigation product honesty registry (presentation / IA only).
 */

import type { AdminRouteId } from "@/lib/admin/routes/adminRouteTypes";

export const ADMIN_NAV_PRODUCT_STATUSES = [
  "live",
  "hub",
  "architecture",
  "reserved",
  "coming_soon",
  "hidden",
] as const;

export type AdminNavProductStatus =
  (typeof ADMIN_NAV_PRODUCT_STATUSES)[number];

export type AdminNavHonestyDecision =
  | "remain"
  | "move"
  | "hide"
  | "group"
  | "hub";

export type AdminNavHonestyEntry = {
  routeId: AdminRouteId;
  productStatus: AdminNavProductStatus;
  decision: AdminNavHonestyDecision;
  /** When true, may appear in primary sidebar. */
  primaryNav: boolean;
  notes: string;
};

/**
 * Canonical honesty matrix for SaaS admin primary navigation.
 * Coming Soon / unfinished products must not appear as Live in the sidebar.
 */
export const ADMIN_NAV_HONESTY_MATRIX: readonly AdminNavHonestyEntry[] = [
  {
    routeId: "overview",
    productStatus: "live",
    decision: "remain",
    primaryNav: true,
    notes: "Command center — live.",
  },
  {
    routeId: "reports",
    productStatus: "hub",
    decision: "hub",
    primaryNav: true,
    notes: "Canonical Reports entry — Commercial + Analytics destinations.",
  },
  {
    routeId: "commercial",
    productStatus: "live",
    decision: "group",
    primaryNav: false,
    notes: "Grouped under Reports Hub; route preserved.",
  },
  {
    routeId: "analytics",
    productStatus: "live",
    decision: "group",
    primaryNav: false,
    notes: "Grouped under Reports Hub; route preserved.",
  },
  {
    routeId: "tenants",
    productStatus: "live",
    decision: "remain",
    primaryNav: true,
    notes: "Deep-link into business operations tenants tab.",
  },
  {
    routeId: "customer-success",
    productStatus: "coming_soon",
    decision: "hide",
    primaryNav: false,
    notes: "CS tooling lives under /admin/operations; dedicated page redirects.",
  },
  {
    routeId: "security",
    productStatus: "live",
    decision: "remain",
    primaryNav: true,
    notes: "Security Center — live.",
  },
  {
    routeId: "launch-readiness",
    productStatus: "coming_soon",
    decision: "hide",
    primaryNav: false,
    notes: "Placeholder — hidden from primary nav.",
  },
  {
    routeId: "platform-operations",
    productStatus: "live",
    decision: "remain",
    primaryNav: true,
    notes: "Workspace; section-level status semantics apply inside.",
  },
  {
    routeId: "health",
    productStatus: "architecture",
    decision: "move",
    primaryNav: false,
    notes: "Under Platform Ops; architecture status.",
  },
  {
    routeId: "operations",
    productStatus: "live",
    decision: "hide",
    primaryNav: false,
    notes: "Business ops workspace; reached via Tenants / deep links.",
  },
] as const;
