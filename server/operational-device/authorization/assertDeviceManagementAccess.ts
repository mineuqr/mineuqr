/**
 * COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1
 * Restaurant/RBAC first, then commercial devices entitlement.
 */

import type { SelectUser } from "../../../drizzle/schema";
import { assertRestaurantAccess } from "../../restaurantAccess";
import { requireDevicesFeature } from "./requireDevicesFeature";

type AuthContext = { user: SelectUser };

export async function assertDeviceManagementAccess(
  ctx: AuthContext,
  restaurantId: number,
  action: string,
  now?: Date
): Promise<void> {
  await assertRestaurantAccess(ctx, restaurantId, action);
  await requireDevicesFeature(ctx.user.id, now);
}
