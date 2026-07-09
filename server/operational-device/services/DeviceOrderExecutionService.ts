import { TRPCError } from "@trpc/server";
import { opsLog } from "../../_core/opsLog";
import { getOrderById } from "../../db";
import { runOrderCommand } from "../../order/application/mapOrderDomainError";
import { advanceOrderStatusService } from "../../order/composition";
import {
  orderActorAuditMetadata,
  resolveOrderActorFromDeviceSession,
} from "../../order/application/resolveOrderActor";
import type { OperationalDeviceSession } from "../domain/deviceContracts";
import {
  targetStatusForDeviceAction,
  validateDeviceOrderAction,
  type DeviceOrderActionId,
  type DeviceOrderLifecycleStatus,
} from "../domain/deviceOrderExecution";

export type ExecuteDeviceOrderActionInput = {
  session: OperationalDeviceSession;
  orderId: number;
  action: DeviceOrderActionId;
  correlationId?: string;
};

export type ExecuteDeviceOrderActionResult = {
  success: true;
  orderId: number;
  previousStatus: DeviceOrderLifecycleStatus;
  newStatus: DeviceOrderLifecycleStatus;
};

export async function executeDeviceOrderAction(
  input: ExecuteDeviceOrderActionInput
): Promise<ExecuteDeviceOrderActionResult> {
  const { session, orderId, action, correlationId } = input;

  const order = await getOrderById(orderId);
  if (!order) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
  }

  if (order.restaurantId !== session.restaurantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Order belongs to another restaurant" });
  }

  const orderStatus = order.status as DeviceOrderLifecycleStatus;
  const validation = validateDeviceOrderAction(session.role, action, orderStatus);
  if (!validation.ok) {
    const message =
      validation.code === "role_forbidden"
        ? "Role cannot execute this action"
        : validation.code === "status_mismatch"
          ? "Action is not valid for the current order status"
          : "Invalid action";
    throw new TRPCError({ code: "FORBIDDEN", message });
  }

  const targetStatus = targetStatusForDeviceAction(action);
  const actor = resolveOrderActorFromDeviceSession(session);

  const result = await runOrderCommand(() =>
    advanceOrderStatusService.execute({
      orderId,
      targetStatus,
      actor,
    })
  );

  opsLog({
    type: "device_order_action_executed",
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    correlationId,
    restaurantId: session.restaurantId,
    role: session.role,
    procedure: "operationalDevice.runtime.executeOrderAction",
    action,
    metadata: {
      ...orderActorAuditMetadata(actor),
      orderId,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
    },
  });

  return {
    success: true,
    orderId,
    previousStatus: result.previousStatus as DeviceOrderLifecycleStatus,
    newStatus: result.newStatus as DeviceOrderLifecycleStatus,
  };
}
