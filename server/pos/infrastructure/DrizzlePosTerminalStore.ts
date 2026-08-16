/**
 * POS-PERSISTENCE-WIRING-1
 * Production POS Terminal persistence against pos_terminals (0091).
 */

import { and, asc, eq, sql } from "drizzle-orm";
import {
  POS_TERMINAL_LIFECYCLES,
  type PosTerminal,
  type PosTerminalLifecycle,
} from "@shared/pos";
import { posTerminals } from "../../../drizzle/schema";
import { getDb } from "../../db";
import type { PosTerminalStore } from "./PosTerminalStore";
import {
  POS_DATABASE_UNAVAILABLE,
  type LoadPosDb,
  PosTerminalCodeConflictError,
  fromMysqlTimestampString,
  isMysqlDuplicateKeyError,
  toMysqlTimestampString,
} from "./posPersistenceErrors";

function isPosTerminalLifecycle(value: string): value is PosTerminalLifecycle {
  return (POS_TERMINAL_LIFECYCLES as readonly string[]).includes(value);
}

function mapTerminal(row: typeof posTerminals.$inferSelect): PosTerminal {
  const lifecycle = String(row.lifecycle);
  if (!isPosTerminalLifecycle(lifecycle)) {
    throw new Error("pos_terminal_lifecycle_corrupt");
  }
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    code: row.code,
    lifecycle,
    replacedByTerminalId: row.replacedByTerminalId ?? null,
    optionalDeviceId: row.optionalDeviceId ?? null,
    version: row.version ?? 1,
    createdAt: fromMysqlTimestampString(row.createdAt),
    updatedAt: fromMysqlTimestampString(row.updatedAt),
  };
}

export class DrizzlePosTerminalStore implements PosTerminalStore {
  constructor(private readonly loadDb: LoadPosDb = getDb) {}

  private async requireDb() {
    const db = await this.loadDb();
    if (!db) throw new Error(POS_DATABASE_UNAVAILABLE);
    return db;
  }

  async listByRestaurant(restaurantId: number): Promise<PosTerminal[]> {
    const db = await this.requireDb();
    const rows = await db
      .select()
      .from(posTerminals)
      .where(eq(posTerminals.restaurantId, restaurantId))
      .orderBy(asc(posTerminals.code));
    return rows.map(mapTerminal);
  }

  async getById(id: string): Promise<PosTerminal | null> {
    const db = await this.requireDb();
    const [row] = await db
      .select()
      .from(posTerminals)
      .where(eq(posTerminals.id, id))
      .limit(1);
    return row ? mapTerminal(row) : null;
  }

  async getByRestaurantAndCode(
    restaurantId: number,
    code: string
  ): Promise<PosTerminal | null> {
    const db = await this.requireDb();
    const [row] = await db
      .select()
      .from(posTerminals)
      .where(
        and(
          eq(posTerminals.restaurantId, restaurantId),
          eq(posTerminals.code, code)
        )
      )
      .limit(1);
    return row ? mapTerminal(row) : null;
  }

  async insert(terminal: PosTerminal): Promise<void> {
    const db = await this.requireDb();
    try {
      await db.insert(posTerminals).values({
        id: terminal.id,
        restaurantId: terminal.restaurantId,
        code: terminal.code,
        lifecycle: terminal.lifecycle,
        replacedByTerminalId: terminal.replacedByTerminalId,
        optionalDeviceId: terminal.optionalDeviceId,
        version: terminal.version,
        createdAt: toMysqlTimestampString(terminal.createdAt),
        updatedAt: toMysqlTimestampString(terminal.updatedAt),
      });
    } catch (error) {
      if (isMysqlDuplicateKeyError(error)) {
        throw new PosTerminalCodeConflictError();
      }
      throw error;
    }
  }

  async updateLifecycle(
    id: string,
    lifecycle: PosTerminalLifecycle,
    extras?: { replacedByTerminalId?: string | null; version?: number }
  ): Promise<PosTerminal | null> {
    const db = await this.requireDb();
    const patch: {
      lifecycle: PosTerminalLifecycle;
      updatedAt: string;
      version: number | ReturnType<typeof sql>;
      replacedByTerminalId?: string | null;
    } = {
      lifecycle,
      updatedAt: toMysqlTimestampString(new Date().toISOString()),
      version:
        extras?.version !== undefined
          ? extras.version
          : sql`${posTerminals.version} + 1`,
    };
    if (extras?.replacedByTerminalId !== undefined) {
      patch.replacedByTerminalId = extras.replacedByTerminalId;
    }

    await db
      .update(posTerminals)
      .set(patch)
      .where(eq(posTerminals.id, id));

    return this.getById(id);
  }
}
