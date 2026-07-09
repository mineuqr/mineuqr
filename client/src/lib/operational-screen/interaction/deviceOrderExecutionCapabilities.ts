import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import {
  resolvePrimaryDeviceOrderAction,
  rolePermitsOrderExecution,
  type DeviceOrderLifecycleStatus,
} from "../../../../../server/operational-device/domain/deviceOrderExecution";
import {
  getOperationalActionById,
  type OperationalAction,
} from "@/lib/operational-workspace/operationalActions";

export function canExecuteOperationalTicketActions(role: OperationalDeviceRole): boolean {
  return rolePermitsOrderExecution(role);
}

export function resolveDeviceOperationalAction(
  role: OperationalDeviceRole,
  orderStatus: DeviceOrderLifecycleStatus
): OperationalAction | null {
  const actionId = resolvePrimaryDeviceOrderAction(role, orderStatus);
  if (!actionId) return null;
  return getOperationalActionById(actionId);
}
