/** Shared admin dashboard presentation tokens (ADM-1B). */
export const adminDash = {
  shell: "min-h-screen cinematic-bg",
  shellGlow:
    "pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.65_0.18_195/12%),transparent)]",
  nav: "sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl",
  navInner: "mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8",
  main: "mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
  pageTitle: "text-2xl font-semibold tracking-tight text-foreground sm:text-3xl",
  pageTitleCompact: "text-lg font-semibold tracking-tight text-foreground sm:text-xl",
  pageSubtitle: "mt-1 text-sm text-muted-foreground",
  pageSubtitleCompact: "mt-0.5 text-xs text-muted-foreground",
  sectionTitle: "text-lg font-semibold text-foreground sm:text-xl",
  sectionTitleCompact: "text-sm font-semibold text-foreground",
  sectionSub: "mt-1 text-xs text-muted-foreground sm:text-sm",
  /** UX-REFINE-1A — operations content width (SaaS console, not full-bleed) */
  opsShellMax: "mx-auto w-full max-w-5xl",
  /** UX-REFINE-1 — operations workspace density */
  opsWorkspace: "space-y-1.5",
  opsToolbar: "p-2 sm:p-2.5",
  opsTabList: "grid h-8 w-fit max-w-full grid-cols-3 self-start",
  opsTable: "w-full table-fixed",
  opsTableWrap: "hidden lg:block",
  opsTableHead: "px-2.5 py-1 text-start text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
  opsTableCell: "px-2.5 py-1.5 text-xs align-middle",
  opsTableTruncate: "max-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
  opsTableActionsCell: "w-[1%] whitespace-nowrap px-1.5 py-1",
  opsBadge: "text-[10px] px-1.5 py-0 font-medium leading-tight",
  opsListStrip: "border-b border-border/60 bg-muted/15 px-2.5 py-1.5",
  opsPanelHead: "border-b border-border/50 bg-muted/10 px-2.5 py-1.5 text-xs font-semibold text-foreground",
  opsPanelHeadSecondary:
    "border-b border-border/40 bg-muted/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
  /** REBUILD-3B prep — account identity column hierarchy */
  opsIdentityName: "truncate text-sm font-semibold leading-tight text-foreground",
  opsIdentityEmail:
    "truncate border-t border-border/30 pt-1 text-[11px] leading-tight text-muted-foreground",
  opsIdentityRole: "flex flex-wrap items-center gap-1 border-t border-border/30 pt-1",
  opsListRow: "flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5 last:border-b-0 hover:bg-muted/20",
  opsInput: "h-8 text-sm",
  opsSelect: "h-8 text-sm",
  card: "rounded-xl border border-border/50 bg-card/40 shadow-sm backdrop-blur-sm",
  kpiCard: "rounded-xl border border-border/50 bg-card/40 shadow-sm backdrop-blur-sm",
  operationsCard: "rounded-xl border border-border/50 bg-card/40 shadow-sm overflow-hidden",
  /** Consistent operational button sizing */
  opBtn: "h-8 min-h-8 shrink-0 text-xs",
  opIconBtn: "h-6 w-6 min-h-6 shrink-0 p-0 text-xs",
  actionPrimary: "",
  actionSecondary: "",
  /** Scroll-safe dialog content for mobile */
  dialogContent:
    "bg-card border-border max-w-md w-[calc(100vw-2rem)] sm:w-full max-h-[min(90vh,720px)] overflow-y-auto",
} as const;

/** Dark-mode-safe outline action buttons for admin tables/cards. */
export const adminActionBtn = {
  primary: "border-primary/50 text-primary hover:bg-primary/10",
  info: "border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10",
  success: "border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10",
  warning: "border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
  danger: "border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10",
  teal: "border-teal-500/50 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10",
} as const;
