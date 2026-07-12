import type { RuntimeConfiguration } from "../configuration/runtimeConfigurationContract";
import type { RoleCapabilityDeclaration } from "../roles/runtimeRoleContract";
import type {
  CategoryFilterHealth,
  CategoryFilterMode,
  RuntimeCategoryFilter,
} from "./runtimeCategoryFilterContract";

/** Per canonical category id — used for line-item runtime projection (KITCHEN-ITEM-FILTERING-1). */
export type CategoryFilterPredicate = (categoryId: number) => boolean;

export type CategoryFilterManagerSnapshot = {
  filter: RuntimeCategoryFilter | null;
  predicate: CategoryFilterPredicate;
  lastUpdatedAt: string | null;
};

function normalizeCategoryIds(raw: number[]): {
  selected: number[];
  ignored: number[];
  errors: string[];
} {
  const selected: number[] = [];
  const ignored: number[] = [];
  const errors: string[] = [];
  const seen = new Set<number>();

  for (const id of raw) {
    if (!Number.isInteger(id) || id <= 0) {
      ignored.push(id);
      errors.push(`invalid_category_id:${id}`);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    selected.push(id);
  }

  return { selected, ignored, errors };
}

function compilePredicate(filter: RuntimeCategoryFilter): CategoryFilterPredicate {
  if (!filter.enabled || filter.mode === "all") {
    return () => true;
  }
  const selected = new Set(filter.selectedCategories);
  return (categoryId: number) => selected.has(categoryId);
}

/**
 * KITCHEN-CATEGORY-FILTER-1 — single runtime category filter pipeline.
 * Load → Validate → Normalize → Compile predicate → Cache → Publish.
 */
export class RuntimeCategoryFilterManager {
  private filter: RuntimeCategoryFilter | null = null;
  private predicate: CategoryFilterPredicate = () => true;
  private filterVersionCounter = 0;
  private lastUpdatedAt: string | null = null;
  private activated = false;

  /**
   * Activate filter from normalized runtime configuration.
   * Blocked roles pass supportsCategoryFilter=false — filter stays inactive.
   */
  syncFromConfiguration(
    configuration: RuntimeConfiguration,
    capabilities: RoleCapabilityDeclaration
  ): RuntimeCategoryFilter {
    const canActivate =
      capabilities.supportsCategoryFilter && configuration.tracked.categoriesActivated;

    if (!canActivate) {
      return this.publishInactive(configuration.version);
    }

    const rawIds = configuration.tracked.categoryIds;
    const { selected, ignored, errors } = normalizeCategoryIds(rawIds);

    // Empty selection = no filtering (show all orders).
    const enabled = selected.length > 0;
    const mode: CategoryFilterMode = enabled ? "selected_categories" : "all";

    this.filterVersionCounter += 1;
    const filter: RuntimeCategoryFilter = {
      enabled,
      selectedCategories: selected,
      mode,
      filterVersion: this.filterVersionCounter,
      updatedAt: new Date().toISOString(),
      configurationVersion: configuration.version,
      validationErrors: errors,
      ignoredCategories: ignored,
    };

    this.filter = filter;
    this.predicate = compilePredicate(filter);
    this.lastUpdatedAt = filter.updatedAt;
    this.activated = true;
    return filter;
  }

  private publishInactive(configurationVersion: string): RuntimeCategoryFilter {
    const filter: RuntimeCategoryFilter = {
      enabled: false,
      selectedCategories: [],
      mode: "all",
      filterVersion: this.filterVersionCounter,
      updatedAt: new Date().toISOString(),
      configurationVersion,
      validationErrors: [],
      ignoredCategories: [],
    };
    this.filter = filter;
    this.predicate = () => true;
    this.lastUpdatedAt = filter.updatedAt;
    this.activated = false;
    return filter;
  }

  getFilter(): RuntimeCategoryFilter | null {
    return this.filter;
  }

  getPredicate(): CategoryFilterPredicate {
    return this.predicate;
  }

  getSnapshot(): CategoryFilterManagerSnapshot {
    return {
      filter: this.filter,
      predicate: this.predicate,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }

  isActivated(): boolean {
    return this.activated;
  }

  detectConfigurationChange(configurationVersion: string): boolean {
    return this.filter != null && this.filter.configurationVersion !== configurationVersion;
  }

  buildHealth(): CategoryFilterHealth | null {
    if (!this.filter) return null;

    const hasWarnings = this.filter.validationErrors.length > 0;

    return {
      filterEnabled: this.filter.enabled,
      selectedCategoryCount: this.filter.selectedCategories.length,
      configurationVersion: this.filter.configurationVersion,
      filterVersion: this.filter.filterVersion,
      validationStatus: !this.activated
        ? "inactive"
        : hasWarnings
          ? "warning"
          : "valid",
      validationErrors: this.filter.validationErrors,
      ignoredCategories: this.filter.ignoredCategories,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }

  dispose(): void {
    this.filter = null;
    this.predicate = () => true;
    this.activated = false;
    this.lastUpdatedAt = null;
  }
}
