import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import {
  resolvePrimaryDeviceOrderAction,
  rolePermitsOrderExecution,
  type DeviceOrderLifecycleStatus,
} from "../../../../../server/operational-device/domain/deviceOrderExecution";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import {
  getOperationalActionById,
  type OperationalAction,
} from "@/lib/operational-workspace/operationalActions";

/** Acceptance belongs to Orders Workspace — never on the operational screen. */
const OPERATIONAL_SCREEN_EXCLUDED_ACTIONS: OperationalActionId[] = ["accept-order"];

export function canExecuteOperationalTicketActions(role: OperationalDeviceRole): boolean {
  return rolePermitsOrderExecution(role);
}

export function resolveOperationalScreenAction(
  role: OperationalDeviceRole,
  orderStatus: DeviceOrderLifecycleStatus
): OperationalAction | null {
  const actionId = resolvePrimaryDeviceOrderAction(role, orderStatus);
  if (!actionId || OPERATIONAL_SCREEN_EXCLUDED_ACTIONS.includes(actionId)) {
    return null;
  }
  return getOperationalActionById(actionId);
}

/** @deprecated Use resolveOperationalScreenAction for operational screen UI. */
export function resolveDeviceOperationalAction(
  role: OperationalDeviceRole,
  orderStatus: DeviceOrderLifecycleStatus
): OperationalAction | null {
  return resolveOperationalScreenAction(role, orderStatus);
}
