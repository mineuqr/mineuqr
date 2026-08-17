/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * Server-side POS read authorization. Tenant + terminal + explicit grant.
 * Does not trust client restaurantId/terminalId as sufficient.
 */

import type { PosAccessContext, PosPermission } from "@shared/pos";
import type { SelectUser } from "../../../drizzle/schema";
import { assertRestaurantPosScope } from "../authorization/assertRestaurantPosScope";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import { PosAccessService } from "./PosAccessService";
import { PosReadError } from "./PosReadError";

export async function requirePosReadContext(
  access: PosAccessService,
  grants: PosPermissionGrantStore,
  input: {
    user: SelectUser;
    restaurantId: number;
    terminalId: string;
    procedure: string;
    permission?: PosPermission;
  }
): Promise<PosAccessContext> {
  const scope = await assertRestaurantPosScope(
    { user: input.user },
    input.restaurantId,
    grants,
    input.procedure
  );
  const decision = await access.resolvePosTerminalAccess({
    restaurantId: input.restaurantId,
    terminalId: input.terminalId,
    userId: input.user.id,
    requiredPermission: input.permission ?? "POS_ACCESS",
    restaurantScope: scope.kind,
  });
  if (!decision.allowed || !decision.context) {
    throw new PosReadError(
      decision.reasonCode || "pos_permission_denied",
      "غير مصرح بالوصول"
    );
  }
  return decision.context;
}
