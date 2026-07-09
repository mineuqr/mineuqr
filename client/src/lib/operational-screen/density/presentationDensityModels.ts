import type {
  CanonicalDisplayDensity,
  PresentationDensityModel,
} from "./runtimeDisplayDensityContract";

/** Comfortable — default operational density (maps from config "large"). */
export const COMFORTABLE_DENSITY_MODEL: PresentationDensityModel = {
  cardPadding: "p-6",
  cardGap: "gap-5",
  cardMinHeight: "min-h-[260px]",
  cardRadius: "rounded-2xl",
  columnGap: "gap-4",
  columnSectionGap: "space-y-3",
  ticketListGap: "space-y-3",
  sectionTitleClass: "text-sm font-medium uppercase tracking-wide text-muted-foreground",
  orderNumberClass: "whitespace-nowrap font-mono text-2xl font-bold tracking-tight",
  tableLabelClass: "mt-1 text-lg font-medium text-muted-foreground",
  customerNameClass: "max-w-[45%] truncate text-lg font-medium text-muted-foreground",
  lineItemClass: "text-2xl font-bold leading-snug tracking-tight",
  notesClass: "text-lg font-medium leading-relaxed",
  notesPadding: "rounded-xl bg-muted/60 px-4 py-3",
  timingClass: "text-lg font-semibold text-muted-foreground",
  timingIconClass: "h-5 w-5 shrink-0",
  warningClass: "text-base font-semibold",
  emptyStateClass: "text-sm text-muted-foreground",
};

/** Operational — kitchen workspace grid density (maximum visible tickets). */
export const KITCHEN_OPERATIONAL_DENSITY_MODEL: PresentationDensityModel = {
  cardPadding: "p-3",
  cardGap: "gap-2",
  cardMinHeight: "",
  cardRadius: "rounded-lg",
  columnGap: "gap-2",
  columnSectionGap: "space-y-1.5",
  ticketListGap: "space-y-0.5",
  sectionTitleClass: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  orderNumberClass: "whitespace-nowrap font-mono text-lg font-bold leading-none tracking-tight",
  tableLabelClass: "text-xs font-medium text-muted-foreground",
  customerNameClass: "max-w-[40%] truncate text-xs font-medium text-muted-foreground",
  lineItemClass: "text-sm font-semibold leading-tight",
  notesClass: "text-xs font-medium leading-snug",
  notesPadding: "rounded-md bg-muted/50 px-2 py-1",
  timingClass: "text-sm font-bold tabular-nums",
  timingIconClass: "h-3.5 w-3.5 shrink-0",
  warningClass: "text-xs font-medium",
  emptyStateClass: "text-xs text-muted-foreground",
};

/** Compact — higher information density. */
export const COMPACT_DENSITY_MODEL: PresentationDensityModel = {
  cardPadding: "p-4",
  cardGap: "gap-3",
  cardMinHeight: "min-h-[200px]",
  cardRadius: "rounded-xl",
  columnGap: "gap-3",
  columnSectionGap: "space-y-2",
  ticketListGap: "space-y-2",
  sectionTitleClass: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
  orderNumberClass: "whitespace-nowrap font-mono text-xl font-bold tracking-tight",
  tableLabelClass: "mt-0.5 text-base font-medium text-muted-foreground",
  customerNameClass: "max-w-[45%] truncate text-base font-medium text-muted-foreground",
  lineItemClass: "text-lg font-bold leading-snug tracking-tight",
  notesClass: "text-base font-medium leading-relaxed",
  notesPadding: "rounded-lg bg-muted/60 px-3 py-2",
  timingClass: "text-base font-semibold text-muted-foreground",
  timingIconClass: "h-4 w-4 shrink-0",
  warningClass: "text-sm font-semibold",
  emptyStateClass: "text-xs text-muted-foreground",
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
