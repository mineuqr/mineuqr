/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-P0-PRODUCTION-READINESS-1
 * Platform Operations workspace section registry (navigation + status semantics).
 */

import {
  type PlatformOpsProductStatus,
  isPlatformOpsOperationallyLive,
  platformOpsStatusBadgeTone,
  platformOpsStatusLabelKey,
} from "./platformOpsStatusSemantics";

export const PLATFORM_OPS_SECTIONS = [
  "overview",
  "realtime",
  "health",
  "performance",
  "devices",
  "subscription",
  "jobs",
  "events",
  "audit",
  "diagnostics",
] as const;

export type PlatformOpsSectionId = (typeof PLATFORM_OPS_SECTIONS)[number];

export type PlatformOpsSectionDef = {
  id: PlatformOpsSectionId;
  path: string;
  labelKey: string;
  descriptionKey: string;
  /**
   * Product status — never present Architecture/Reserved as operational Live.
   * PLATFORM-P0-PRODUCTION-READINESS-1
   */
  status: PlatformOpsProductStatus;
};

export const PLATFORM_OPS_BASE = "/admin/platform";

export const PLATFORM_OPS_SECTION_DEFINITIONS: readonly PlatformOpsSectionDef[] =
  [
    {
      id: "overview",
      path: PLATFORM_OPS_BASE,
      labelKey: "admin.platformOps.sections.overview",
      descriptionKey: "admin.platformOps.sections.overviewDesc",
      status: "live",
    },
    {
      id: "realtime",
      path: `${PLATFORM_OPS_BASE}/realtime`,
      labelKey: "admin.platformOps.sections.realtime",
      descriptionKey: "admin.platformOps.sections.realtimeDesc",
      status: "live",
    },
    {
      id: "health",
      path: `${PLATFORM_OPS_BASE}/health`,
      labelKey: "admin.platformOps.sections.health",
      descriptionKey: "admin.platformOps.sections.healthDesc",
      /** Path migrated; panel not yet an operational control surface. */
      status: "architecture",
    },
    {
      id: "performance",
      path: `${PLATFORM_OPS_BASE}/performance`,
      labelKey: "admin.platformOps.sections.performance",
      descriptionKey: "admin.platformOps.sections.performanceDesc",
      status: "architecture",
    },
    {
      id: "devices",
      path: `${PLATFORM_OPS_BASE}/devices`,
      labelKey: "admin.platformOps.sections.devices",
      descriptionKey: "admin.platformOps.sections.devicesDesc",
      status: "architecture",
    },
    {
      id: "subscription",
      path: `${PLATFORM_OPS_BASE}/subscription`,
      labelKey: "admin.platformOps.sections.subscription",
      descriptionKey: "admin.platformOps.sections.subscriptionDesc",
      status: "architecture",
    },
    {
      id: "jobs",
      path: `${PLATFORM_OPS_BASE}/jobs`,
      labelKey: "admin.platformOps.sections.jobs",
      descriptionKey: "admin.platformOps.sections.jobsDesc",
      status: "architecture",
    },
    {
      id: "events",
      path: `${PLATFORM_OPS_BASE}/events`,
      labelKey: "admin.platformOps.sections.events",
      descriptionKey: "admin.platformOps.sections.eventsDesc",
      status: "architecture",
    },
    {
      id: "audit",
      path: `${PLATFORM_OPS_BASE}/audit`,
      labelKey: "admin.platformOps.sections.audit",
      descriptionKey: "admin.platformOps.sections.auditDesc",
      status: "reserved",
    },
    {
      id: "diagnostics",
      path: `${PLATFORM_OPS_BASE}/diagnostics`,
      labelKey: "admin.platformOps.sections.diagnostics",
      descriptionKey: "admin.platformOps.sections.diagnosticsDesc",
      status: "architecture",
    },
  ] as const;

export function getPlatformOpsSection(
  id: PlatformOpsSectionId
): PlatformOpsSectionDef {
  const found = PLATFORM_OPS_SECTION_DEFINITIONS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown platform ops section: ${id}`);
  return found;
}

export function parsePlatformOpsSection(
  pathname: string
): PlatformOpsSectionId {
  if (pathname === PLATFORM_OPS_BASE || pathname === `${PLATFORM_OPS_BASE}/`) {
    return "overview";
  }
  for (const section of PLATFORM_OPS_SECTION_DEFINITIONS) {
    if (section.id === "overview") continue;
    if (
      pathname === section.path ||
      pathname.startsWith(`${section.path}/`)
    ) {
      return section.id;
    }
  }
  return "overview";
}

export function isPlatformOpsPath(pathname: string): boolean {
  return (
    pathname === PLATFORM_OPS_BASE ||
    pathname.startsWith(`${PLATFORM_OPS_BASE}/`)
  );
}

export {
  type PlatformOpsProductStatus,
  isPlatformOpsOperationallyLive,
  platformOpsStatusBadgeTone,
  platformOpsStatusLabelKey,
};
