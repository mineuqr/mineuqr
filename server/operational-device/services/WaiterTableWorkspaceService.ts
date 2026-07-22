/**
 * WAITER-TABLE-WORKSPACE-1 — assembles Waiter Table Workspace Operational DTO
 * from Order Read projections + dining session aggregate fields.
 * No Order Domain / Session Platform / materializer changes.
 */
import { TRPCError } from "@trpc/server";
import {
  findActiveSession,
  findSessionById,
} from "../../diningSession/sessionRepository";
import type { ActiveOrderItemDto } from "../../order/read/domain/contracts/queryContracts";
import { DrizzleOrderOperationalReadStore } from "../../order/read/infrastructure/DrizzleOrderOperationalReadStore";
import type {
  WaiterFloorTableDto,
  WaiterTableWorkspaceDto,
  WaiterWorkspaceLineItemDto,
  WaiterWorkspaceOrderDto,
} from "../domain/waiterTableWorkspaceDto";
import { getTablesByRestaurant } from "../../db";
import { getCheckById } from "../../operational-session/check/CheckService";

const orderReadStore = new DrizzleOrderOperationalReadStore();

function mapLineItem(
  item: ActiveOrderItemDto["lineItems"][number]
): WaiterWorkspaceLineItemDto {
  return {
    lineItemId: item.lineItemId,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    quantity: item.quantity,
    price: item.price,
    itemNotes: item.itemNotes,
    /** Forward projected modifiers only — no reconstruction. */
    modifiers: item.modifiers,
  };
}

function mapOrder(order: ActiveOrderItemDto): WaiterWorkspaceOrderDto {
  return {
    orderId: order.orderId,
    displayReference: order.displayReference,
    status: order.status,
    createdAt: order.createdAt,
    notes: order.notes,
    totalAmount: order.totalAmount,
    lineItems: order.lineItems.map(mapLineItem),
  };
}

function formatSessionTotal(raw: string | number | null | undefined): string {
  if (raw == null) return "0.00";
  const n = Number.parseFloat(String(raw));
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

export async function getWaiterTableWorkspace(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<WaiterTableWorkspaceDto> {
  const session = await findSessionById(input.sessionId);
  if (!session || session.restaurantId !== input.restaurantId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }

  const projectedOrders = await orderReadStore.listOrdersBySessionId({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
  });

  const orders = projectedOrders.map(mapOrder);

  // CHECK-GENERALIZATION-M5 — prefer Check grandTotal for billing display.
  let sessionTotalAmount = formatSessionTotal(session.totalAmount);
  if (session.activeCheckId != null) {
    const check = await getCheckById({
      restaurantId: input.restaurantId,
      checkId: session.activeCheckId,
    });
    if (check) {
      sessionTotalAmount = formatSessionTotal(check.grandTotal);
    }
  }

  return {
    sessionId: session.id,
    tableId: session.tableId,
    tableNumber: session.tableNumber,
    sessionStatus: session.status,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    orderCount: session.totalOrders ?? orders.length,
    sessionTotalAmount,
    orders,
  };
}

/** Floor overview rows — lightweight; includes session total when occupied. */
export async function listWaiterFloorTables(
  restaurantId: number
): Promise<WaiterFloorTableDto[]> {
  const tables = await getTablesByRestaurant(restaurantId);
  const rows = await Promise.all(
    tables.map(async (table) => {
      const active = await findActiveSession(restaurantId, table.id);
      let sessionTotalAmount: string | null = null;
      if (active) {
        sessionTotalAmount = formatSessionTotal(active.totalAmount);
        if (active.activeCheckId != null) {
          const check = await getCheckById({
            restaurantId,
            checkId: active.activeCheckId,
          });
          if (check) {
            sessionTotalAmount = formatSessionTotal(check.grandTotal);
          }
        }
      }
      return {
        id: table.id,
        tableNumber: table.tableNumber,
        nameAr: table.nameAr,
        nameEn: table.nameEn,
        status: active ? ("occupied" as const) : ("available" as const),
        sessionId: active?.id ?? null,
        sessionStatus: active?.status ?? null,
        totalOrders: active?.totalOrders ?? null,
        sessionTotalAmount,
      };
    })
  );
  return rows.sort((a, b) => a.tableNumber - b.tableNumber);
}
