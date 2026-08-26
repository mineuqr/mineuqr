/**
 * POS-TERMINAL-ACCESS-IMPLEMENTATION-1
 * Narrow POS restaurant-scope helper. Does not replace assertRestaurantAccess.
 */

import { TRPCError } from "@trpc/server";
import type { SelectUser } from "../../../drizzle/schema";
import { getRestaurantById } from "../../db";
import { logTenantBoundaryViolation } from "../../_core/authAudit";
import { trackSuspiciousActivity } from "../../_core/suspiciousActivity";
import type { PosRestaurantScopeKind } from "@shared/pos";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";

const FORBIDDEN_MESSAGE = "غير مصرح بالوصول";

type AuthContext = { user: SelectUser };

export type RestaurantPosTaxSettings = {
  taxEnabled?: boolean | null;
  taxMode?: string | null;
  taxPolicyJson?: string | null;
  currencyCode: string | null;
  currencySymbol: string | null;
};

export type RestaurantPosScope = {
  kind: PosRestaurantScopeKind;
  restaurantId: number;
  ownerUserId: number;
  /** From the same getRestaurantById used for POS scope. Not a second read. */
  taxSettings: RestaurantPosTaxSettings;
};

export async function resolveRestaurantPosScope(
  ctx: AuthContext,
  restaurantId: number,
  grants: PosPermissionGrantStore,
  action = "pos.scope"
): Promise<RestaurantPosScope | null> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return null;
  const taxSettings: RestaurantPosTaxSettings = {
    taxEnabled: (restaurant as { taxEnabled?: boolean | null }).taxEnabled,
    taxMode: (restaurant as { taxMode?: string | null }).taxMode,
    taxPolicyJson: (restaurant as { taxPolicyJson?: string | null }).taxPolicyJson,
    currencyCode: restaurant.currencyCode ?? null,
    currencySymbol: restaurant.currencySymbol ?? null,
  };
  if (restaurant.userId === ctx.user.id) {
    return { kind: "owner", restaurantId, ownerUserId: restaurant.userId, taxSettings };
  }
  if (ctx.user.role === "admin") {
    return { kind: "admin", restaurantId, ownerUserId: restaurant.userId, taxSettings };
  }
  if (await grants.hasAnyGrant(restaurantId, ctx.user.id)) {
    return { kind: "pos_grant", restaurantId, ownerUserId: restaurant.userId, taxSettings };
  }
  void action;
  return null;
}

export async function assertRestaurantPosScope(
  ctx: AuthContext,
  restaurantId: number,
  grants: PosPermissionGrantStore,
  action = "pos.scope"
): Promise<RestaurantPosScope> {
  const scope = await resolveRestaurantPosScope(ctx, restaurantId, grants, action);
  if (scope) return scope;
  logTenantBoundaryViolation(ctx.user, restaurantId, action);
  trackSuspiciousActivity({
    signal: "tenant_boundary_violation",
    category: "TENANT",
    actorId: ctx.user?.id ?? null,
    role: ctx.user?.role ?? null,
    restaurantId,
    procedure: action,
    action,
    metadata: { restaurantId, action, boundary: "pos_scope" },
  });
  throw new TRPCError({ code: "FORBIDDEN", message: FORBIDDEN_MESSAGE });
}
