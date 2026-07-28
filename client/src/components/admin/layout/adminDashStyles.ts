/**
 * Admin dashboard presentation tokens (UX-REFINE-1B).
 * + SEMANTIC-CARD-DESIGN-SYSTEM-1 — panel chrome owned by design-system.
 * + SEMANTIC-STATUS-BADGE-SYSTEM-1 — filled status pills owned by badge system.
 */
import {
  SEMANTIC_PANEL_BASE,
  SEMANTIC_SHELL,
  SEMANTIC_TONE,
} from "@/design-system/semantic-card";
import {
  semanticBadgeHoverClass,
  semanticBadgeToneClass,
} from "@/design-system/semantic-badge";
import { cn } from "@/lib/utils";

/** ADMIN-RTL-WORKSPACE — operator console LTR geometry (shell + portaled modals). */
export const ADMIN_WORKSPACE_DIR = "ltr" as const;

const pricingCardBase = SEMANTIC_PANEL_BASE;

export const adminDash = {
  /** Pricing page shell background */
  shell: SEMANTIC_SHELL,
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
  /** UX-REFINE-1D — Operations-aligned console rhythm */
  opsShellMax: "mx-auto w-full max-w-5xl",
  opsWorkspace: "space-y-1.5",
  /** Multi-section pages (commercial, analytics) — between ops and legacy dashboard */
  consoleSections: "space-y-3",
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

/**
 * Admin status accents — filled pills owned by Semantic Badge System;
 * icons/rows derive from SEMANTIC_TONE.
 */
export const adminSemantic = {
  statusActive: cn(
    semanticBadgeToneClass("success", "filled"),
    semanticBadgeHoverClass("success", "filled")
  ),
  statusTrial: cn(
    semanticBadgeToneClass("info", "filled"),
    semanticBadgeHoverClass("info", "filled")
  ),
  statusWarning: cn(
    semanticBadgeToneClass("warning", "filled"),
    semanticBadgeHoverClass("warning", "filled")
  ),
  statusDanger: cn(
    semanticBadgeToneClass("danger", "filled"),
    semanticBadgeHoverClass("danger", "filled")
  ),
  cardAccentActive: SEMANTIC_TONE.row.success,
  cardAccentTrial: SEMANTIC_TONE.row.info,
  cardAccentWarning: SEMANTIC_TONE.row.warning,
  cardAccentDanger: SEMANTIC_TONE.row.danger,
  cardAccentNeutral: "border-cyan-500/20 bg-slate-800/30",
  iconActive: SEMANTIC_TONE.icon.success,
  iconTrial: SEMANTIC_TONE.icon.info,
  iconWarning: SEMANTIC_TONE.icon.warning,
  iconDanger: SEMANTIC_TONE.icon.danger,
  iconMuted: SEMANTIC_TONE.icon.neutral,
} as const;

/** Outline action buttons — Pricing cyan primary, semantic status colors only. */
export const adminActionBtn = {
  primary: "border-cyan-500/30 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-500/10",
  success: "border-green-500/30 text-green-400 hover:bg-green-500/10",
  warning: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10",
  danger: "border-red-500/30 text-red-400 hover:bg-red-500/10",
} as const;
