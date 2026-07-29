/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Layout tokens — facades over adminDash / semantic panel (no new colors).
 */

import { SEMANTIC_KPI_GRID } from "@/design-system/semantic-card";
import { adminDash } from "@/components/admin/layout/adminDashStyles";

export type PlatformOpsHeroColumns = 2 | 4 | 6 | 8;

export const PLATFORM_OPS_UI = {
  workspace: adminDash.opsWorkspace,
  sections: adminDash.consoleSections,
  sectionDensity: "console" as const,
  heroGrid: {
    2: "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3",
    4: SEMANTIC_KPI_GRID.quad,
    6: "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 xl:gap-3",
    8: "grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-4 xl:grid-cols-8 xl:gap-3",
  } satisfies Record<PlatformOpsHeroColumns, string>,
  moduleTile: adminDash.card,
  metaText: "text-[11px] text-cyan-400/70",
  lastUpdated: "text-[11px] tabular-nums text-cyan-300/70",
} as const;

