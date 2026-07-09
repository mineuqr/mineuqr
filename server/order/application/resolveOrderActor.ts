import type { SelectUser } from "../../../drizzle/schema";
import type { OperationalDeviceSession } from "../../operational-device/domain/deviceContracts";
import type {
  DeviceActor,
  OrderActor,
  SystemActor,
  UserActor,
  UserDashboardRole,
} from "../domain/value-objects/OrderActor";

/** Resolve OrderActor from authenticated dashboard user context. */
export function resolveOrderActorFromUser(
  user: SelectUser,
  restaurantId: number,
  restaurantOwnerUserId: number
): UserActor {
  const dashboardRole: UserDashboardRole =
    user.role === "admin" || user.id === restaurantOwnerUserId ? "owner" : "staff";

  return {
    kind: "user",
    userId: user.id,
    dashboardRole,
    displayName: user.name ?? null,
    restaurantId,
  };
}

/** Resolve OrderActor from authenticated operational device session. */
export function resolveOrderActorFromDeviceSession(
  session: OperationalDeviceSession
): DeviceActor {
  return {
    kind: "device",
    deviceId: session.deviceId,
    tokenId: session.tokenId,
    deviceRole: session.role,
    displayName: session.displayName,
    restaurantId: session.restaurantId,
  };
}

/** Resolve OrderActor for automated internal processes. */
export function resolveOrderActorFromSystem(
  processId: string,
  options?: { displayName?: string | null; restaurantId?: number | null }
): SystemActor {
  return {
    kind: "system",
    processId,
    displayName: options?.displayName ?? null,
    restaurantId: options?.restaurantId ?? null,
  };
}

export function orderActorAuditMetadata(actor: OrderActor): Record<string, unknown> {
  return {
    actorKind: actor.kind,
    actorIdentifier:
      actor.kind === "user"
        ? actor.userId
        : actor.kind === "device"
          ? actor.deviceId
          : actor.processId,
    actorDisplayName: actor.displayName,
    restaurantId: actor.restaurantId,
    ...(actor.kind === "user" ? { dashboardRole: actor.dashboardRole } : {}),
    ...(actor.kind === "device"
      ? { deviceRole: actor.deviceRole, tokenId: actor.tokenId }
      : {}),
  };
}
