/**
 * TABLE-PLATFORM-ADOPTION-1
 * Table surface tokens — single owner for directory/ledger chrome.
 * Presentation only. Responsive strategy owned here.
 */
import { cn } from "@/lib/utils";

/** Canonical responsive strategies */
export type SemanticTableResponsive = "dual" | "scroll";

/** Density */
export type SemanticTableDensity = "ops" | "ledger" | "comfortable";

/**
 * Dual = desktop table (≥lg) + feature-supplied mobile list.
 * Scroll = horizontal scroll at all breakpoints (reporting/billing).
 */
export const SEMANTIC_TABLE = {
  /** Outer stack */
  root: "flex w-full flex-col gap-3",

  /** Desktop table gate (dual responsive) */
  desktop: "hidden lg:block",

  /** Mobile list gate (dual responsive) */
  mobile: "lg:hidden",

  /** Horizontal scroll frame (scroll responsive + ledger) */
  scroll: "relative w-full overflow-x-auto rounded-xl border border-cyan-500/20",

  /** Ops directory table (admin) */
  opsTable: "w-full table-fixed text-sm",
  opsHead:
    "px-2.5 py-1 text-start text-[11px] font-medium uppercase tracking-wide text-slate-400",
  opsCell: "px-2.5 py-1.5 text-xs align-middle",
  opsTruncate: "max-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
  opsActions: "w-[1%] whitespace-nowrap px-1.5 py-1",
  opsRow:
    "border-b border-cyan-500/15 last:border-b-0 hover:bg-slate-800/30",

  /** Ledger / reporting table */
  ledgerTable: "w-full min-w-[640px] text-sm",
  ledgerTableNarrow: "w-full min-w-[480px] text-sm",
  ledgerHead:
    "border-b border-slate-700/60 text-xs uppercase tracking-wide text-slate-400",
  ledgerHeadCell: "px-3 py-2.5 text-start font-medium",
  ledgerCell: "px-3 py-2.5 align-middle text-slate-200",
  ledgerRow: "border-b border-slate-800/80 hover:bg-slate-900/40",

  /** Comfortable (billing Card tables) */
  comfortableTable: "w-full min-w-[560px] text-sm",
  comfortableHead: "border-b border-border/40 text-xs text-muted-foreground",
  comfortableHeadCell: "px-3 py-2 text-start font-medium",
  comfortableCell: "px-3 py-2.5 align-middle",
  comfortableRow: "border-b border-border/30 last:border-0",

  /** Toolbar / filters strip */
  toolbar:
    "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
  filters: "flex flex-wrap items-center gap-2",

  /** Pagination bar */
  pagination:
    "flex flex-wrap items-center justify-between gap-2 border-t border-cyan-500/15 pt-3 text-sm text-slate-400",

  /** Action cell cluster */
  actions: "inline-flex items-center justify-end gap-1",

  /** Selection checkbox cell */
  selectCell: "w-10 px-2 align-middle",
} as const;

export function semanticTableClass(
  density: SemanticTableDensity = "ops"
): string {
  if (density === "ledger") return SEMANTIC_TABLE.ledgerTable;
  if (density === "comfortable") return SEMANTIC_TABLE.comfortableTable;
  return SEMANTIC_TABLE.opsTable;
}

export function semanticTableHeadClass(
  density: SemanticTableDensity = "ops"
): string {
  if (density === "ledger") return SEMANTIC_TABLE.ledgerHeadCell;
  if (density === "comfortable") return SEMANTIC_TABLE.comfortableHeadCell;
  return SEMANTIC_TABLE.opsHead;
}

export function semanticTableCellClass(
  density: SemanticTableDensity = "ops"
): string {
  if (density === "ledger") return SEMANTIC_TABLE.ledgerCell;
  if (density === "comfortable") return SEMANTIC_TABLE.comfortableCell;
  return SEMANTIC_TABLE.opsCell;
}

export function semanticTableRowClass(
  density: SemanticTableDensity = "ops"
): string {
  if (density === "ledger") return SEMANTIC_TABLE.ledgerRow;
  if (density === "comfortable") return SEMANTIC_TABLE.comfortableRow;
  return SEMANTIC_TABLE.opsRow;
}

export function semanticTableScrollClass(minWidth?: "narrow" | "wide"): string {
  return cn(
    SEMANTIC_TABLE.scroll,
    minWidth === "narrow" && "[&_table]:min-w-[480px]",
    minWidth === "wide" && "[&_table]:min-w-[640px]"
  );
}
