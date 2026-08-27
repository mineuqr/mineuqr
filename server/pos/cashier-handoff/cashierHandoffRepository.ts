/**
 * CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 * Persist explicit Cashier Handoff membership. Not Collection Fact.
 */
import { and, desc, eq } from "drizzle-orm";
import {
  cashierOrderHandoffs,
  type InsertCashierOrderHandoff,
  type SelectCashierOrderHandoff,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { readMysqlAffectedRows } from "../../db/mysqlAffectedRows";
import {
  DiningSessionUnavailableError,
  isMysqlDuplicateKeyError,
} from "../../diningSession/sessionTypes";

async function resolveDb() {
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

export async function hasCashierHandoff(input: {
  restaurantId: number;
  orderId: number;
}): Promise<boolean> {
  const db = await resolveDb();
  const [row] = await db
    .select({ orderId: cashierOrderHandoffs.orderId })
    .from(cashierOrderHandoffs)
    .where(
      and(
        eq(cashierOrderHandoffs.restaurantId, input.restaurantId),
        eq(cashierOrderHandoffs.orderId, input.orderId)
      )
    )
    .limit(1);
  return row != null;
}

export async function listCashierHandoffsByRestaurant(
  restaurantId: number
): Promise<SelectCashierOrderHandoff[]> {
  const db = await resolveDb();
  return db
    .select()
    .from(cashierOrderHandoffs)
    .where(eq(cashierOrderHandoffs.restaurantId, restaurantId))
    .orderBy(desc(cashierOrderHandoffs.handedOffAt));
}

export async function insertCashierHandoffIgnoreDuplicate(
  row: InsertCashierOrderHandoff
): Promise<{ created: boolean }> {
  const db = await resolveDb();
  try {
    const result = await db
      .insert(cashierOrderHandoffs)
      .values({
        restaurantId: row.restaurantId,
        orderId: row.orderId,
        sourceChannel: row.sourceChannel,
        sessionId: row.sessionId ?? null,
      })
      .onDuplicateKeyUpdate({
        set: { orderId: row.orderId },
      });
    return { created: readMysqlAffectedRows(result) === 1 };
  } catch (error) {
    if (isMysqlDuplicateKeyError(error)) {
      return { created: false };
    }
    throw error;
  }
}
