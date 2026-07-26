/**
 * REFUND-PRESENTATION-ADOPTION-1 — presentation attribution enrichment.
 * Read-only join of CRMP Settlement Attribution → Register / Shift / Operator labels.
 * Copies display facts only — no money math, no custody mutation.
 */

import { and, eq } from "drizzle-orm";
import {
  crmpFinancialShifts,
  crmpRegisters,
  crmpSettlementAttributions,
  users,
} from "../../../../drizzle/schema";
import { getDb } from "../../../db";

export type SettlementRecordAttributionDisplay = Readonly<{
  registerLabel: string;
  shiftLabel: string;
  operatorLabel: string;
}>;

/**
 * Fail-open: returns null when attribution or supporting catalog rows are absent.
 */
export async function loadSettlementRecordAttributionDisplay(input: {
  restaurantId: number;
  settlementRecordId: string;
}): Promise<SettlementRecordAttributionDisplay | null> {
  const db = await getDb();
  if (!db) return null;

  const [attr] = await db
    .select()
    .from(crmpSettlementAttributions)
    .where(
      and(
        eq(crmpSettlementAttributions.restaurantId, input.restaurantId),
        eq(
          crmpSettlementAttributions.settlementRecordId,
          input.settlementRecordId
        )
      )
    )
    .limit(1);

  if (!attr) return null;

  const [[register], [shift], [user]] = await Promise.all([
    db
      .select({
        displayName: crmpRegisters.displayName,
        code: crmpRegisters.code,
      })
      .from(crmpRegisters)
      .where(
        and(
          eq(crmpRegisters.restaurantId, input.restaurantId),
          eq(crmpRegisters.registerId, attr.registerId)
        )
      )
      .limit(1),
    db
      .select({ shiftNumber: crmpFinancialShifts.shiftNumber })
      .from(crmpFinancialShifts)
      .where(
        and(
          eq(crmpFinancialShifts.restaurantId, input.restaurantId),
          eq(crmpFinancialShifts.financialShiftId, attr.financialShiftId)
        )
      )
      .limit(1),
    db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, attr.operatorUserId))
      .limit(1),
  ]);

  const registerLabel =
    register?.displayName?.trim() ||
    register?.code?.trim() ||
    attr.registerId;
  const shiftLabel =
    shift?.shiftNumber != null ? String(shift.shiftNumber) : "—";
  const operatorLabel =
    user?.name?.trim() || user?.email?.trim() || "—";

  return { registerLabel, shiftLabel, operatorLabel };
}
