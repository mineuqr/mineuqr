import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  orderReadOrderLineItems,
  orderReadOrders,
  orderReadOrderTimeline,
} from "../../../../drizzle/schema";
import type {
  PrintWorkspaceListQuery,
  PrintWorkspaceOrderDetailQuery,
  PrintWorkspaceOrderDto,
  PrintWorkspaceTimelineEventDto,
} from "../contracts/printWorkspaceQueryContracts";
import { clampPrintWorkspaceLimit } from "../contracts/printWorkspaceQueryContracts";
import { parseStoredCategoryProjection } from "../../../order/read/infrastructure/persistence/parseStoredCategoryProjection";

type OrderRow = typeof orderReadOrders.$inferSelect;
type LineItemRow = typeof orderReadOrderLineItems.$inferSelect;

function mapLineItem(row: LineItemRow) {
  return {
    lineItemId: row.lineItemId,
    menuItemId: row.menuItemId,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    quantity: row.quantity,
    price: String(row.price),
    category: parseStoredCategoryProjection(row.categoryProjection, row.lineItemId),
  };
}

function mapOrder(row: OrderRow, lineItems: LineItemRow[]): PrintWorkspaceOrderDto {
  return {
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    status: row.status,
    tableNumber: row.tableNumber,
    sessionId: row.sessionId ?? null,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    notes: row.notes,
    totalAmount: String(row.totalAmount),
    createdAt: row.createdAt,
    readyAt: row.readyAt ?? null,
    servedAt: row.servedAt ?? null,
    isActive: row.isActive,
    lineItems: lineItems.map(mapLineItem),
  };
}

/**
 * Read-only access to order_read_* projection tables for the Print Workspace.
 */
export class DrizzlePrintWorkspaceReadStore {
  async listOrders(query: PrintWorkspaceListQuery): Promise<PrintWorkspaceOrderDto[]> {
    const db = await getDb();
    if (!db) return [];

    const limit = clampPrintWorkspaceLimit(query.limit);
    const conditions = [eq(orderReadOrders.restaurantId, query.restaurantId)];

    const view = query.view ?? "awaiting";
    if (view === "awaiting") {
      conditions.push(eq(orderReadOrders.isActive, true));
    } else if (view === "completed") {
      conditions.push(eq(orderReadOrders.status, "served"));
    }

    if (query.status) {
      conditions.push(eq(orderReadOrders.status, query.status));
    }
    if (query.from) {
      conditions.push(gte(orderReadOrders.createdAt, query.from));
    }
    if (query.to) {
      conditions.push(lte(orderReadOrders.createdAt, `${query.to} 23:59:59`));
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          like(orderReadOrders.orderNumber, term),
          like(orderReadOrders.customerName, term),
          like(orderReadOrders.customerPhone, term)
        )!
      );
    }
    if (query.cursor) {
      conditions.push(sql`${orderReadOrders.createdAt} < ${query.cursor}`);
    }

    const rows = await db
      .select()
      .from(orderReadOrders)
      .where(and(...conditions))
      .orderBy(desc(orderReadOrders.createdAt))
      .limit(limit);

    return this.attachLineItems(rows);
  }

  async getOrderDetail(
    query: PrintWorkspaceOrderDetailQuery
  ): Promise<{ order: PrintWorkspaceOrderDto; timeline: PrintWorkspaceTimelineEventDto[] } | null> {
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

    const timelineRows = await db
      .select()
      .from(orderReadOrderTimeline)
      .where(
        and(
          eq(orderReadOrderTimeline.restaurantId, query.restaurantId),
          eq(orderReadOrderTimeline.orderId, query.orderId)
        )
      )
      .orderBy(orderReadOrderTimeline.occurredAt);

    const timeline: PrintWorkspaceTimelineEventDto[] = timelineRows.map((t) => ({
      eventId: t.eventId,
      fromStatus: t.fromStatus,
      toStatus: t.toStatus,
      occurredAt: t.occurredAt,
    }));

    return {
      order: mapOrder(row, lineItems),
      timeline,
    };
  }

  private async attachLineItems(rows: OrderRow[]): Promise<PrintWorkspaceOrderDto[]> {
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
