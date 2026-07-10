import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  orderReadOrderLineItems,
  orderReadOrders,
  orderReadOrderTimeline,
} from "../../../../drizzle/schema";
import type { ActiveOrderItemDto, OrderTimelineEventDto } from "../domain/contracts/queryContracts";
import type { OrderDetailQuery } from "../domain/contracts/queryContracts";
import { mapActiveOrderItemDto } from "../presentation/mapActiveOrderItemDto";
import { mapStoredOrderReadLineItem } from "./persistence/mapStoredOrderReadLineItem";

type OrderRow = typeof orderReadOrders.$inferSelect;
type LineItemRow = typeof orderReadOrderLineItems.$inferSelect;

function mapLineItem(row: LineItemRow) {
  return mapStoredOrderReadLineItem(row);
}

function mapOrder(row: OrderRow, lineItems: LineItemRow[]): ActiveOrderItemDto {
  return mapActiveOrderItemDto({
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    businessDay: row.businessDay ?? null,
    dailyDisplayNumber: row.dailyDisplayNumber ?? null,
    status: row.status,
    tableNumber: row.tableNumber,
    sessionId: row.sessionId ?? null,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    notes: row.notes,
    totalAmount: String(row.totalAmount),
    createdAt: row.createdAt,
    readyAt: row.readyAt ?? null,
    lineItems: lineItems.map(mapLineItem),
  });
}

/**
 * Q-01 / Q-03 / Q-04 read store — order_read_* projections only.
 */
export class DrizzleOrderOperationalReadStore {
  async listActiveOrders(input: {
    restaurantId: number;
    status?: "pending" | "preparing" | "ready";
    limit: number;
  }): Promise<ActiveOrderItemDto[]> {
    const db = await getDb();
    if (!db) return [];

    const conditions = [
      eq(orderReadOrders.restaurantId, input.restaurantId),
      eq(orderReadOrders.isActive, true),
    ];
    if (input.status) {
      conditions.push(eq(orderReadOrders.status, input.status));
    }

    const rows = await db
      .select()
      .from(orderReadOrders)
      .where(and(...conditions))
      .orderBy(asc(orderReadOrders.createdAt))
      .limit(input.limit);

    return this.attachLineItems(rows);
  }

  async getOrderDetail(
    query: OrderDetailQuery
  ): Promise<{ order: ActiveOrderItemDto; timeline: OrderTimelineEventDto[] } | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(orderReadOrders)
      .where(
        and(
          eq(orderReadOrders.restaurantId, query.restaurantId),
          eq(orderReadOrders.orderId, query.orderId)
        )
      )
      .limit(1);

    if (!row) return null;

    const lineItems = await db
      .select()
      .from(orderReadOrderLineItems)
      .where(
        and(
          eq(orderReadOrderLineItems.restaurantId, query.restaurantId),
          eq(orderReadOrderLineItems.orderId, query.orderId)
        )
      );

    const timeline = await this.getTimeline(query);
    if (!timeline) return null;

    return {
      order: mapOrder(row, lineItems),
      timeline,
    };
  }

  async getTimeline(query: OrderDetailQuery): Promise<OrderTimelineEventDto[] | null> {
    const db = await getDb();
    if (!db) return null;

    const rows = await db
      .select()
      .from(orderReadOrderTimeline)
      .where(
        and(
          eq(orderReadOrderTimeline.restaurantId, query.restaurantId),
          eq(orderReadOrderTimeline.orderId, query.orderId)
        )
      )
      .orderBy(asc(orderReadOrderTimeline.occurredAt));

    return rows.map((t) => ({
      eventId: t.eventId,
      fromStatus: t.fromStatus,
      toStatus: t.toStatus,
      occurredAt: t.occurredAt,
    }));
  }

  async listRecentOrders(input: {
    restaurantId: number;
    limit: number;
  }): Promise<ActiveOrderItemDto[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(orderReadOrders)
      .where(eq(orderReadOrders.restaurantId, input.restaurantId))
      .orderBy(desc(orderReadOrders.createdAt))
      .limit(input.limit);

    return this.attachLineItems(rows);
  }

  private async attachLineItems(rows: OrderRow[]): Promise<ActiveOrderItemDto[]> {
    if (rows.length === 0) return [];
    const db = await getDb();
    if (!db) return [];

    const restaurantId = rows[0]!.restaurantId;
    const orderIds = rows.map((r) => r.orderId);

    const lineItems = await db
      .select()
      .from(orderReadOrderLineItems)
      .where(
        and(
          eq(orderReadOrderLineItems.restaurantId, restaurantId),
          inArray(orderReadOrderLineItems.orderId, orderIds)
        )
      );

    const byOrder = new Map<number, LineItemRow[]>();
    for (const li of lineItems) {
      const list = byOrder.get(li.orderId) ?? [];
      list.push(li);
      byOrder.set(li.orderId, list);
    }

    return rows.map((row) => mapOrder(row, byOrder.get(row.orderId) ?? []));
  }
}
