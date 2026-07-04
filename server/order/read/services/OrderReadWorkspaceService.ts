import type {
  ActiveOrderListQuery,
  ActiveOrderListResult,
  OrderDetailQuery,
  OrderTimelineResult,
} from "../domain/contracts/queryContracts";
import {
  buildReadResultMeta,
  clampActiveOrderLimit,
} from "../domain/contracts/queryContracts";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../domain/contracts/projectionIds";
import { DrizzleOrderOperationalReadStore } from "../infrastructure/DrizzleOrderOperationalReadStore";

export class OrderReadWorkspaceService {
  constructor(private readonly store = new DrizzleOrderOperationalReadStore()) {}

  async listActive(query: ActiveOrderListQuery): Promise<ActiveOrderListResult> {
    const limit = clampActiveOrderLimit(query.limit);
    const status = query.status === "all-active" ? undefined : query.status;
    const items = await this.store.listActiveOrders({
      restaurantId: query.restaurantId,
      status,
      limit: limit + 1,
    });
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    return {
      ...buildReadResultMeta(ORDER_READ_PROJECTION_SCHEMA_VERSION),
      items: pageItems,
      pageInfo: {
        hasMore,
        nextCursor: hasMore ? pageItems[pageItems.length - 1]?.createdAt ?? null : null,
        limit,
      },
    };
  }

  async getTimeline(query: OrderDetailQuery): Promise<OrderTimelineResult | null> {
    const events = await this.store.getTimeline(query);
    if (!events) return null;
    return {
      ...buildReadResultMeta(ORDER_READ_PROJECTION_SCHEMA_VERSION),
      orderId: query.orderId,
      events,
    };
  }

  async getDetail(query: OrderDetailQuery) {
    const detail = await this.store.getOrderDetail(query);
    if (!detail) return null;
    return {
      ...buildReadResultMeta(ORDER_READ_PROJECTION_SCHEMA_VERSION),
      order: detail.order,
      timeline: detail.timeline,
    };
  }
}

export const orderReadWorkspaceService = new OrderReadWorkspaceService();
