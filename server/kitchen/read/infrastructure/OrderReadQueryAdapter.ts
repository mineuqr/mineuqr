import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  orderReadOrderLineItems,
  orderReadOrders,
  orderReadOrderTimeline,
} from "../../../../drizzle/schema";
import type { KitchenPipelineStatus } from "../contracts/kitchenQueryContracts";
import type { ActiveOrderLineItemDto } from "../../../order/read/domain/contracts/queryContracts";
import { mapActiveOrderItemDto } from "../../../order/read/presentation/mapActiveOrderItemDto";
import { mapStoredOrderReadLineItem } from "../../../order/read/infrastructure/persistence/mapStoredOrderReadLineItem";
import { KITCHEN_READ_DATABASE_UNAVAILABLE } from "../domain/kitchenReadErrorCodes";
import { operationalLifecycleFilter } from "../../../order/read/projections/materializers/projectionLifecycle";

export type OrderReadPipelineOrderRow = {
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  displayOrderNumber: string;
  displayReference: string;
  status: KitchenPipelineStatus;
  tableId: number;
  tableNumber: number;
  sessionId: number | null;
  serviceMode: string;
  fulfilmentAnchorType: string;
  fulfilmentLabel: string;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  totalAmount: string;
  createdAt: string;
  readyAt: string | null;
  lastEventId: string | null;
  lineItems: ActiveOrderLineItemDto[];
};

export type OrderReadTimelineRow = {
  orderId: number;
  eventId: string;
  fromStatus: string | null;
  toStatus: string;
  occurredAt: string;
};

export type OrderReadQueryPort = {
  listPipelineOrders(restaurantId: number): Promise<OrderReadPipelineOrderRow[]>;
  listTimelinesForOrders(
    restaurantId: number,
    orderIds: number[]
  ): Promise<Map<number, OrderReadTimelineRow[]>>;
};

/**
 * Read-only adapter over certified order read projections (P-02, P-04, line items).
 */
export class DrizzleOrderReadQueryAdapter implements OrderReadQueryPort {
  async listPipelineOrders(restaurantId: number): Promise<OrderReadPipelineOrderRow[]> {
    const db = await getDb();
    if (!db) {
      throw new Error(KITCHEN_READ_DATABASE_UNAVAILABLE);
    }

    const rows = await db
      .select()
      .from(orderReadOrders)
      .where(
        and(
          eq(orderReadOrders.restaurantId, restaurantId),
          eq(orderReadOrders.lifecycleStage, operationalLifecycleFilter())
        )
      )
      .orderBy(asc(orderReadOrders.createdAt));

    const pipeline = rows.filter((row) =>
      (["pending", "preparing", "ready"] as const).includes(row.status as KitchenPipelineStatus)
    );

    if (pipeline.length === 0) return [];

    const orderIds = pipeline.map((row) => row.orderId);
    const lineItems = await db
      .select()
      .from(orderReadOrderLineItems)
      .where(
        and(
          eq(orderReadOrderLineItems.restaurantId, restaurantId),
          inArray(orderReadOrderLineItems.orderId, orderIds)
        )
      );

    const byOrder = new Map<number, OrderReadPipelineOrderRow["lineItems"]>();
    for (const li of lineItems) {
      const list = byOrder.get(li.orderId) ?? [];
      list.push(mapStoredOrderReadLineItem(li));
      byOrder.set(li.orderId, list);
    }

    return pipeline.map((row) => {
      const lineItems = byOrder.get(row.orderId) ?? [];
      const mapped = mapActiveOrderItemDto({
        orderId: row.orderId,
        orderNumber: row.orderNumber,
        businessDay: row.businessDay ?? null,
        dailyDisplayNumber: row.dailyDisplayNumber ?? null,
        status: row.status,
        lifecycle: row.lifecycleStage,
        tableNumber: row.tableNumber,
        sessionId: row.sessionId ?? null,
        serviceMode: row.serviceMode,
        fulfilmentAnchorType: row.fulfilmentAnchorType,
        fulfilmentLabel: row.fulfilmentLabel,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        notes: row.notes,
        totalAmount: String(row.totalAmount),
        createdAt: row.createdAt,
        readyAt: row.readyAt ?? null,
        lineItems,
      });

      return {
        restaurantId: row.restaurantId,
        orderId: row.orderId,
        orderNumber: mapped.orderNumber,
        businessDay: mapped.businessDay,
        dailyDisplayNumber: mapped.dailyDisplayNumber,
        displayOrderNumber: mapped.displayOrderNumber,
        displayReference: mapped.displayReference,
        status: row.status as KitchenPipelineStatus,
        tableId: row.tableId,
        tableNumber: row.tableNumber,
        sessionId: row.sessionId ?? null,
        serviceMode: mapped.serviceMode,
        fulfilmentAnchorType: mapped.fulfilmentAnchorType,
        fulfilmentLabel: mapped.fulfilmentLabel,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        notes: row.notes,
        totalAmount: String(row.totalAmount),
        createdAt: row.createdAt,
        readyAt: row.readyAt ?? null,
        lastEventId: row.lastEventId ?? null,
        lineItems,
      };
    });
  }

  async listTimelinesForOrders(
    restaurantId: number,
    orderIds: number[]
  ): Promise<Map<number, OrderReadTimelineRow[]>> {
    const result = new Map<number, OrderReadTimelineRow[]>();
    if (orderIds.length === 0) return result;

    const db = await getDb();
    if (!db) return result;

    const rows = await db
      .select()
      .from(orderReadOrderTimeline)
      .where(
        and(
          eq(orderReadOrderTimeline.restaurantId, restaurantId),
          inArray(orderReadOrderTimeline.orderId, orderIds)
        )
      )
      .orderBy(asc(orderReadOrderTimeline.occurredAt));

    for (const row of rows) {
      const list = result.get(row.orderId) ?? [];
      list.push({
        orderId: row.orderId,
        eventId: row.eventId,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        occurredAt: row.occurredAt,
      });
      result.set(row.orderId, list);
    }

    return result;
  }
}
