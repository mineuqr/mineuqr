/**
 * UX-DASHBOARD-REFACTOR-1B/1C + UX-DASHBOARD-AUDIT-1A + UX-DASHBOARD-REFACTOR-1D
 * + SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Restaurant dashboard visual tokens — panel/tone owned by design-system.
 */
import {
  SEMANTIC_HOVER_GLOW,
  SEMANTIC_KPI_GRID,
  SEMANTIC_MOTION,
  SEMANTIC_PANEL_BASE,
  SEMANTIC_SHELL,
  SEMANTIC_TONE,
  SEMANTIC_VALUE,
  legacyToneToSemanticTone,
  semanticToneIconClass,
  type SemanticTone,
} from "@/design-system/semantic-card";
import { cn } from "@/lib/utils";

/** Restaurant workspace uses LTR shell geometry like Admin (sidebar physical left). */
export const RESTAURANT_WORKSPACE_DIR = "ltr" as const;

const pricingPanelBase = SEMANTIC_PANEL_BASE;

/** Subtle cyan hover glow — Pricing / Admin reference (I-03, I-08). */
export const restaurantHoverGlow = SEMANTIC_HOVER_GLOW;

/** Shared motion timing (I-05). */
export const restaurantMotion = SEMANTIC_MOTION;

/** Icon color hierarchy (I-06). */
export const restaurantIconColor = {
  inactive: "text-slate-400",
  hover: "group-hover:text-cyan-400",
  active: "text-white",
} as const;

/** Admin-aligned icon container base (I-02). */
const iconContainerBase = cn(
  "flex shrink-0 items-center justify-center rounded-xl border bg-slate-900/60",
  restaurantMotion
);

/** Pricing-page revenue emphasis (vertical orange gradient). */
export const restaurantRevenueValueClass = SEMANTIC_VALUE.revenue;

export const restaurantOperationalValueClass = SEMANTIC_VALUE.operational;

/** REPORTING-VISUAL-HIERARCHY-1 — Executive primary value size. */
export const restaurantRevenueValueClassPrimary = SEMANTIC_VALUE.revenuePrimary;

export const restaurantDash = {
  /** Admin OperationsShell background */
  shell: SEMANTIC_SHELL,
  /** Admin-aligned main content container */
  main: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
  stack: "flex flex-col gap-6 sm:gap-8",
  /** Extra space between decision bands */
  bandStack: "flex flex-col gap-5 sm:gap-7",
  section: "flex flex-col gap-3 sm:gap-4 scroll-mt-24",
  sectionTitle: "text-base font-semibold tracking-tight text-white sm:text-lg",
  sectionSub: "max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm",
  bandTitle: "text-xs font-semibold uppercase tracking-wide text-slate-300 sm:text-sm",
  bandHint: "text-[11px] text-slate-500 sm:text-xs",
  /** Facade → SEMANTIC_KPI_GRID (VISUAL-CONSISTENCY-1) */
  kpiGrid: SEMANTIC_KPI_GRID.dense,
  kpiGridWide: SEMANTIC_KPI_GRID.wide,
  kpiGridPrimary: SEMANTIC_KPI_GRID.primary,
  kpiGridSecondary: SEMANTIC_KPI_GRID.secondary,
  kpiGridSupporting: SEMANTIC_KPI_GRID.supporting,
  kpiGridQuad: SEMANTIC_KPI_GRID.quad,
  kpiGridTrio: SEMANTIC_KPI_GRID.trio,
  card: cn(pricingPanelBase, "overflow-hidden", restaurantHoverGlow),
  kpiCard: cn(pricingPanelBase, restaurantHoverGlow, "gap-0 py-0"),
  kpiCardPrimary: cn(
    pricingPanelBase,
    restaurantHoverGlow,
    "gap-0 py-0",
    "border-amber-500/35 bg-gradient-to-b from-slate-800/70 to-slate-900/80 sm:min-h-[7.5rem]"
  ),
  kpiCardSecondary: cn(pricingPanelBase, restaurantHoverGlow, "gap-0 py-0"),
  kpiCardSupporting: cn(
    "rounded-xl border border-cyan-500/20 bg-slate-900/40 shadow-none gap-0 py-0",
    restaurantHoverGlow
  ),
  /** Financial relationship strip */
  flowStrip: cn(
    pricingPanelBase,
    "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
  ),
  flowStep: "flex min-w-0 flex-1 flex-col gap-0.5",
  flowArrow: "hidden text-slate-500 sm:block",
  panel: cn(pricingPanelBase, "overflow-hidden"),
  panelInset: "rounded-xl border border-cyan-500/15 bg-slate-900/40",
  chartSupporting: cn(pricingPanelBase, "overflow-hidden opacity-95"),
  hero: cn(
    pricingPanelBase,
    "border-cyan-500/25 bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-slate-900/90 p-4 sm:p-5"
  ),
  listPanel: cn(pricingPanelBase, "divide-y divide-cyan-500/15 overflow-hidden"),
  emptyPanel: cn(pricingPanelBase, "px-4 py-10 text-center sm:px-8 sm:py-12"),
  errorPanel: cn(pricingPanelBase, "flex flex-col items-center gap-3 px-4 py-10 text-center sm:px-8"),
  itemRow: cn(
    "rounded-xl border border-cyan-500/15 bg-slate-900/30",
    restaurantMotion,
    "hover:border-cyan-400/25 hover:shadow-sm hover:shadow-cyan-500/10"
  ),
  /** Pricing feature-icon treatment (I-01). */
  iconContainer: cn(iconContainerBase, "h-9 w-9 border-cyan-500/20 text-cyan-400 [&_svg]:size-4"),
  iconContainerSm: cn(iconContainerBase, "h-8 w-8 border-cyan-500/20 [&_svg]:size-4"),
  iconContainerLg: cn(iconContainerBase, "h-10 w-10 border-cyan-500/20 [&_svg]:size-5"),
  brandIcon:
    "flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-900 [&_svg]:size-4",
  toolbarBtn: cn(
    "border-cyan-500/30 bg-slate-900/50 text-slate-200",
    restaurantHoverGlow,
    "hover:bg-cyan-500/10 hover:text-cyan-400"
  ),
  toolbarBtnActive: "border-cyan-400/40 bg-cyan-500/10 text-white shadow-sm shadow-cyan-500/10",
  topBarIconBtn: cn(
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent",
    restaurantIconColor.inactive,
    restaurantMotion,
    "hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-400 hover:shadow-sm hover:shadow-cyan-500/10"
  ),
  topBarGhostBtn: cn(
    "inline-flex items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-sm",
    restaurantIconColor.inactive,
    restaurantMotion,
    "hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-400 hover:shadow-sm hover:shadow-cyan-500/10"
  ),
  topBarProfileBtn: cn(
    "flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/60 px-2 py-1.5 sm:px-2.5",
    restaurantMotion,
    "hover:border-cyan-400/30 hover:shadow-sm hover:shadow-cyan-500/10"
  ),
  linkBtn: cn(
    "inline-flex h-8 items-center gap-1 text-sm",
    restaurantIconColor.inactive,
    restaurantMotion,
    "hover:text-cyan-400"
  ),
  actionGhostSuccess: cn(
    "h-7 shrink-0 px-2 text-xs text-green-400",
    restaurantMotion,
    "hover:bg-green-500/10 hover:text-green-300"
  ),
} as const;

/** Semantic accents — owned by design-system SEMANTIC_TONE (compatibility mirror). */
export const restaurantSemantic = {
  iconMuted: SEMANTIC_TONE.icon.neutral,
  iconNeutral: SEMANTIC_TONE.icon.neutral,
  iconInfo: SEMANTIC_TONE.icon.info,
  iconSuccess: SEMANTIC_TONE.icon.success,
  iconWarning: SEMANTIC_TONE.icon.warning,
  iconAccent: SEMANTIC_TONE.icon.accent,
  iconDanger: SEMANTIC_TONE.icon.danger,
  rowWarning: SEMANTIC_TONE.row.warning,
  rowSuccess: SEMANTIC_TONE.row.success,
  rowNeutral: SEMANTIC_TONE.row.neutral,
  badgeOccupied: SEMANTIC_TONE.badge.success,
  badgeAvailable: SEMANTIC_TONE.badge.neutral,
  valuePositive: SEMANTIC_TONE.value.success,
  valueMuted: SEMANTIC_TONE.value.neutral,
} as const;

export type RestaurantKpiTone = Exclude<SemanticTone, "danger"> | "neutral" | "info" | "success" | "warning" | "accent";

export type RestaurantKpiValueVariant = "operational" | "revenue";

export type RestaurantActivityIconVariant = "success" | "info" | "neutral" | "accent" | "muted";

/** Activity / timeline icon containers (I-01). */
export function restaurantActivityIconClass(
  variant: RestaurantActivityIconVariant = "neutral"
): string {
  const tone: Record<RestaurantActivityIconVariant, string> = {
    success: SEMANTIC_TONE.badge.success,
    info: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
    neutral: SEMANTIC_TONE.badge.neutral,
    accent: SEMANTIC_TONE.badge.accent,
    muted: "border-slate-700/40 bg-slate-900/40 text-slate-400",
  };
  return cn(restaurantDash.iconContainerSm, tone[variant]);
}

export function restaurantKpiIconClass(tone: RestaurantKpiTone = "neutral"): string {
  return semanticToneIconClass(tone);
}

export function legacyToneToSemantic(
  tone: "default" | "primary" | "accent" | "emerald" | "amber"
): RestaurantKpiTone {
  return legacyToneToSemanticTone(tone);
}
