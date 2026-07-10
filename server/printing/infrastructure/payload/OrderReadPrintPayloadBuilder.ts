import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  orderReadOrderLineItems,
  orderReadOrders,
} from "../../../../drizzle/schema";
import type { BuildPrintPayloadInput, PrintPayloadBuilderPort } from "../../contracts/PrintPayloadBuilderPort";
import {
  PRINT_PAYLOAD_SCHEMA_VERSION,
  type PrintPayload,
} from "../../domain/PrintPayload";
import { mapActiveOrderItemDto } from "../../../order/read/presentation/mapActiveOrderItemDto";
import { mapStoredOrderReadLineItem } from "../../../order/read/infrastructure/persistence/mapStoredOrderReadLineItem";

/**
 * Builds canonical print payloads from order read projections only.
 */
export class OrderReadPrintPayloadBuilder implements PrintPayloadBuilderPort {
  async build(input: BuildPrintPayloadInput): Promise<PrintPayload | null> {
    const db = await getDb();
    if (!db) return null;

    const [order] = await db
      .select()
      .from(orderReadOrders)
      .where(
        and(
          eq(orderReadOrders.restaurantId, input.restaurantId),
          eq(orderReadOrders.orderId, input.orderId)
        )
      )
      .limit(1);

    if (!order) return null;

    const lineItemRows = await db
      .select()
      .from(orderReadOrderLineItems)
      .where(
        and(
          eq(orderReadOrderLineItems.restaurantId, input.restaurantId),
          eq(orderReadOrderLineItems.orderId, input.orderId)
        )
      );

    const requestedAt = input.requestedAt ?? new Date().toISOString();
    const identity = mapActiveOrderItemDto({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      businessDay: order.businessDay ?? null,
      dailyDisplayNumber: order.dailyDisplayNumber ?? null,
      status: order.status,
      tableNumber: order.tableNumber,
      sessionId: order.sessionId ?? null,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: order.notes,
      totalAmount: String(order.totalAmount),
      createdAt: order.createdAt,
      readyAt: order.readyAt ?? null,
      lineItems: lineItemRows.map(mapStoredOrderReadLineItem),
    });

    return {
      schemaVersion: PRINT_PAYLOAD_SCHEMA_VERSION,
      restaurantId: order.restaurantId,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      displayOrderNumber: identity.displayOrderNumber,
      displayReference: identity.displayReference,
      businessDay: identity.businessDay,
      orderStatus: order.status,
      tableNumber: order.tableNumber,
      customerName: order.customerName ?? null,
      customerPhone: order.customerPhone ?? null,
      notes: order.notes ?? null,
      totalAmount: String(order.totalAmount),
      createdAt: order.createdAt,
      lineItems: lineItemRows.map((item) => ({
        lineItemId: item.lineItemId,
        menuItemId: item.menuItemId,
        nameAr: item.nameAr,
        nameEn: item.nameEn ?? null,
        quantity: item.quantity,
        price: String(item.price),
      })),
      requestedAt,
      trigger: input.trigger,
    };
  }
}
