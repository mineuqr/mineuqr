/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Panel chrome SSOT — shared by restaurant, admin, and semantic cards.
 * Presentation only. Do not invent a second cyan-panel language.
 */
import { cn } from "@/lib/utils";

/** Pricing / Admin / Restaurant cyan panel base (one string, one owner). */
export const SEMANTIC_PANEL_BASE =
  "rounded-xl border border-cyan-500/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-none";

export const SEMANTIC_HOVER_GLOW =
  "transition-all duration-200 hover:border-cyan-400/30 hover:shadow-sm hover:shadow-cyan-500/10";

export const SEMANTIC_MOTION = "transition-all duration-200";

export const SEMANTIC_SHELL =
  "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900";

export const semanticPanel = {
  base: SEMANTIC_PANEL_BASE,
  hoverGlow: SEMANTIC_HOVER_GLOW,
  motion: SEMANTIC_MOTION,
  shell: SEMANTIC_SHELL,
  card: cn(SEMANTIC_PANEL_BASE, "overflow-hidden", SEMANTIC_HOVER_GLOW),
  kpi: cn(SEMANTIC_PANEL_BASE, SEMANTIC_HOVER_GLOW),
  kpiPrimary: cn(
    SEMANTIC_PANEL_BASE,
    SEMANTIC_HOVER_GLOW,
    "border-amber-500/35 bg-gradient-to-b from-slate-800/70 to-slate-900/80 sm:min-h-[7.5rem]"
  ),
  kpiSupporting: cn(
    "rounded-xl border border-cyan-500/20 bg-slate-900/40 shadow-none",
    SEMANTIC_HOVER_GLOW
  ),
  empty: cn(SEMANTIC_PANEL_BASE, "px-4 py-10 text-center sm:px-8 sm:py-12"),
  error: cn(
    SEMANTIC_PANEL_BASE,
    "flex flex-col items-center gap-3 px-4 py-10 text-center sm:px-8"
  ),
  inset: "rounded-xl border border-cyan-500/15 bg-slate-900/40",
  hero: cn(
    SEMANTIC_PANEL_BASE,
    "border-cyan-500/25 bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-slate-900/90 p-4 sm:p-5"
  ),
  radius: {
    card: "rounded-xl",
    executive: "rounded-2xl",
  },
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
} as const;
