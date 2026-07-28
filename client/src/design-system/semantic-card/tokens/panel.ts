/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1 + SEMANTIC-CARD-VISUAL-CONSISTENCY-1
 * + PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * + SEMANTIC-CARD-PREMIUM-INTERACTION-1
 * Panel chrome + KPI grid SSOT — Landing / Dashboard golden visual reference.
 * Presentation only. Do not invent a second cyan-panel language.
 */
import { cn } from "@/lib/utils";
import {
  SEMANTIC_FOCUS_PREMIUM,
  SEMANTIC_HOVER_PREMIUM,
  SEMANTIC_MOTION_PREMIUM,
  SEMANTIC_SURFACE_PREMIUM,
} from "./interaction";

/**
 * Pricing / Admin / Restaurant cyan panel base (one string, one owner).
 * `.semantic-card` opts into premium lighting layers (index.css).
 */
export const SEMANTIC_PANEL_BASE = cn(
  SEMANTIC_SURFACE_PREMIUM,
  "rounded-xl border border-cyan-500/40 bg-gradient-to-b from-slate-800/55 to-slate-900/55 shadow-none"
);

/** @deprecated Prefer SEMANTIC_HOVER_PREMIUM — kept as facade alias. */
export const SEMANTIC_HOVER_GLOW = SEMANTIC_HOVER_PREMIUM;

/** @deprecated Prefer SEMANTIC_MOTION_PREMIUM — kept as facade alias. */
export const SEMANTIC_MOTION = SEMANTIC_MOTION_PREMIUM;

export const SEMANTIC_SHELL =
  "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900";

/** Neutralize shadcn Card defaults (py-6 gap-6 shadow-sm) on KPI shells. */
const KPI_CARD_RESET = "gap-0 py-0 shadow-none";

/**
 * Canonical KPI / executive grids — Reporting golden rhythm.
 * Features must not invent parallel grid gap/column systems for metric cards.
 */
export const SEMANTIC_KPI_GRID = {
  /** Dense ops strip (≤5 metrics) — Settlement / Operational Snapshot */
  dense: "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:gap-3",
  /** Secondary pair / duo — Reporting financial strips (golden) */
  secondary: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4",
  /** Supporting — denser, less visual weight */
  supporting: "grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-2 lg:gap-3",
  /** Workspace / admin quad (4 metrics) */
  quad: "grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 xl:gap-3",
  /** Insight trio */
  trio: "grid grid-cols-1 gap-3 sm:grid-cols-3",
  /** Primary hero — one dominant metric */
  primary: "grid grid-cols-1 gap-3",
  /** Wide 3-col (executive-adjacent KPI bands) */
  wide: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4",
  /** Executive category grid (SemanticExecutiveGrid) */
  executive:
    "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 lg:gap-4 2xl:gap-5",
} as const;

export const semanticPanel = {
  base: SEMANTIC_PANEL_BASE,
  hoverGlow: SEMANTIC_HOVER_GLOW,
  motion: SEMANTIC_MOTION,
  shell: SEMANTIC_SHELL,
  card: cn(SEMANTIC_PANEL_BASE, "group overflow-hidden", SEMANTIC_HOVER_GLOW),
  kpi: cn(SEMANTIC_PANEL_BASE, "group", SEMANTIC_HOVER_GLOW, KPI_CARD_RESET),
  kpiPrimary: cn(
    SEMANTIC_PANEL_BASE,
    "group semantic-card-kpi-primary",
    SEMANTIC_HOVER_GLOW,
    KPI_CARD_RESET,
    "border-amber-500/35 bg-gradient-to-b from-slate-800/70 to-slate-900/80 sm:min-h-[7.5rem]"
  ),
  kpiSupporting: cn(
    SEMANTIC_SURFACE_PREMIUM,
    "group rounded-xl border border-cyan-500/28 bg-slate-900/45 shadow-none",
    SEMANTIC_HOVER_GLOW,
    KPI_CARD_RESET
  ),
  empty: cn(SEMANTIC_PANEL_BASE, "px-4 py-10 text-center sm:px-8 sm:py-12"),
  error: cn(
    SEMANTIC_PANEL_BASE,
    "flex flex-col items-center gap-3 px-4 py-10 text-center sm:px-8"
  ),
  inset: cn(
    SEMANTIC_SURFACE_PREMIUM,
    "rounded-xl border border-cyan-500/22 bg-slate-900/45"
  ),
  hero: cn(
    SEMANTIC_PANEL_BASE,
    "group border-cyan-500/35 bg-gradient-to-br from-slate-800/65 via-slate-900/75 to-slate-900/90 p-4 sm:p-5",
    SEMANTIC_HOVER_GLOW
  ),
  radius: {
    card: "rounded-xl",
    executive: "rounded-2xl",
  },
  focusRing: SEMANTIC_FOCUS_PREMIUM,
} as const;
