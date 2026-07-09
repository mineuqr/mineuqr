/**
 * ORDER-ACTOR-MODEL-1 — canonical order execution identity.
 * Single source of truth for every entity that performs order operations.
 */

export type UserDashboardRole = "owner" | "staff";

export type UserActor = {
  readonly kind: "user";
  readonly userId: number;
  readonly dashboardRole: UserDashboardRole;
  readonly displayName: string | null;
  readonly restaurantId: number;
};

export type DeviceActor = {
  readonly kind: "device";
  readonly deviceId: string;
  readonly tokenId: string;
  readonly deviceRole: string;
  readonly displayName: string;
  readonly restaurantId: number;
};

export type SystemActor = {
  readonly kind: "system";
  readonly processId: string;
  readonly displayName: string | null;
  readonly restaurantId: number | null;
};

export type OrderActor = UserActor | DeviceActor | SystemActor;

export function orderActorIdentifier(actor: OrderActor): string {
  switch (actor.kind) {
    case "user":
      return `user:${actor.userId}`;
    case "device":
      return `device:${actor.deviceId}`;
    case "system":
      return `system:${actor.processId}`;
  }
}

export function orderActorDisplayName(actor: OrderActor): string | null {
  switch (actor.kind) {
    case "user":
      return actor.displayName;
    case "device":
      return actor.displayName;
    case "system":
      return actor.displayName;
  }
}

export function orderActorRestaurantId(actor: OrderActor): number | null {
  return actor.restaurantId;
}

/** Dashboard users with owner/staff privilege may advance lifecycle transitions. */
export function canAdvanceOrder(actor: OrderActor): boolean {
  switch (actor.kind) {
    case "user":
      return actor.dashboardRole === "owner" || actor.dashboardRole === "staff";
    case "device":
      return true;
    case "system":
      return true;
  }
}

/** Cancellation remains a dashboard user capability — not device or system actors. */
export function canCancelOrder(actor: OrderActor): boolean {
  return actor.kind === "user" && (actor.dashboardRole === "owner" || actor.dashboardRole === "staff");
}

export function assertCanAdvanceOrder(actor: OrderActor): void {
  if (!canAdvanceOrder(actor)) {
    throw new Error("OrderActor cannot advance order status");
  }
}

export function assertCanCancelOrder(actor: OrderActor): void {
  if (!canCancelOrder(actor)) {
    throw new Error("OrderActor cannot cancel order");
  }
}
