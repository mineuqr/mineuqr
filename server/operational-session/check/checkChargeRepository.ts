/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — Check-owned Charge persistence.
 * Insert + read only. No UPDATE of money fields.
 */

import { and, desc, eq } from "drizzle-orm";
import {
  checkCharges,
  type SelectCheckCharge,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import {
  assertChargeCreateInput,
  type BillCharge,
  type BillChargeCreateInput,
} from "@shared/operational-session";

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

export function mapRowToBillCharge(row: SelectCheckCharge): BillCharge {
  return {
    chargeId: row.chargeId,
    restaurantId: row.restaurantId,
    checkId: row.checkId,
    sequence: row.sequence,
    description: row.description,
    quantity: row.quantity,
    unitPrice: String(row.unitPrice),
    lineDiscount: String(row.lineDiscount),
    modifierAmount: String(row.modifierAmount),
    netAmount: String(row.netAmount),
    taxCategory: row.taxCategory ?? null,
    taxAmount: String(row.taxAmount),
    currencyCode: row.currencyCode,
    originOrderId: row.originOrderId ?? null,
    originOrderItemId: row.originOrderItemId ?? null,
    originChannel: row.originChannel ?? null,
    originReference: row.originReference ?? null,
    createdAt: row.createdAt,
  };
}

export async function listCheckCharges(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<readonly BillCharge[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(checkCharges)
    .where(
      and(
        eq(checkCharges.restaurantId, input.restaurantId),
        eq(checkCharges.checkId, input.checkId)
      )
    )
    .orderBy(checkCharges.sequence);
  return rows.map(mapRowToBillCharge);
}

export async function nextCheckChargeSequence(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const [row] = await db
    .select({ sequence: checkCharges.sequence })
    .from(checkCharges)
    .where(
      and(
        eq(checkCharges.restaurantId, input.restaurantId),
        eq(checkCharges.checkId, input.checkId)
      )
    )
    .orderBy(desc(checkCharges.sequence))
    .limit(1);
  return (row?.sequence ?? 0) + 1;
}

export async function insertCheckCharge(
  input: BillChargeCreateInput,
  client?: SessionDbClient
): Promise<void> {
  assertChargeCreateInput(input);
  const db = await resolveDb(client);
  await db.insert(checkCharges).values({
    chargeId: input.chargeId,
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    sequence: input.sequence,
    description: input.description,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    lineDiscount: input.lineDiscount,
    modifierAmount: input.modifierAmount,
    netAmount: input.netAmount,
    taxCategory: input.taxCategory,
    taxAmount: input.taxAmount,
    currencyCode: input.currencyCode,
    originOrderId: input.originOrderId,
    originOrderItemId: input.originOrderItemId,
    originChannel: input.originChannel,
    originReference: input.originReference,
    createdAt: input.createdAt,
  });
}
