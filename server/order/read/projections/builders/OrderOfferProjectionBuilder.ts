import type { SelectOrderItem } from "../../../../../drizzle/schema";
import type { OrderOfferProjection } from "../../domain/contracts/offerProjectionContracts";
import { ORDER_OFFER_PROJECTION_SCHEMA_VERSION } from "../../domain/contracts/offerProjectionContracts";

function versionFromCreatedAt(createdAt: string): number {
  const parsed = Date.parse(createdAt.replace(" ", "T"));
  return Number.isFinite(parsed) ? parsed : ORDER_OFFER_PROJECTION_SCHEMA_VERSION;
}

/**
 * ORDER-READ-OFFER-PROJECTION-1 — single offer projection authority.
 * Builds from persisted order line snapshot only; never fabricates menu/category data.
 */
export class OrderOfferProjectionBuilder {
  buildFromOrderLine(item: SelectOrderItem): OrderOfferProjection {
    return Object.freeze({
      lineKind: "offer",
      offerId: null,
      titleAr: item.nameAr,
      titleEn: item.nameEn ?? null,
      source: "order_line_snapshot",
      version: versionFromCreatedAt(item.createdAt),
      updatedAt: item.createdAt,
    });
  }

  buildFromSnapshot(input: {
    titleAr: string;
    titleEn: string | null;
    updatedAt: string;
    offerId?: number | null;
  }): OrderOfferProjection {
    return Object.freeze({
      lineKind: "offer",
      offerId: input.offerId ?? null,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      source: "order_line_snapshot",
      version: versionFromCreatedAt(input.updatedAt),
      updatedAt: input.updatedAt,
    });
  }
}

export const orderOfferProjectionBuilder = new OrderOfferProjectionBuilder();
