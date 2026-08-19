/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — operational_checks persistence boundary.
 */

import { and, eq } from "drizzle-orm";
import {
  operationalChecks,
  type InsertOperationalCheck,
  type SelectOperationalCheck,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import {
  DiningSessionUnavailableError,
  formatDiningSessionTimestamp,
} from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import type {
  CheckOutcome,
  CurrencySnapshot,
  TaxBreakdown,
  TaxPolicySnapshot,
} from "@shared/operational-session";

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

export type InsertCheckData = {
  restaurantId: number;
  /** Null for sessionless Checks (M4). */
  sessionId: number | null;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  billDiscountAmount?: string;
  subtotal: string;
  taxAmount: string;
  taxBreakdown: TaxBreakdown;
  grandTotal: string;
  snapshotsFrozenAt: string;
};

export async function insertOperationalCheck(
  data: InsertCheckData,
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const values: InsertOperationalCheck = {
    restaurantId: data.restaurantId,
    sessionId: data.sessionId,
    outcome: "open",
    currencySnapshotJson: data.currencySnapshot,
    taxPolicySnapshotJson: data.taxPolicySnapshot,
    serviceChargeSnapshotJson: null,
    billDiscountAmount: data.billDiscountAmount ?? "0.00",
    subtotal: data.subtotal,
    taxAmount: data.taxAmount,
    taxBreakdownJson: data.taxBreakdown,
    grandTotal: data.grandTotal,
    snapshotsFrozenAt: data.snapshotsFrozenAt,
  };

  const result = await db.insert(operationalChecks).values(values);
  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new DiningSessionUnavailableError(
      "operational_checks insert did not return an id"
    );
  }
  return insertId;
}

export async function findCheckById(
  checkId: number,
  client?: SessionDbClient
): Promise<SelectOperationalCheck | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(operationalChecks)
    .where(eq(operationalChecks.id, checkId))
    .limit(1);
  return row ?? null;
}

export async function findOpenCheckBySessionId(
  restaurantId: number,
  sessionId: number,
  client?: SessionDbClient
): Promise<SelectOperationalCheck | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(operationalChecks)
    .where(
      and(
        eq(operationalChecks.restaurantId, restaurantId),
        eq(operationalChecks.sessionId, sessionId),
        eq(operationalChecks.outcome, "open")
      )
    )
    .limit(1);
  return row ?? null;
}

export async function updateCheckMoney(
  input: {
    checkId: number;
    restaurantId: number;
    subtotal: string;
    taxAmount: string;
    taxBreakdown: TaxBreakdown;
    grandTotal: string;
    billDiscountAmount?: string;
  },
  client?: SessionDbClient
): Promise<void> {
  const db = await resolveDb(client);
  await db
    .update(operationalChecks)
    .set({
      subtotal: input.subtotal,
      taxAmount: input.taxAmount,
      taxBreakdownJson: input.taxBreakdown,
      grandTotal: input.grandTotal,
      ...(input.billDiscountAmount != null
        ? { billDiscountAmount: input.billDiscountAmount }
        : {}),
    })
    .where(
      and(
        eq(operationalChecks.id, input.checkId),
        eq(operationalChecks.restaurantId, input.restaurantId),
        eq(operationalChecks.outcome, "open")
      )
    );
}

/**
 * Row lock for OPEN-Bill financial mutation (Charge insert or terminal finalize).
 * UPDATE WHERE outcome='open' — 0 rows means the Bill is already terminal.
 */
export async function touchOpenCheck(
  input: { checkId: number; restaurantId: number },
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const result = await db
    .update(operationalChecks)
    .set({
      updatedAt: formatDiningSessionTimestamp(),
    })
    .where(
      and(
        eq(operationalChecks.id, input.checkId),
        eq(operationalChecks.restaurantId, input.restaurantId),
        eq(operationalChecks.outcome, "open")
      )
    );
  return (
    (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
}

/**
 * Conditional Check outcome finalize (WHERE outcome='open').
 * Returns affected row count — callers MUST abort when 0
 * (SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1 / lost ownership).
 */
export async function finalizeCheckOutcome(
  input: {
    checkId: number;
    restaurantId: number;
    outcome: Exclude<CheckOutcome, "open">;
    subtotal: string;
    taxAmount: string;
    taxBreakdown: TaxBreakdown;
    grandTotal: string;
    totalsFrozenAt: string;
    settledAt?: string | null;
    voidedAt?: string | null;
  },
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const result = await db
    .update(operationalChecks)
    .set({
      outcome: input.outcome,
      subtotal: input.subtotal,
      taxAmount: input.taxAmount,
      taxBreakdownJson: input.taxBreakdown,
      grandTotal: input.grandTotal,
      totalsFrozenAt: input.totalsFrozenAt,
      settledAt: input.settledAt ?? null,
      voidedAt: input.voidedAt ?? null,
    })
    .where(
      and(
        eq(operationalChecks.id, input.checkId),
        eq(operationalChecks.restaurantId, input.restaurantId),
        eq(operationalChecks.outcome, "open")
      )
    );
  return (
    (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
}
