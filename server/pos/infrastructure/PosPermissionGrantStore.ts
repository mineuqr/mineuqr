import type { PosPermission } from "@shared/pos";

export type PosPermissionGrant = {
  userId: number;
  restaurantId: number;
  permission: PosPermission;
};

export type PosPermissionGrantStore = {
  listByRestaurantUser(
    restaurantId: number,
    userId: number
  ): Promise<readonly PosPermissionGrant[]>;
  hasGrant(
    restaurantId: number,
    userId: number,
    permission: PosPermission
  ): Promise<boolean>;
  hasAnyGrant(restaurantId: number, userId: number): Promise<boolean>;
  upsert(grant: PosPermissionGrant): Promise<PosPermissionGrant>;
  remove(
    restaurantId: number,
    userId: number,
    permission: PosPermission
  ): Promise<boolean>;
};
