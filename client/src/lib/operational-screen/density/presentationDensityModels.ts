import type {
  CanonicalDisplayDensity,
  PresentationDensityModel,
} from "./runtimeDisplayDensityContract";

/** Comfortable — default operational density (maps from config "large"). */
export const COMFORTABLE_DENSITY_MODEL: PresentationDensityModel = {
  cardPadding: "p-4",
  cardGap: "gap-3",
  cardMinHeight: "min-h-[200px]",
  cardRadius: "rounded-xl",
  columnGap: "gap-4",
  columnSectionGap: "space-y-2",
  ticketListGap: "space-y-2",
  sectionTitleClass: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
  orderNumberClass: "whitespace-nowrap font-mono text-xl font-black tracking-tight leading-none",
  tableLabelClass: "text-[11px] font-medium text-muted-foreground/55",
  customerNameClass: "max-w-[45%] truncate text-sm font-medium text-muted-foreground",
  lineItemClass: "text-base font-semibold leading-snug text-foreground/90",
  quantityClass: "font-black tabular-nums leading-none text-foreground",
  quantityColumnClass: "min-w-[40px] shrink-0 text-end",
  notesClass: "text-sm font-medium leading-snug",
  notesPadding: "rounded-lg bg-muted/50 px-2.5 py-1.5",
  timingClass: "text-sm font-extrabold tabular-nums tracking-tight whitespace-nowrap text-foreground",
  timingIconClass: "h-4 w-4 shrink-0",
  warningClass: "text-xs font-semibold",
  emptyStateClass: "text-sm text-muted-foreground",
  maxVisibleLineItems: 6,
};

/** Compact — higher information density. */
export const COMPACT_DENSITY_MODEL: PresentationDensityModel = {
  cardPadding: "p-3",
  cardGap: "gap-2",
  cardMinHeight: "min-h-[155px]",
  cardRadius: "rounded-lg",
  columnGap: "gap-3",
  columnSectionGap: "space-y-1.5",
  ticketListGap: "space-y-1.5",
  sectionTitleClass: "text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
  orderNumberClass: "whitespace-nowrap font-mono text-lg font-black tracking-tight leading-none",
  tableLabelClass: "text-[10px] font-medium text-muted-foreground/55",
  customerNameClass: "max-w-[45%] truncate text-xs font-medium text-muted-foreground",
  lineItemClass: "text-[14px] font-semibold leading-snug text-foreground/90",
  quantityClass: "font-black tabular-nums leading-none text-foreground",
  quantityColumnClass: "min-w-[40px] shrink-0 text-end",
  notesClass: "text-xs font-medium leading-snug",
  notesPadding: "rounded-md bg-muted/50 px-2 py-1",
  timingClass: "text-xs font-extrabold tabular-nums tracking-tight whitespace-nowrap text-foreground",
  timingIconClass: "h-3.5 w-3.5 shrink-0",
  warningClass: "text-[11px] font-semibold",
  emptyStateClass: "text-xs text-muted-foreground",
  maxVisibleLineItems: 4,
};

const DENSITY_MODELS: Record<"comfortable" | "compact", PresentationDensityModel> = {
  comfortable: COMFORTABLE_DENSITY_MODEL,
  compact: COMPACT_DENSITY_MODEL,
};

const DENSITY_METRICS: Record<
  "comfortable" | "compact",
  { layoutScale: number; spacingScale: number; fontScale: number; ticketDensity: number }
> = {
  comfortable: { layoutScale: 1, spacingScale: 1, fontScale: 1, ticketDensity: 1 },
  compact: { layoutScale: 0.85, spacingScale: 0.75, fontScale: 0.9, ticketDensity: 1.25 },
};

export function resolvePresentationDensityModel(
  density: CanonicalDisplayDensity
): PresentationDensityModel {
  if (density === "compact") return COMPACT_DENSITY_MODEL;
  return COMFORTABLE_DENSITY_MODEL;
}

export function resolveDensityMetrics(density: CanonicalDisplayDensity): {
  layoutScale: number;
  spacingScale: number;
  fontScale: number;
  ticketDensity: number;
} {
  if (density === "compact") return DENSITY_METRICS.compact;
  return DENSITY_METRICS.comfortable;
}

export function getDensityModelForCanonical(
  density: "comfortable" | "compact"
): PresentationDensityModel {
  return DENSITY_MODELS[density];
}
