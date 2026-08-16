/**
 * POS-PERSISTENCE-WIRING-1
 * Production POS permission grant persistence against pos_permission_grants (0092).
 * POS-scoped grants only. Not restaurant RBAC.
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { isPosPermission, type PosPermission } from "@shared/pos";
import { posPermissionGrants } from "../../../drizzle/schema";
import { getDb } from "../../db";
import { readMysqlAffectedRows } from "../../db/mysqlAffectedRows";
import type {
  PosPermissionGrant,
  PosPermissionGrantStore,
} from "./PosPermissionGrantStore";
import {
  POS_DATABASE_UNAVAILABLE,
  type LoadPosDb,
  isMysqlDuplicateKeyError,
  toMysqlTimestampString,
} from "./posPersistenceErrors";

function mapGrant(row: typeof posPermissionGrants.$inferSelect): PosPermissionGrant | null {
  if (!isPosPermission(row.permission)) return null;
  return {
    restaurantId: row.restaurantId,
    userId: row.userId,
    permission: row.permission,
  };
}

export class DrizzlePosPermissionGrantStore implements PosPermissionGrantStore {
  constructor(private readonly loadDb: LoadPosDb = getDb) {}

  private async requireDb() {
    const db = await this.loadDb();
    if (!db) throw new Error(POS_DATABASE_UNAVAILABLE);
    return db;
  }

  async listByRestaurantUser(
    restaurantId: number,
    userId: number
  ): Promise<readonly PosPermissionGrant[]> {
    const db = await this.requireDb();
    const rows = await db
      .select()
      .from(posPermissionGrants)
      .where(
        and(
          eq(posPermissionGrants.restaurantId, restaurantId),
          eq(posPermissionGrants.userId, userId)
        )
      );
    return rows
      .map(mapGrant)
      .filter((grant): grant is PosPermissionGrant => grant != null);
  }

  async hasGrant(
    restaurantId: number,
    userId: number,
    permission: PosPermission
  ): Promise<boolean> {
    const db = await this.requireDb();
    const [row] = await db
      .select({ id: posPermissionGrants.id })
      .from(posPermissionGrants)
      .where(
        and(
          eq(posPermissionGrants.restaurantId, restaurantId),
          eq(posPermissionGrants.userId, userId),
          eq(posPermissionGrants.permission, permission)
        )
      )
      .limit(1);
    return Boolean(row);
  }

  async hasAnyGrant(restaurantId: number, userId: number): Promise<boolean> {
    return (await this.listByRestaurantUser(restaurantId, userId)).length > 0;
  }

  async upsert(grant: PosPermissionGrant): Promise<PosPermissionGrant> {
    const db = await this.requireDb();
    const now = toMysqlTimestampString(new Date().toISOString());
    try {
      await db.insert(posPermissionGrants).values({
        id: randomUUID(),
        restaurantId: grant.restaurantId,
        userId: grant.userId,
        permission: grant.permission,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      return grant;
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
      const existing = await this.findGrant(grant);
      if (!existing) throw error;
      return existing;
    }
  }

  async remove(
    restaurantId: number,
    userId: number,
    permission: PosPermission
  ): Promise<boolean> {
    const db = await this.requireDb();
    const result = await db
      .delete(posPermissionGrants)
      .where(
        and(
          eq(posPermissionGrants.restaurantId, restaurantId),
          eq(posPermissionGrants.userId, userId),
          eq(posPermissionGrants.permission, permission)
        )
      );
    return readMysqlAffectedRows(result) > 0;
  }

  private async findGrant(
    grant: PosPermissionGrant
  ): Promise<PosPermissionGrant | null> {
    const found = await this.hasGrant(
      grant.restaurantId,
      grant.userId,
      grant.permission
    );
    return found ? grant : null;
  }
}
