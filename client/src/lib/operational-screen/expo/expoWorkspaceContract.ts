import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import { resolveOperationalScreenAction } from "../interaction/deviceOrderExecutionCapabilities";

/**
 * EXPO-WORKSPACE-ARCHITECTURE-1 — Expo is the Final Operational Coordination Workspace.
 * Order completion (Ready transition) is owned exclusively by Expo on the operational screen.
 */
export const EXPO_EXCLUSIVE_OPERATIONAL_LIFECYCLE_ACTIONS = ["mark-ready"] as const satisfies readonly OperationalActionId[];

export type ExpoExclusiveOperationalLifecycleAction =
  (typeof EXPO_EXCLUSIVE_OPERATIONAL_LIFECYCLE_ACTIONS)[number];

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

/** Roles that may expose mark-ready on the operational screen — Expo only. */
export function rolesExposingMarkReadyOnOperationalScreen(): OperationalDeviceRole[] {
  return OPERATIONAL_SCREEN_ROLES.filter(operationalScreenExposesMarkReady);
}

/** Expo-owned completion actions available on the operational screen for a ticket status. */
export function resolveExpoOperationalScreenAction(
  orderStatus: Parameters<typeof resolveOperationalScreenAction>[1]
) {
  return resolveOperationalScreenAction("expo_display", orderStatus);
}
