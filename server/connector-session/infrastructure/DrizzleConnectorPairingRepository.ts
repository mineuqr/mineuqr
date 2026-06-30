import { and, eq, isNull } from "drizzle-orm";
import { connectorPairingTokens } from "../../../drizzle/schema";
import { getDb } from "../../db";
import type { ConnectorPairingRepository, PairingTokenRecord } from "../contracts/ConnectorPairingRepository";
import { readMysqlAffectedRows } from "../../db/mysqlAffectedRows";

function mapRow(row: typeof connectorPairingTokens.$inferSelect): PairingTokenRecord {
  return {
    token: row.token,
    restaurantId: row.restaurantId,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt ?? null,
  };
}

export class DrizzleConnectorPairingRepository implements ConnectorPairingRepository {
  async save(record: PairingTokenRecord): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db
      .insert(connectorPairingTokens)
      .values({
        token: record.token,
        restaurantId: record.restaurantId,
        expiresAt: record.expiresAt,
        consumedAt: record.consumedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          restaurantId: record.restaurantId,
          expiresAt: record.expiresAt,
          consumedAt: record.consumedAt,
        },
      });
  }

  async findByToken(token: string): Promise<PairingTokenRecord | null> {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(connectorPairingTokens)
      .where(eq(connectorPairingTokens.token, token))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async consume(token: string, consumedAt: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const result = await db
      .update(connectorPairingTokens)
      .set({ consumedAt })
      .where(and(eq(connectorPairingTokens.token, token), isNull(connectorPairingTokens.consumedAt)));

    return readMysqlAffectedRows(result) > 0;
  }
}
