import type { OperationalDeviceRole } from "../../../../server/operational-device/domain/deviceRoles";

/**
 * KITCHEN-READY-ACTION-UNIFICATION-1
 * Active Kitchen Screen queue = orders not yet `ready`.
 * Expo keeps the full pipeline including ready (serve-order).
 */
export type KitchenRuntimeQueueStatusFilter = "active" | "all";

export function kitchenQueueStatusForRole(
  role: OperationalDeviceRole | undefined
): KitchenRuntimeQueueStatusFilter {
  return role === "kitchen_display" ? "active" : "all";
}
