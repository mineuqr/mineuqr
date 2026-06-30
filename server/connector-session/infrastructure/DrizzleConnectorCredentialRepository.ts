import { and, eq, isNull } from "drizzle-orm";
import { connectorEnrollments } from "../../../drizzle/schema";
import { getDb } from "../../db";
import type {
  ConnectorCredentialRepository,
  TouchEnrollmentInput,
} from "../contracts/ConnectorCredentialRepository";
import type { ConnectorCredentialRecord } from "../contracts/sessionContracts";
import { readMysqlAffectedRows } from "../../db/mysqlAffectedRows";

function isActiveRecord(record: ConnectorCredentialRecord): boolean {
  if (record.revokedAt != null || record.status === "revoked") return false;
  if (record.expiresAt != null && Date.parse(record.expiresAt) <= Date.now()) return false;
  return true;
}

function mapRow(row: typeof connectorEnrollments.$inferSelect): ConnectorCredentialRecord {
  return {
    credentialId: row.credentialId,
    restaurantId: row.restaurantId,
    secretHash: row.secretHash,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt ?? null,
    revokedAt: row.revokedAt ?? null,
    connectorInstanceId: row.connectorInstanceId,
    status: row.status,
    lastSeenAt: row.lastSeenAt ?? null,
    connectorVersion: row.connectorVersion ?? null,
  };
}

export class DrizzleConnectorCredentialRepository implements ConnectorCredentialRepository {
  async save(record: ConnectorCredentialRecord): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db
      .insert(connectorEnrollments)
      .values({
        credentialId: record.credentialId,
        restaurantId: record.restaurantId,
        connectorInstanceId: record.connectorInstanceId ?? "",
        secretHash: record.secretHash,
        status: record.status ?? (record.revokedAt != null ? "revoked" : "active"),
        connectorVersion: record.connectorVersion ?? null,
        issuedAt: record.issuedAt,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        lastSeenAt: record.lastSeenAt ?? null,
      })
      .onDuplicateKeyUpdate({
        set: {
          restaurantId: record.restaurantId,
          connectorInstanceId: record.connectorInstanceId ?? "",
          secretHash: record.secretHash,
          status: record.status ?? (record.revokedAt != null ? "revoked" : "active"),
          connectorVersion: record.connectorVersion ?? null,
          issuedAt: record.issuedAt,
          expiresAt: record.expiresAt,
          revokedAt: record.revokedAt,
          lastSeenAt: record.lastSeenAt ?? null,
        },
      });
  }

  async findById(credentialId: string): Promise<ConnectorCredentialRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(connectorEnrollments)
      .where(eq(connectorEnrollments.credentialId, credentialId))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async findByConnectorInstanceId(connectorInstanceId: string): Promise<ConnectorCredentialRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(connectorEnrollments)
      .where(eq(connectorEnrollments.connectorInstanceId, connectorInstanceId))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async findActiveByRestaurant(restaurantId: number): Promise<ConnectorCredentialRecord[]> {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(connectorEnrollments)
      .where(
        and(
          eq(connectorEnrollments.restaurantId, restaurantId),
          eq(connectorEnrollments.status, "active"),
          isNull(connectorEnrollments.revokedAt)
        )
      );

    return rows.map(mapRow).filter(isActiveRecord);
  }

  async touchEnrollment(credentialId: string, input: TouchEnrollmentInput): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
      .update(connectorEnrollments)
      .set({
        lastSeenAt: input.lastSeenAt,
        ...(input.connectorVersion != null ? { connectorVersion: input.connectorVersion } : {}),
      })
      .where(
        and(
          eq(connectorEnrollments.credentialId, credentialId),
          eq(connectorEnrollments.status, "active"),
          isNull(connectorEnrollments.revokedAt)
        )
      );
  }

  async revoke(credentialId: string, revokedAt: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const result = await db
      .update(connectorEnrollments)
      .set({ revokedAt, status: "revoked" })
      .where(eq(connectorEnrollments.credentialId, credentialId));

    return readMysqlAffectedRows(result) > 0;
  }
}
