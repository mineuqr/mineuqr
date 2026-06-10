/**
 * Admin dashboard presentation tokens (UX-REFINE-1B).
 * Visual authority: Pricing page (`pages/Pricing.tsx`) — reuse only, no new language.
 */
import { cn } from "@/lib/utils";

const pricingCardBase =
  "rounded-xl border border-cyan-500/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-none";

export const adminDash = {
  /** Pricing page shell background */
  shell: "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
  /** Pricing page nav */
  nav: "sticky top-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl",
  navInner:
    "mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8",
  main: "mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
  /** Pricing title hierarchy (scaled for console) */
  pageTitle: "text-2xl font-bold tracking-tight text-white sm:text-3xl",
  pageTitleCompact: "text-lg font-bold tracking-tight text-white sm:text-xl",
  pageSubtitle: "mt-1 text-sm text-cyan-300",
  pageSubtitleCompact: "mt-0.5 text-xs text-cyan-300/90",
  sectionTitle: "text-lg font-bold text-white sm:text-xl",
  sectionTitleCompact: "text-sm font-semibold text-white",
  sectionSub: "mt-1 text-xs text-cyan-300/80 sm:text-sm",
  opsShellMax: "mx-auto w-full max-w-5xl",
  opsWorkspace: "space-y-1.5",
  opsToolbar: "p-2 sm:p-2.5",
  opsTabList:
    "grid h-8 w-fit max-w-full grid-cols-3 self-start rounded-lg border border-cyan-500/30 bg-slate-800/50 p-0.5",
  opsTable: "w-full table-fixed",
  opsTableWrap: "hidden lg:block",
  opsTableHead:
    "px-2.5 py-1 text-start text-[11px] font-medium uppercase tracking-wide text-slate-400",
  opsTableCell: "px-2.5 py-1.5 text-xs align-middle",
  opsTableTruncate: "max-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
  opsTableActionsCell: "w-[1%] whitespace-nowrap px-1.5 py-1",
  opsBadge: "text-[10px] px-1.5 py-0 font-medium leading-tight",
  opsListStrip: "border-b border-cyan-500/20 bg-slate-800/40 px-2.5 py-1.5",
  opsPanelHead:
    "border-b border-cyan-500/20 bg-slate-800/40 px-2.5 py-1.5 text-xs font-semibold text-white",
  opsPanelHeadSecondary:
    "border-b border-cyan-500/15 bg-slate-800/25 px-2.5 py-1 text-[11px] font-medium text-slate-400",
  opsIdentityName: "truncate text-sm font-semibold leading-tight text-white",
  opsIdentityEmail:
    "truncate border-t border-cyan-500/15 pt-1 text-[11px] leading-tight text-slate-400",
  opsIdentityRole: "flex flex-wrap items-center gap-1 border-t border-cyan-500/15 pt-1",
  opsListRow:
    "flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/15 px-3 py-2.5 last:border-b-0 hover:bg-slate-800/30",
  opsInput: "h-8 text-sm border-cyan-500/20 bg-slate-900/50",
  opsSelect: "h-8 text-sm border-cyan-500/20 bg-slate-900/50",
  /** Pricing plan-card pattern — interactive */
  card: cn(pricingCardBase, "transition-all duration-300 hover:border-cyan-400"),
  kpiCard: cn(pricingCardBase, "gap-0 py-0 transition-all duration-300 hover:border-cyan-400"),
  /** Pricing plan-card pattern — static container */
  operationsCard: cn(pricingCardBase, "overflow-hidden"),
  /** Pricing feature-icon treatment */
  iconContainer:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400",
  /** Pricing current-plan badge gradient */
  brandIcon:
    "flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-900",
  opBtn: "h-8 min-h-8 shrink-0 text-xs",
  opIconBtn: "h-6 w-6 min-h-6 shrink-0 p-0 text-xs",
  actionPrimary: "",
  actionSecondary: "",
  /** Pricing dialog surfaces */
  dialogContent:
    "bg-slate-800 border-slate-700 max-w-md w-[calc(100vw-2rem)] sm:w-full max-h-[min(90vh,720px)] overflow-y-auto",
} as const;

/** Semantic accents — Pricing palette only (cyan, orange, green, red, slate). */
export const adminSemantic = {
  statusActive: "bg-green-600/90 text-white border-transparent",
  statusTrial: "bg-cyan-500 text-slate-900 border-transparent",
  statusWarning: "bg-orange-500/90 text-white border-transparent",
  statusDanger: "bg-red-600/90 text-white border-transparent",
  cardAccentActive: "border-green-500/30 bg-green-500/5",
  cardAccentTrial: "border-cyan-500/30 bg-cyan-500/5",
  cardAccentWarning: "border-orange-500/30 bg-orange-500/5",
  cardAccentDanger: "border-red-500/30 bg-red-500/5",
  cardAccentNeutral: "border-cyan-500/20 bg-slate-800/30",
  iconActive: "text-green-400",
  iconTrial: "text-cyan-400",
  iconWarning: "text-orange-400",
  iconDanger: "text-red-400",
  iconMuted: "text-slate-400",
} as const;

/** Outline action buttons — Pricing cyan primary, semantic status colors only. */
export const adminActionBtn = {
  primary: "border-cyan-500/30 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-500/10",
  success: "border-green-500/30 text-green-400 hover:bg-green-500/10",
  warning: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10",
  danger: "border-red-500/30 text-red-400 hover:bg-red-500/10",
} as const;
