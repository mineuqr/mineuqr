/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1 — experience navigation keys.
 * Labels resolved via platform t() — no hardcoded UI copy.
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

/** Locale key suffix under admin.platformOps.commercialCatalog.experience.tabs.* */
export const EXPERIENCE_TAB_I18N_KEYS: Record<ExperienceTab, string> = {
  dashboard: "admin.platformOps.commercialCatalog.experience.tabs.dashboard",
  wizard: "admin.platformOps.commercialCatalog.experience.tabs.wizard",
  search: "admin.platformOps.commercialCatalog.experience.tabs.search",
  compare: "admin.platformOps.commercialCatalog.experience.tabs.compare",
  preview: "admin.platformOps.commercialCatalog.experience.tabs.preview",
  customer_preview:
    "admin.platformOps.commercialCatalog.experience.tabs.customer_preview",
  graph: "admin.platformOps.commercialCatalog.experience.tabs.graph",
  timeline: "admin.platformOps.commercialCatalog.experience.tabs.timeline",
  bulk: "admin.platformOps.commercialCatalog.experience.tabs.bulk",
  manage: "admin.platformOps.commercialCatalog.experience.tabs.manage",
};

/** @deprecated Use EXPERIENCE_TAB_I18N_KEYS + t() */
export const EXPERIENCE_TAB_LABELS = EXPERIENCE_TAB_I18N_KEYS;

export type ExperienceNavigate = (
  section: CommercialCatalogDashboardSection
) => void;
