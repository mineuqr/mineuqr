/** Screen presentation config — persisted on device; kitchen/expo runtime applies via configuration reload. */

export type ScreenLanguage = "ar" | "en";

export type DisplayDirection = "rtl" | "ltr";

/** Extension point — KITCHEN-DISPLAY-DENSITY-1 */
export type DisplayDensity = "large" | "comfortable" | "compact";

export type OperationalScreenConfig = {
  language: ScreenLanguage;
  displayDirection: DisplayDirection;
  /** Applied at runtime on kitchen/expo after configuration reload. */
  displayDensity: DisplayDensity;
  /** Applied at runtime on kitchen/expo after configuration reload; empty = show all orders. */
  visibleCategoryIds: number[];
};

export const DEFAULT_SCREEN_CONFIG: OperationalScreenConfig = {
  language: "ar",
  displayDirection: "rtl",
  displayDensity: "large",
  visibleCategoryIds: [],
};

export function parseScreenConfig(raw: unknown): OperationalScreenConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SCREEN_CONFIG };
  const value = raw as Partial<OperationalScreenConfig>;
  return {
    language: value.language === "en" ? "en" : "ar",
    displayDirection: value.displayDirection === "ltr" ? "ltr" : "rtl",
    displayDensity:
      value.displayDensity === "comfortable" || value.displayDensity === "compact"
        ? value.displayDensity
        : "large",
    visibleCategoryIds: Array.isArray(value.visibleCategoryIds)
      ? value.visibleCategoryIds.filter((id): id is number => typeof id === "number" && Number.isInteger(id))
      : [],
  };
}

export type UpdateScreenSettingsInput = {
  displayName?: string;
  screenConfig?: Partial<OperationalScreenConfig>;
};

export function mergeScreenConfig(
  current: OperationalScreenConfig,
  patch: Partial<OperationalScreenConfig>
): OperationalScreenConfig {
  return parseScreenConfig({ ...current, ...patch });
}
