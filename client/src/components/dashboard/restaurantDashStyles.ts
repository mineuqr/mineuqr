/**
 * UX-DASHBOARD-REFACTOR-1B/1C — restaurant dashboard visual tokens.
 * Admin palette: Deep Navy, Slate, Cyan Accent, Orange Warning, Red Danger, Green Success.
 */
import { cn } from "@/lib/utils";

const panelBase =
  "rounded-xl border border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-none";

/** Pricing-page revenue emphasis (vertical orange gradient). */
export const restaurantRevenueValueClass =
  "bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 bg-clip-text text-transparent";

export const restaurantOperationalValueClass = "text-white";

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
  /** Admin-aligned sidebar shell */
  sidebar:
    "fixed inset-y-0 end-0 z-40 flex w-[min(18rem,92vw)] flex-col border-s border-cyan-500/20 bg-slate-950/98 backdrop-blur-xl shadow-2xl lg:w-[18rem]",
  sidebarBrand:
    "flex h-14 w-full shrink-0 items-center gap-3 border-b border-cyan-500/30 px-4 text-start transition hover:bg-slate-900/50",
  sidebarNav: "flex-1 overflow-y-auto overscroll-contain px-3 py-4",
  sidebarSectionLabel:
    "px-2 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 first:pt-2",
  sidebarNavBtn:
    "relative flex h-9 w-full min-h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-all duration-150",
  sidebarNavIcon:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors [&_svg]:size-4",
  sidebarNavIconActive: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/25",
  sidebarNavIconIdle: "bg-slate-900/80 text-slate-400 group-hover:bg-slate-800/80 group-hover:text-slate-200",
  sidebarNavActive:
    "bg-slate-800/90 font-semibold text-white ring-1 ring-inset ring-cyan-500/20",
  sidebarNavIdle: "group text-slate-400 hover:bg-slate-900/70 hover:text-slate-100",
  sidebarFooter: "shrink-0 space-y-2 border-t border-cyan-500/20 px-3 py-3",
  sidebarFooterHint: "px-2 text-[11px] text-slate-500",
  /** Admin-aligned top bar */
  topBar:
    "sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-cyan-500/20 bg-slate-950/90 px-4 backdrop-blur-xl sm:px-6",
  mainColumn: "flex min-h-screen min-w-0 flex-1 flex-col lg:me-[18rem]",
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
