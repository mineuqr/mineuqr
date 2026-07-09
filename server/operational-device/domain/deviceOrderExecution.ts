import type { OperationalDeviceRole } from "./deviceRoles";

/** Advance-only device actions — aligned with operational action vocabulary. */
export const DEVICE_ORDER_ACTION_IDS = [
  "accept-order",
  "start-preparing",
  "mark-ready",
  "serve-order",
] as const;

export type DeviceOrderActionId = (typeof DEVICE_ORDER_ACTION_IDS)[number];

export type DeviceOrderLifecycleStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

const ROLE_PERMITTED_ACTIONS: Record<OperationalDeviceRole, DeviceOrderActionId[]> = {
  kitchen_display: ["accept-order", "mark-ready"],
  expo_display: ["mark-ready", "serve-order"],
  pickup_display: ["serve-order"],
  customer_display: [],
  print_monitor: [],
  self_ordering_kiosk: [],
};

const ACTION_REQUIRED_STATUS: Record<DeviceOrderActionId, DeviceOrderLifecycleStatus> = {
  "accept-order": "pending",
  "start-preparing": "pending",
  "mark-ready": "preparing",
  "serve-order": "ready",
};

const ACTION_TARGET_STATUS: Record<DeviceOrderActionId, DeviceOrderLifecycleStatus> = {
  "accept-order": "preparing",
  "start-preparing": "preparing",
  "mark-ready": "ready",
  "serve-order": "served",
};

export function rolePermitsOrderExecution(role: OperationalDeviceRole): boolean {
  return (ROLE_PERMITTED_ACTIONS[role]?.length ?? 0) > 0;
}

export function rolePermitsOrderAction(
  role: OperationalDeviceRole,
  action: DeviceOrderActionId
): boolean {
  return ROLE_PERMITTED_ACTIONS[role]?.includes(action) ?? false;
}

export function targetStatusForDeviceAction(action: DeviceOrderActionId): DeviceOrderLifecycleStatus {
  return ACTION_TARGET_STATUS[action];
}

export function resolvePrimaryDeviceOrderAction(
  role: OperationalDeviceRole,
  orderStatus: DeviceOrderLifecycleStatus
): DeviceOrderActionId | null {
  for (const action of ROLE_PERMITTED_ACTIONS[role] ?? []) {
    if (ACTION_REQUIRED_STATUS[action] === orderStatus) {
      return action;
    }
  }
  return null;
}

export function validateDeviceOrderAction(
  role: OperationalDeviceRole,
  action: DeviceOrderActionId,
  orderStatus: DeviceOrderLifecycleStatus
): { ok: true } | { ok: false; code: "role_forbidden" | "status_mismatch" | "invalid_action" } {
  if (!DEVICE_ORDER_ACTION_IDS.includes(action)) {
    return { ok: false, code: "invalid_action" };
  }
  if (!rolePermitsOrderAction(role, action)) {
    return { ok: false, code: "role_forbidden" };
  }
  if (ACTION_REQUIRED_STATUS[action] !== orderStatus) {
    return { ok: false, code: "status_mismatch" };
  }
  return { ok: true };
}
