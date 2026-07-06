/** Category filter lifecycle mode — never compares display labels or localized names. */
export type CategoryFilterMode = "all" | "selected_categories";

/**
 * Normalized runtime category filter contract.
 * Never consumes raw API payloads — built from RuntimeConfiguration only.
 */
export type RuntimeCategoryFilter = {
  enabled: boolean;
  selectedCategories: number[];
  mode: CategoryFilterMode;
  filterVersion: number;
  updatedAt: string;
  configurationVersion: string;
  validationErrors: string[];
  ignoredCategories: number[];
};

export type CategoryFilterHealth = {
  filterEnabled: boolean;
  selectedCategoryCount: number;
  configurationVersion: string;
  filterVersion: number;
  validationStatus: "valid" | "warning" | "inactive";
  validationErrors: string[];
  ignoredCategories: number[];
  lastUpdatedAt: string | null;
};
