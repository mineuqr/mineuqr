/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — experience navigation model.
 */

import type { CommercialCatalogDashboardSection } from "@shared/commercial-catalog";

export const EXPERIENCE_TABS = [
  "dashboard",
  "wizard",
  "search",
  "compare",
  "preview",
  "customer_preview",
  "graph",
  "timeline",
  "bulk",
  "manage",
] as const;

export type ExperienceTab = (typeof EXPERIENCE_TABS)[number];

export const EXPERIENCE_TAB_LABELS: Record<ExperienceTab, string> = {
  dashboard: "Dashboard",
  wizard: "Plan Wizard",
  search: "Search",
  compare: "Compare",
  preview: "Pricing Preview",
  customer_preview: "Customer Preview",
  graph: "Dependencies",
  timeline: "Timeline",
  bulk: "Bulk Ops",
  manage: "Manage",
};

export type ExperienceNavigate = (
  section: CommercialCatalogDashboardSection
) => void;
