import type { SelectOrderItem } from "../../../../../drizzle/schema";
import type { OrderCategoryProjection } from "../../domain/contracts/categoryProjectionContracts";
import { maxCategoryProjectionVersion } from "../../domain/contracts/categoryProjectionContracts";
import type { CategoryProjectionReadMeta } from "../../domain/contracts/categoryProjectionContracts";
import type { ActiveOrderLineItemDto } from "../../domain/contracts/queryContracts";
import {
  isMenuItemOrderLine,
  isOfferOrderLine,
} from "../../domain/contracts/queryContracts";
import { maxOfferProjectionVersion } from "../../domain/contracts/offerProjectionContracts";
import type { OrderReadSourceContext } from "../../infrastructure/persistence/OrderReadContextLoader";
import {
  classifyOrderLineProjectionType,
  isOfferOrderLineMenuItemId,
  ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
  ORDER_LINE_PROJECTION_TYPE_OFFER,
} from "../../domain/contracts/lineProjectionContracts";
import { OrderCategoryProjectionBuilder } from "./OrderCategoryProjectionBuilder";
import { OrderOfferProjectionBuilder } from "./OrderOfferProjectionBuilder";

export type LineItemProjectionReadMeta = CategoryProjectionReadMeta & {
  offerProjectionVersion: number;
};

/**
 * ORDER-READ-OFFER-PROJECTION-1 — routes menu vs offer lines to canonical builders.
 */
export class OrderReadLineItemProjectionBuilder {
  constructor(
    private readonly categoryBuilder: OrderCategoryProjectionBuilder,
    private readonly offerBuilder: OrderOfferProjectionBuilder = new OrderOfferProjectionBuilder()
  ) {}

  async buildLineItems(
    restaurantId: number,
    lineItems: readonly SelectOrderItem[]
  ): Promise<ActiveOrderLineItemDto[]> {
    const menuItems = lineItems.filter((item) => !isOfferOrderLineMenuItemId(item.menuItemId));
    const offerItems = lineItems.filter((item) => isOfferOrderLineMenuItemId(item.menuItemId));

    const menuProjected =
      menuItems.length > 0
        ? await this.categoryBuilder.buildLineItems(restaurantId, menuItems)
        : [];

    const offerProjected: ActiveOrderLineItemDto[] = offerItems.map((item) => ({
      projectionType: ORDER_LINE_PROJECTION_TYPE_OFFER,
      lineItemId: item.id,
      menuItemId: 0,
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? null,
      quantity: item.quantity,
      price: String(item.price),
      itemNotes: item.notes ?? null,
      offer: this.offerBuilder.buildFromOrderLine(item),
    }));

    const byLineId = new Map<number, ActiveOrderLineItemDto>();
    for (const item of [...menuProjected, ...offerProjected]) {
      byLineId.set(item.lineItemId, item);
    }

    return lineItems
      .map((item) => byLineId.get(item.id))
      .filter((item): item is ActiveOrderLineItemDto => item != null);
  }

  async buildLineItemsFromSource(
    source: OrderReadSourceContext
  ): Promise<ActiveOrderLineItemDto[]> {
    return this.buildLineItems(source.order.restaurantId, source.lineItems);
  }

  buildReadMeta(lineItems: readonly ActiveOrderLineItemDto[]): LineItemProjectionReadMeta {
    const categoryItems = lineItems.filter(isMenuItemOrderLine);
    const offerItems = lineItems.filter(isOfferOrderLine);
    const categoryMeta = this.categoryBuilder.buildReadMeta(categoryItems);
    return {
      ...categoryMeta,
      offerProjectionVersion: maxOfferProjectionVersion(offerItems.map((item) => item.offer)),
    };
  }

  /** Category backfill — menu item lines only. */
  filterCategoryBackfillCandidates<T extends { menuItemId: number }>(rows: readonly T[]): T[] {
    return rows.filter((row) => !isOfferOrderLineMenuItemId(row.menuItemId));
  }
}

export function lineProjectionTypeFromMenuItemId(menuItemId: number) {
  return classifyOrderLineProjectionType(menuItemId);
}

export function categoryProjectionsFromLineItems(
  lineItems: readonly ActiveOrderLineItemDto[]
): OrderCategoryProjection[] {
  return lineItems.filter(isMenuItemOrderLine).map((item) => item.category);
}

export function buildLineItemProjectionReadMeta(
  lineItems: readonly ActiveOrderLineItemDto[],
  buildDurationMs: number
): LineItemProjectionReadMeta {
  const categories = categoryProjectionsFromLineItems(lineItems);
  const offers = lineItems.filter(isOfferOrderLine).map((item) => item.offer);
  return {
    categoryProjectionVersion: maxCategoryProjectionVersion(categories),
    offerProjectionVersion: maxOfferProjectionVersion(offers),
    projectionBuildDurationMs: buildDurationMs,
    projectionIntegrity: "valid",
  };
}
