import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { readMysqlAffectedRows } from "../../db/mysqlAffectedRows";
import { operationalDevices, operationalDeviceTokens } from "../../../drizzle/schema";
import type {
  CreateOperationalDeviceInput,
  OperationalDeviceRecord,
  OperationalDeviceTokenRecord,
} from "../domain/deviceContracts";
import { DEFAULT_SCREEN_CONFIG, parseScreenConfig } from "../domain/screenConfig";
import type { OperationalDeviceStore } from "./OperationalDeviceStore";

const INITIAL_SCREEN_CONFIG_REVISION = 1;

function mapDevice(row: typeof operationalDevices.$inferSelect): OperationalDeviceRecord {
  return {
    deviceId: row.deviceId,
    restaurantId: row.restaurantId,
    branchId: row.branchId ?? null,
    role: row.role as OperationalDeviceRecord["role"],
    displayName: row.displayName,
    screenConfig: parseScreenConfig(row.screenConfig),
    status: row.status as OperationalDeviceRecord["status"],
    reportedVersion: row.reportedVersion ?? null,
    lastSeenAt: row.lastSeenAt ?? null,
    screenConfigRevision: row.screenConfigRevision ?? INITIAL_SCREEN_CONFIG_REVISION,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapToken(row: typeof operationalDeviceTokens.$inferSelect): OperationalDeviceTokenRecord {
  return {
    tokenId: row.tokenId,
    deviceId: row.deviceId,
    secretHash: row.secretHash,
    status: row.status as OperationalDeviceTokenRecord["status"],
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt ?? null,
    revokedAt: row.revokedAt ?? null,
    lastUsedAt: row.lastUsedAt ?? null,
    createdAt: row.createdAt,
    activationCodeHash: row.activationCodeHash ?? null,
    activationCodeExpiresAt: row.activationCodeExpiresAt ?? null,
  };
}

export class DrizzleOperationalDeviceStore implements OperationalDeviceStore {
  async createDevice(
    input: CreateOperationalDeviceInput & { deviceId: string; now: string }
  ): Promise<OperationalDeviceRecord> {
    const db = await getDb();
    if (!db) throw new Error("database_unavailable");

    await db.insert(operationalDevices).values({
      deviceId: input.deviceId,
      restaurantId: input.restaurantId,
      branchId: input.branchId ?? null,
      role: input.role,
      displayName: input.displayName,
      screenConfig: DEFAULT_SCREEN_CONFIG,
      screenConfigRevision: INITIAL_SCREEN_CONFIG_REVISION,
      status: "active",
      createdAt: input.now,
      updatedAt: input.now,
    });

    const device = await this.getDevice(input.deviceId);
    if (!device) throw new Error("device_create_failed");
    return device;
  }

  async getDevice(deviceId: string): Promise<OperationalDeviceRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(operationalDevices)
      .where(eq(operationalDevices.deviceId, deviceId))
      .limit(1);

    return row ? mapDevice(row) : null;
  }

  async listDevicesByRestaurant(restaurantId: number): Promise<OperationalDeviceRecord[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(operationalDevices)
      .where(eq(operationalDevices.restaurantId, restaurantId))
      .orderBy(desc(operationalDevices.createdAt));

    return rows.map(mapDevice);
  }

  async updateDeviceStatus(
    deviceId: string,
    status: "active" | "disabled",
    now: string
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const result = await db
      .update(operationalDevices)
      .set({ status, updatedAt: now })
      .where(eq(operationalDevices.deviceId, deviceId));

    return readMysqlAffectedRows(result) > 0;
  }

  async touchDeviceHeartbeat(
    deviceId: string,
    input: { lastSeenAt: string; reportedVersion?: string | null }
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(operationalDevices)
      .set({
        lastSeenAt: input.lastSeenAt,
        reportedVersion: input.reportedVersion ?? undefined,
      })
      .where(eq(operationalDevices.deviceId, deviceId));
  }

  async saveToken(record: OperationalDeviceTokenRecord): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("database_unavailable");

    await db.insert(operationalDeviceTokens).values({
      tokenId: record.tokenId,
      deviceId: record.deviceId,
      secretHash: record.secretHash,
      status: record.status,
      issuedAt: record.issuedAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      lastUsedAt: record.lastUsedAt,
      createdAt: record.createdAt,
      activationCodeHash: record.activationCodeHash,
      activationCodeExpiresAt: record.activationCodeExpiresAt,
    });
  }

  async getToken(tokenId: string): Promise<OperationalDeviceTokenRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(operationalDeviceTokens)
      .where(eq(operationalDeviceTokens.tokenId, tokenId))
      .limit(1);

    return row ? mapToken(row) : null;
  }

  async findActiveTokenForDevice(deviceId: string): Promise<OperationalDeviceTokenRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const rows = await db
      .select()
      .from(operationalDeviceTokens)
      .where(
        and(
          eq(operationalDeviceTokens.deviceId, deviceId),
          eq(operationalDeviceTokens.status, "active")
        )
      )
      .orderBy(desc(operationalDeviceTokens.issuedAt))
      .limit(1);

    const token = rows[0] ? mapToken(rows[0]) : null;
    if (!token) return null;
    if (token.revokedAt != null) return null;
    if (token.expiresAt != null && Date.parse(token.expiresAt) <= Date.now()) return null;
    return token;
  }

  async listTokensForDevice(deviceId: string): Promise<OperationalDeviceTokenRecord[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(operationalDeviceTokens)
      .where(eq(operationalDeviceTokens.deviceId, deviceId))
      .orderBy(desc(operationalDeviceTokens.issuedAt));

    return rows.map(mapToken);
  }

  async revokeToken(
    tokenId: string,
    revokedAt: string,
    status: "revoked" | "rotated"
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const result = await db
      .update(operationalDeviceTokens)
      .set({ status, revokedAt })
      .where(eq(operationalDeviceTokens.tokenId, tokenId));

    return readMysqlAffectedRows(result) > 0;
  }

  async revokeAllActiveTokens(
    deviceId: string,
    revokedAt: string,
    status: "revoked" | "rotated"
  ): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    const result = await db
      .update(operationalDeviceTokens)
      .set({ status, revokedAt })
      .where(
        and(
          eq(operationalDeviceTokens.deviceId, deviceId),
          eq(operationalDeviceTokens.status, "active")
        )
      );

    return readMysqlAffectedRows(result);
  }

  async touchTokenUsage(tokenId: string, lastUsedAt: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(operationalDeviceTokens)
      .set({ lastUsedAt })
      .where(eq(operationalDeviceTokens.tokenId, tokenId));
  }

  async findTokenByActivationCodeHash(hash: string): Promise<OperationalDeviceTokenRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(operationalDeviceTokens)
      .where(eq(operationalDeviceTokens.activationCodeHash, hash))
      .limit(1);

    return row ? mapToken(row) : null;
  }

  async consumeActivationCode(tokenId: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(operationalDeviceTokens)
      .set({ activationCodeHash: null, activationCodeExpiresAt: null })
      .where(eq(operationalDeviceTokens.tokenId, tokenId));
  }

  async updateTokenSecret(tokenId: string, secretHash: string, now: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(operationalDeviceTokens)
      .set({ secretHash, lastUsedAt: now })
      .where(eq(operationalDeviceTokens.tokenId, tokenId));
  }

  async updateScreenPresentation(
    deviceId: string,
    input: {
      displayName?: string;
      screenConfig?: OperationalDeviceRecord["screenConfig"];
      now: string;
    }
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const existing = await this.getDevice(deviceId);
    if (!existing) return false;

    const patch: Record<string, unknown> = { updatedAt: input.now };
    if (input.displayName != null) patch.displayName = input.displayName;
    if (input.screenConfig != null) {
      patch.screenConfig = input.screenConfig;
      patch.screenConfigRevision = existing.screenConfigRevision + 1;
    }

    const result = await db
      .update(operationalDevices)
      .set(patch)
      .where(eq(operationalDevices.deviceId, deviceId));

    return readMysqlAffectedRows(result) > 0;
  }
}
