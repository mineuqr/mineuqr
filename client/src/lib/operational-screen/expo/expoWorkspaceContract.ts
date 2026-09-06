import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import { resolveOperationalScreenAction } from "../interaction/deviceOrderExecutionCapabilities";

/**
 * KITCHEN-READY-ACTION-UNIFICATION-1
 * Ready (`mark-ready`) is shared on the operational screen:
 * Kitchen Screen and Expo may both transition preparing → ready.
 * Expo additionally owns serve-order. Kitchen does not.
 */
export const OPERATIONAL_SCREEN_MARK_READY_ROLES = [
  "kitchen_display",
  "expo_display",
] as const satisfies readonly OperationalDeviceRole[];

/** Expo-owned serve transition — Kitchen must not gain serve-order. */
export const EXPO_OPERATIONAL_SERVE_ACTIONS = ["serve-order"] as const satisfies readonly OperationalActionId[];

const OPERATIONAL_SCREEN_ROLES: OperationalDeviceRole[] = [
  "kitchen_display",
  "expo_display",
  "pickup_display",
  "customer_display",
  "print_monitor",
  "self_ordering_kiosk",
  "waiter_display",
];

/** True when the operational screen exposes mark-ready for preparing tickets. */
export function operationalScreenExposesMarkReady(role: OperationalDeviceRole): boolean {
  return resolveOperationalScreenAction(role, "preparing")?.id === "mark-ready";
}

/** Roles that may expose mark-ready on the operational screen — Kitchen and Expo. */
export function rolesExposingMarkReadyOnOperationalScreen(): OperationalDeviceRole[] {
  return OPERATIONAL_SCREEN_ROLES.filter(operationalScreenExposesMarkReady);
}

/** Expo-owned completion actions available on the operational screen for a ticket status. */
export function resolveExpoOperationalScreenAction(
  orderStatus: Parameters<typeof resolveOperationalScreenAction>[1]
) {
  return resolveOperationalScreenAction("expo_display", orderStatus);
}
