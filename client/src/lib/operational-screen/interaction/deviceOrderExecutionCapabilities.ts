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

/**
 * KITCHEN-LIFECYCLE-OWNERSHIP-1 — kitchen runtime is not the owner of order completion.
 * Partial category projections cannot truthfully complete the full order lifecycle.
 */
const KITCHEN_RUNTIME_FORBIDDEN_LIFECYCLE_ACTIONS: OperationalActionId[] = ["mark-ready"];

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
  if (
    role === "kitchen_display" &&
    KITCHEN_RUNTIME_FORBIDDEN_LIFECYCLE_ACTIONS.includes(actionId)
  ) {
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
