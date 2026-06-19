/**
 * UX-DASHBOARD-REFACTOR-1B/1C + UX-DASHBOARD-AUDIT-1A + UX-DASHBOARD-REFACTOR-1D
 * Restaurant dashboard visual tokens — Admin Console shell inheritance.
 */
import { cn } from "@/lib/utils";

/** Restaurant workspace uses LTR shell geometry like Admin (sidebar physical left). */
export const RESTAURANT_WORKSPACE_DIR = "ltr" as const;

const pricingPanelBase =
  "rounded-xl border border-cyan-500/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-none";

/** Subtle cyan hover glow — Pricing / Admin reference (I-03, I-08). */
export const restaurantHoverGlow =
  "transition-all duration-200 hover:border-cyan-400/30 hover:shadow-sm hover:shadow-cyan-500/10";

/** Shared motion timing (I-05). */
export const restaurantMotion = "transition-all duration-200";

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
export const restaurantRevenueValueClass =
  "bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 bg-clip-text text-transparent";

export const restaurantOperationalValueClass = "text-white";

export const restaurantDash = {
  /** Admin OperationsShell background */
  shell: "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
  /** Admin-aligned main content container */
  main: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
  stack: "flex flex-col gap-6 sm:gap-8",
  section: "flex flex-col gap-3 sm:gap-4",
  sectionTitle: "text-base font-semibold tracking-tight text-white sm:text-lg",
  sectionSub: "max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm",
  kpiGrid: "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:gap-3",
  kpiGridWide: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4",
  card: cn(pricingPanelBase, "overflow-hidden", restaurantHoverGlow),
  kpiCard: cn(pricingPanelBase, restaurantHoverGlow),
  panel: cn(pricingPanelBase, "overflow-hidden"),
  panelInset: "rounded-xl border border-cyan-500/15 bg-slate-900/40",
  hero: cn(
    pricingPanelBase,
    "border-cyan-500/25 bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-slate-900/90 p-4 sm:p-5"
  ),
  listPanel: cn(pricingPanelBase, "divide-y divide-cyan-500/15 overflow-hidden"),
  emptyPanel: cn(pricingPanelBase, "px-4 py-8 text-center sm:px-6"),
  errorPanel: cn(pricingPanelBase, "flex flex-col items-center gap-3 px-4 py-8 text-center sm:px-6"),
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

/** Semantic accents — admin palette. */
export const restaurantSemantic = {
  iconMuted: "text-slate-400",
  iconNeutral: "text-slate-400",
  iconInfo: "text-cyan-400",
  iconSuccess: "text-green-400",
  iconWarning: "text-orange-400",
  iconAccent: "text-violet-400",
  iconDanger: "text-red-400",
  rowWarning: "border-orange-500/25 bg-orange-500/5",
  rowSuccess: "border-green-500/25 bg-green-500/5",
  rowNeutral: "border-slate-700/40 bg-slate-900/30",
  badgeOccupied: "border-green-500/30 bg-green-500/10 text-green-400",
  badgeAvailable: "border-slate-600/40 bg-slate-800/50 text-slate-300",
  valuePositive: "text-green-400",
  valueMuted: "text-slate-400",
} as const;

export type RestaurantKpiTone = "neutral" | "info" | "success" | "warning" | "accent";

export type RestaurantKpiValueVariant = "operational" | "revenue";

export type RestaurantActivityIconVariant = "success" | "info" | "neutral" | "accent" | "muted";

/** Activity / timeline icon containers (I-01). */
export function restaurantActivityIconClass(
  variant: RestaurantActivityIconVariant = "neutral"
): string {
  const tone: Record<RestaurantActivityIconVariant, string> = {
    success: "border-green-500/30 bg-green-500/10 text-green-400",
    info: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
    neutral: "border-slate-600/40 bg-slate-800/50 text-slate-300",
    accent: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    muted: "border-slate-700/40 bg-slate-900/40 text-slate-400",
  };
  return cn(restaurantDash.iconContainerSm, tone[variant]);
}

export function restaurantKpiIconClass(tone: RestaurantKpiTone = "neutral"): string {
  const map: Record<RestaurantKpiTone, string> = {
    neutral: restaurantSemantic.iconNeutral,
    info: restaurantSemantic.iconInfo,
    success: restaurantSemantic.iconSuccess,
    warning: restaurantSemantic.iconWarning,
    accent: restaurantSemantic.iconAccent,
  };
  return map[tone];
}

export function legacyToneToSemantic(
  tone: "default" | "primary" | "accent" | "emerald" | "amber"
): RestaurantKpiTone {
  if (tone === "primary") return "info";
  if (tone === "accent") return "accent";
  if (tone === "emerald") return "success";
  if (tone === "amber") return "warning";
  return "neutral";
}
