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
  moduleGrid: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
  ownershipList: "mt-3 list-disc space-y-1 ps-5 text-sm text-cyan-200/80",
  metaText: "text-[11px] text-cyan-400/70",
  lastUpdated: "text-[11px] tabular-nums text-cyan-300/70",
  /** Section nav chrome — structure owned by IA; styles centralized here. */
  sectionNav: {
    list: "flex flex-wrap gap-1.5",
    link: "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
    linkActive: "border-cyan-400/50 bg-cyan-500/15 text-cyan-100",
    linkIdle:
      "border-cyan-500/20 bg-slate-800/40 text-cyan-200/80 hover:border-cyan-400/40 hover:bg-slate-800/70 hover:text-cyan-100",
  },
} as const;

