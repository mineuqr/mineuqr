/**
 * ORDERS-OPERATIONAL-LIFECYCLE-CONSISTENCY-REPAIR-1
 * Q-01 listActive membership (authoritative operational read model):
 * - order_read_orders only (not the write-model orders table)
 * - lifecycleStage = active
 * - optional status pending | preparing | ready
 * - Orders Workspace (order.read.listActive) uses paid-visible cashier_pos
 * - POS Incoming listActive keeps exclude (direct sales are not Incoming)
 * - Dining Session readers keep diningOperationalExcludeCashierPosSql
 * Kitchen keeps paid-visible cashier_pos for fulfillment.
 * Served/cancelled leave this set when lifecycle becomes completed.
 * Catch-up drains deferred outbox before the projection query so create/serve
 * converge without awaitRelay on the mutation HTTP path. Kitchen readers
 * share the same single-flight drain; Kitchen keeps paid-visible cashier_pos.
 */
import type {
  ActiveOrderListQuery,
  ActiveOrderListResult,
  OrderDetailQuery,
  OrderTimelineResult,
} from "../domain/contracts/queryContracts";
import type { CashierPosListMembership } from "../cashierPosOperationalVisibility";
import {
  buildReadResultMeta,
  clampActiveOrderLimit,
} from "../domain/contracts/queryContracts";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../domain/contracts/projectionIds";
import { catchUpOrderReadProjection } from "../catchUpOrderReadProjection";
import { DrizzleOrderOperationalReadStore } from "../infrastructure/DrizzleOrderOperationalReadStore";

export class OrderReadWorkspaceService {
  constructor(private readonly store = new DrizzleOrderOperationalReadStore()) {}

  async listActive(
    query: ActiveOrderListQuery,
    options?: { cashierPosMembership?: CashierPosListMembership }
  ): Promise<ActiveOrderListResult> {
    await catchUpOrderReadProjection();
    const limit = clampActiveOrderLimit(query.limit);
    const status = query.status === "all-active" ? undefined : query.status;
    const items = await this.store.listActiveOrders({
      restaurantId: query.restaurantId,
      status,
      limit: limit + 1,
      cashierPosMembership: options?.cashierPosMembership ?? "exclude",
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
    await catchUpOrderReadProjection();
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
