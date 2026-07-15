/**
 * WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1 — device-authenticated waiter floor ops.
 * Reuses Session Platform + IdentityPlaceOrder (WAITER scope). No parallel engines.
 */
import { TRPCError } from "@trpc/server";
import {
  createTableFulfilmentAnchor,
  deriveFulfilmentLabel,
} from "@shared/ordering-platform/orderingIdentityContract";
import { createTableSessionAnchor } from "@shared/operational-session";
import {
  getTableById,
  getTableByRestaurantAndNumber,
} from "../../db";
import { throwSessionServiceTrpcError } from "../../diningSession/mapSessionErrorToTrpc";
import { resolveOperationalSession } from "../../operational-session";
import { identityPlaceOrderService } from "../../order/placeOrderComposition";
import { runOrderCommand } from "../../order/application/mapOrderDomainError";
import type { OperationalDeviceSession } from "../domain/deviceContracts";
import { rolePermitsWaiterOrdering } from "../domain/deviceRoles";
import {
  getWaiterTableWorkspace,
  listWaiterFloorTables,
} from "./WaiterTableWorkspaceService";

function assertWaiterDevice(session: OperationalDeviceSession): void {
  if (!rolePermitsWaiterOrdering(session.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Role cannot host waiter ordering",
    });
  }
}

export async function listWaiterFloorTablesForDevice(
  session: OperationalDeviceSession
) {
  assertWaiterDevice(session);
  return listWaiterFloorTables(session.restaurantId);
}

export async function getWaiterTableWorkspaceForDevice(
  session: OperationalDeviceSession,
  input: { sessionId: number }
) {
  assertWaiterDevice(session);
  return getWaiterTableWorkspace({
    restaurantId: session.restaurantId,
    sessionId: input.sessionId,
  });
}

export async function attachWaiterTableForDevice(
  session: OperationalDeviceSession,
  input: { tableId: number; tableNumber: number }
) {
  assertWaiterDevice(session);
  const restaurantId = session.restaurantId;
  const table = await getTableById(input.tableId);
  if (
    !table ||
    table.restaurantId !== restaurantId ||
    table.tableNumber !== input.tableNumber
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
  }

  try {
    const sessionResult = await resolveOperationalSession({
      restaurantId,
      anchor: createTableSessionAnchor({
        tableId: table.id,
        tableNumber: table.tableNumber,
      }),
    });

    if (!sessionResult.session) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "تعذر فتح جلسة الطاولة",
      });
    }

    return {
      restaurantId,
      tableId: table.id,
      tableNumber: table.tableNumber,
      sessionId: sessionResult.session.id,
      sessionToken: sessionResult.session.sessionToken,
      sessionStatus: sessionResult.session.status,
      created: sessionResult.created,
      persistence: sessionResult.persistence,
    };
  } catch (err) {
    throwSessionServiceTrpcError(err);
  }
}

export async function placeWaiterOrderForDevice(
  session: OperationalDeviceSession,
  input: {
    serviceMode: "table_service";
    fulfilmentAnchor: {
      anchorType: "table";
      tableId: number;
      tableNumber: number;
      fulfilmentLabel?: string;
    };
    customerName?: string | null;
    customerPhone?: string | null;
    notes?: string | null;
    items: Array<{ menuItemId: number; quantity: number; notes?: string | null }>;
    sessionToken: string;
  }
) {
  assertWaiterDevice(session);
  const restaurantId = session.restaurantId;

  const fulfilmentAnchor = createTableFulfilmentAnchor(input.fulfilmentAnchor);
  const table = await getTableByRestaurantAndNumber(
    restaurantId,
    fulfilmentAnchor.tableNumber
  );
  if (!table || table.id !== fulfilmentAnchor.tableId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "الطاولة غير موجودة" });
  }

  try {
    const placeResult = await runOrderCommand(() =>
      identityPlaceOrderService.execute({
        restaurantId,
        serviceMode: "table_service",
        fulfilmentAnchor,
        sessionToken: input.sessionToken,
        identityScope: "WAITER",
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        notes: input.notes,
        items: input.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        })),
      })
    );

    if (!placeResult.identity.operationalSession.sessionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "يجب ربط الطلب بجلسة المطعم",
      });
    }

    return {
      orderId: placeResult.order.id,
      orderNumber: placeResult.orderNumber,
      trackingToken: placeResult.trackingToken,
      displayReference: placeResult.displayReference,
      fulfilmentLabel: deriveFulfilmentLabel(fulfilmentAnchor),
      tableNumber: fulfilmentAnchor.tableNumber,
      totalAmount: placeResult.totalAmount,
      itemCount: placeResult.itemCount,
      createdAt: placeResult.createdAt,
      status: "pending" as const,
      sessionPersistence: placeResult.sessionPersistence,
      sessionToken: placeResult.identity.operationalSession.sessionToken,
    };
  } catch (err) {
    throwSessionServiceTrpcError(err);
  }
}
