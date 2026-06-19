/**
 * UX-DASHBOARD-REFACTOR-1B — restaurant dashboard visual tokens.
 * Aligned with admin console (adminDashStyles) with reduced cyan and semantic hierarchy.
 */
import { cn } from "@/lib/utils";

const panelBase =
  "rounded-xl border border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-none";

export const restaurantDash = {
  stack: "flex flex-col gap-6 sm:gap-8",
  section: "flex flex-col gap-3 sm:gap-4",
  sectionTitle: "text-base font-semibold tracking-tight text-white sm:text-lg",
  sectionSub: "max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm",
  kpiGrid: "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:gap-3",
  kpiGridWide: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4",
  card: cn(panelBase, "overflow-hidden"),
  kpiCard: cn(panelBase, "transition-colors duration-200 hover:border-slate-600/60"),
  panel: cn(panelBase, "overflow-hidden"),
  panelInset: "border-slate-700/40 bg-slate-900/40",
  hero: cn(
    panelBase,
    "border-slate-700/45 bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-slate-900/90 p-4 sm:p-5"
  ),
  listPanel: cn(panelBase, "divide-y divide-slate-700/40 overflow-hidden"),
  emptyPanel: cn(panelBase, "px-4 py-8 text-center sm:px-6"),
  errorPanel: cn(panelBase, "flex flex-col items-center gap-3 px-4 py-8 text-center sm:px-6"),
  itemRow: "border-slate-700/35 bg-slate-900/30",
  toolbarBtn:
    "border-slate-600/50 bg-slate-900/50 text-slate-200 hover:border-slate-500 hover:bg-slate-800/60",
  toolbarBtnActive: "border-slate-500 bg-slate-800 text-white",
} as const;

/** Semantic accents — green success, orange warning, violet accent, slate neutral (minimal cyan). */
export const restaurantSemantic = {
  iconMuted: "text-slate-400",
  iconNeutral: "text-slate-400",
  iconInfo: "text-slate-300",
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

/** Map legacy DashboardStatCard tones to semantic KPI tones. */
export function legacyToneToSemantic(
  tone: "default" | "primary" | "accent" | "emerald" | "amber"
): RestaurantKpiTone {
  if (tone === "primary") return "info";
  if (tone === "accent") return "accent";
  if (tone === "emerald") return "success";
  if (tone === "amber") return "warning";
  return "neutral";
}
