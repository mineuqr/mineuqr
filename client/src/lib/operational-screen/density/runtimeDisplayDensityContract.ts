/** Canonical runtime density values — only comfortable and compact are operational. */
export type CanonicalDisplayDensity = "comfortable" | "compact" | "dense" | "custom";

export type DensityLifecycleState =
  | "loading"
  | "valid"
  | "applied"
  | "reloading"
  | "inactive"
  | "disposed";

/**
 * Immutable presentation metrics — components apply classes only, never interpret config.
 */
export type PresentationDensityModel = {
  readonly cardPadding: string;
  readonly cardGap: string;
  readonly cardMinHeight: string;
  readonly cardRadius: string;
  readonly columnGap: string;
  readonly columnSectionGap: string;
  readonly ticketListGap: string;
  readonly sectionTitleClass: string;
  readonly orderNumberClass: string;
  readonly tableLabelClass: string;
  readonly customerNameClass: string;
  readonly lineItemClass: string;
  readonly quantityClass: string;
  readonly quantityColumnClass: string;
  readonly notesClass: string;
  readonly notesPadding: string;
  readonly timingClass: string;
  readonly timingIconClass: string;
  readonly warningClass: string;
  readonly emptyStateClass: string;
  /** Line items shown before overflow indicator — tied to density tier. */
  readonly maxVisibleLineItems: number;
};

/**
 * Normalized runtime display density contract.
 * Never consumes raw configuration payloads.
 */
export type RuntimeDisplayDensity = {
  version: number;
  density: CanonicalDisplayDensity;
  layoutScale: number;
  spacingScale: number;
  fontScale: number;
  ticketDensity: number;
  updatedAt: string;
  state: DensityLifecycleState;
  configurationVersion: string;
  configuredDensity: string;
  usedFallback: boolean;
  validationErrors: string[];
};

export type DisplayDensityHealth = {
  density: CanonicalDisplayDensity;
  configuredDensity: string;
  densityVersion: number;
  configurationVersion: string;
  appliedVersion: string | null;
  validationStatus: "valid" | "warning" | "inactive";
  validationErrors: string[];
  usedFallback: boolean;
  lastReloadAt: string | null;
};
