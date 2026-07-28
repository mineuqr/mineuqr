/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1
 * Canonical operational density modes — presentation only.
 * Kitchen runtime may still inject PresentationDensityModel class overrides.
 */
import type { PresentationDensityModel } from "@/lib/operational-screen/density/runtimeDisplayDensityContract";
import {
  COMFORTABLE_DENSITY_MODEL,
  COMPACT_DENSITY_MODEL,
} from "@/lib/operational-screen/density/presentationDensityModels";

export type OperationalOrderDensity =
  | "compact"
  | "comfortable"
  | "kitchen"
  | "large-display";

export type OperationalOrderDensityTokens = PresentationDensityModel & {
  /** Scroll viewport for long item lists — fixed card + persistent footer. */
  readonly itemsScrollClass: string;
};

const LARGE_DISPLAY_DENSITY_MODEL: OperationalOrderDensityTokens = {
  cardPadding: "p-5 sm:p-6",
  cardGap: "gap-4",
  cardMinHeight: "min-h-[240px]",
  cardRadius: "rounded-2xl",
  columnGap: "gap-5",
  columnSectionGap: "space-y-3",
  ticketListGap: "space-y-3",
  sectionTitleClass: "text-sm font-medium uppercase tracking-wide text-muted-foreground",
  orderNumberClass:
    "whitespace-nowrap font-mono text-2xl font-black tracking-tight leading-none sm:text-3xl",
  tableLabelClass: "text-sm font-medium text-muted-foreground/80",
  customerNameClass: "max-w-[50%] truncate text-base font-medium text-muted-foreground",
  lineItemClass: "text-lg font-semibold leading-snug text-foreground/90",
  quantityClass: "font-black tabular-nums leading-none text-foreground",
  quantityColumnClass: "w-[48px] min-w-[48px] max-w-[48px] shrink-0 text-end",
  notesClass: "text-base font-medium leading-snug",
  notesPadding: "rounded-lg bg-muted/50 px-3 py-2",
  timingClass:
    "text-base font-extrabold tabular-nums tracking-tight whitespace-nowrap text-foreground",
  timingIconClass: "h-5 w-5 shrink-0",
  warningClass: "text-sm font-semibold",
  emptyStateClass: "text-base text-muted-foreground",
  maxVisibleLineItems: Number.POSITIVE_INFINITY,
  itemsScrollClass: "max-h-[28rem] overflow-y-auto overscroll-contain pr-1",
};

const KITCHEN_DENSITY_MODEL: OperationalOrderDensityTokens = {
  ...COMFORTABLE_DENSITY_MODEL,
  maxVisibleLineItems: Number.POSITIVE_INFINITY,
  itemsScrollClass: "max-h-[18rem] overflow-y-auto overscroll-contain pr-1",
};

const COMFORTABLE: OperationalOrderDensityTokens = {
  ...COMFORTABLE_DENSITY_MODEL,
  maxVisibleLineItems: Number.POSITIVE_INFINITY,
  itemsScrollClass: "max-h-[16rem] overflow-y-auto overscroll-contain pr-1",
};

const COMPACT: OperationalOrderDensityTokens = {
  ...COMPACT_DENSITY_MODEL,
  maxVisibleLineItems: Number.POSITIVE_INFINITY,
  itemsScrollClass: "max-h-[12rem] overflow-y-auto overscroll-contain pr-1",
};

const DENSITY_BY_MODE: Record<OperationalOrderDensity, OperationalOrderDensityTokens> = {
  compact: COMPACT,
  comfortable: COMFORTABLE,
  kitchen: KITCHEN_DENSITY_MODEL,
  "large-display": LARGE_DISPLAY_DENSITY_MODEL,
};

export function resolveOperationalOrderDensity(
  density: OperationalOrderDensity = "comfortable",
  runtimeModel?: PresentationDensityModel
): OperationalOrderDensityTokens {
  const base = DENSITY_BY_MODE[density] ?? COMFORTABLE;
  if (!runtimeModel) return base;
  return {
    ...base,
    ...runtimeModel,
    maxVisibleLineItems: Number.POSITIVE_INFINITY,
    itemsScrollClass: base.itemsScrollClass,
  };
}
