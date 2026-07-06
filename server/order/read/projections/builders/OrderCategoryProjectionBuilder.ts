import type { SelectOrderItem } from "../../../../../drizzle/schema";
import type {
  OrderCategoryProjection,
  CategoryProjectionReadMeta,
} from "../../domain/contracts/categoryProjectionContracts";
import { maxCategoryProjectionVersion as maxVersion } from "../../domain/contracts/categoryProjectionContracts";
import type { ActiveOrderLineItemDto } from "../../domain/contracts/queryContracts";
import type { OrderReadSourceContext } from "../../infrastructure/persistence/OrderReadContextLoader";
import {
  orderCategoryProjectionMetrics,
  type OrderCategoryProjectionMetrics,
} from "../../infrastructure/monitoring/OrderCategoryProjectionMetrics";
import type {
  CategoryResolutionPort,
  ResolvedCategorySource,
} from "./CategoryResolutionPort";

export class CategoryProjectionValidationError extends Error {
  constructor(
    public readonly restaurantId: number,
    public readonly menuItemId: number,
    public readonly lineItemId: number
  ) {
    super(
      `Category projection validation failed for line item ${lineItemId} (menu item ${menuItemId}, restaurant ${restaurantId})`
    );
    this.name = "CategoryProjectionValidationError";
  }
}

function categoryCodeFromId(categoryId: number): string {
  return `cat-${categoryId}`;
}

function categoryNameFromSource(source: ResolvedCategorySource): string {
  const en = source.nameEn?.trim();
  return en && en.length > 0 ? en : source.nameAr;
}

function versionFromUpdatedAt(updatedAt: string): number {
  const parsed = Date.parse(updatedAt.replace(" ", "T"));
  return Number.isFinite(parsed) ? parsed : 1;
}

function normalizeCategoryProjection(source: ResolvedCategorySource): OrderCategoryProjection {
  return Object.freeze({
    categoryId: source.categoryId,
    categoryCode: categoryCodeFromId(source.categoryId),
    categoryName: categoryNameFromSource(source),
    displayOrder: source.sortOrder,
    parentCategoryId: null,
    version: versionFromUpdatedAt(source.updatedAt),
    updatedAt: source.updatedAt,
  });
}

/**
 * ORDER-READ-CATEGORY-PROJECTION-1 — exactly one category projection builder.
 * Resolve → normalize → version → validate. Fails when category cannot be resolved.
 */
export class OrderCategoryProjectionBuilder {
  constructor(
    private readonly resolver: CategoryResolutionPort,
    private readonly metrics: OrderCategoryProjectionMetrics = orderCategoryProjectionMetrics
  ) {}

  buildCategoryProjection(
    restaurantId: number,
    menuItemId: number,
    resolved: ResolvedCategorySource
  ): OrderCategoryProjection {
    if (resolved.categoryId <= 0) {
      this.metrics.recordValidationFailure();
      throw new CategoryProjectionValidationError(restaurantId, menuItemId, 0);
    }
    return normalizeCategoryProjection(resolved);
  }

  async buildLineItems(
    restaurantId: number,
    lineItems: readonly SelectOrderItem[]
  ): Promise<ActiveOrderLineItemDto[]> {
    const started = Date.now();
    const menuItemIds = lineItems.map((item) => item.menuItemId);
    const resolved = await this.resolver.batchResolveMenuItemCategories(
      restaurantId,
      menuItemIds
    );

    const projected: ActiveOrderLineItemDto[] = [];

    for (const item of lineItems) {
      const categorySource = resolved.get(item.menuItemId);
      if (!categorySource) {
        this.metrics.recordValidationFailure();
        throw new CategoryProjectionValidationError(restaurantId, item.menuItemId, item.id);
      }

      projected.push({
        lineItemId: item.id,
        menuItemId: item.menuItemId,
        nameAr: item.nameAr,
        nameEn: item.nameEn ?? null,
        quantity: item.quantity,
        price: String(item.price),
        category: this.buildCategoryProjection(restaurantId, item.menuItemId, categorySource),
      });
    }

    this.metrics.recordProjectionBuilt(Date.now() - started);
    return projected;
  }

  async buildLineItemsFromSource(
    source: OrderReadSourceContext
  ): Promise<ActiveOrderLineItemDto[]> {
    return this.buildLineItems(source.order.restaurantId, source.lineItems);
  }

  /** Batch-build category projections for menu items — used by category backfill. */
  async buildCategoryProjectionsForMenuItems(
    restaurantId: number,
    menuItemIds: readonly number[]
  ): Promise<Map<number, OrderCategoryProjection>> {
    const uniqueIds = Array.from(new Set(menuItemIds));
    if (uniqueIds.length === 0) return new Map();

    const started = Date.now();
    const resolved = await this.resolver.batchResolveMenuItemCategories(
      restaurantId,
      uniqueIds
    );
    const projections = new Map<number, OrderCategoryProjection>();

    for (const menuItemId of uniqueIds) {
      const categorySource = resolved.get(menuItemId);
      if (!categorySource) continue;
      projections.set(
        menuItemId,
        this.buildCategoryProjection(restaurantId, menuItemId, categorySource)
      );
    }

    this.metrics.recordProjectionBuilt(Date.now() - started);
    return projections;
  }

  buildReadMeta(lineItems: readonly ActiveOrderLineItemDto[]): CategoryProjectionReadMeta {
    const categories = lineItems.map((item) => item.category);
    return {
      categoryProjectionVersion: maxVersion(categories),
      projectionBuildDurationMs: 0,
      projectionIntegrity: "valid",
    };
  }
}

export function buildCategoryProjectionReadMeta(
  lineItems: readonly ActiveOrderLineItemDto[],
  buildDurationMs: number
): CategoryProjectionReadMeta {
  const categories = lineItems.map((item) => item.category);
  return {
    categoryProjectionVersion: maxVersion(categories),
    projectionBuildDurationMs: buildDurationMs,
    projectionIntegrity: "valid",
  };
}
