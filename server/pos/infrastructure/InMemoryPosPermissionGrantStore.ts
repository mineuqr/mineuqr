import type { PosPermission } from "@shared/pos";
import type {
  PosPermissionGrant,
  PosPermissionGrantStore,
} from "./PosPermissionGrantStore";

function key(grant: {
  restaurantId: number;
  userId: number;
  permission: PosPermission;
}): string {
  return `${grant.restaurantId}:${grant.userId}:${grant.permission}`;
}

export class InMemoryPosPermissionGrantStore implements PosPermissionGrantStore {
  private readonly rows = new Map<string, PosPermissionGrant>();

  async listByRestaurantUser(
    restaurantId: number,
    userId: number
  ): Promise<readonly PosPermissionGrant[]> {
    return Array.from(this.rows.values()).filter(
      (row) => row.restaurantId === restaurantId && row.userId === userId
    );
  }

  async hasGrant(
    restaurantId: number,
    userId: number,
    permission: PosPermission
  ): Promise<boolean> {
    return this.rows.has(key({ restaurantId, userId, permission }));
  }

  async hasAnyGrant(restaurantId: number, userId: number): Promise<boolean> {
    return (await this.listByRestaurantUser(restaurantId, userId)).length > 0;
  }

  async upsert(grant: PosPermissionGrant): Promise<PosPermissionGrant> {
    const existing = this.rows.get(key(grant));
    if (existing) return existing;
    this.rows.set(key(grant), grant);
    return grant;
  }

  async remove(
    restaurantId: number,
    userId: number,
    permission: PosPermission
  ): Promise<boolean> {
    return this.rows.delete(key({ restaurantId, userId, permission }));
  }
}
