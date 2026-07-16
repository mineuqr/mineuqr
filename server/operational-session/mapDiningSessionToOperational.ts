import type { SelectDiningSession } from "../../drizzle/schema";
import {
  createTableSessionAnchor,
  type OperationalSession,
  type OperationalSessionStatus,
} from "@shared/operational-session";

/**
 * Dining Session → Operational Session projection.
 * Table occupancy rows are the sole specialization backed by persistence today.
 * Not a rename — DiningSession remains the production table implementation.
 */
export function mapDiningSessionToOperational(
  row: SelectDiningSession
): OperationalSession {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    status: row.status as OperationalSessionStatus,
    sessionToken: row.sessionToken,
    anchor: createTableSessionAnchor({
      tableId: row.tableId,
      tableNumber: row.tableNumber,
    }),
    openedAt: row.openedAt,
    settledAt: row.settledAt ?? null,
    closedAt: row.closedAt ?? null,
    settlementOutcome:
      (row.settlementOutcome as "paid" | "complimentary" | null) ?? null,
    totalAmount: row.totalAmount ?? null,
    totalOrders: row.totalOrders ?? 0,
    activeCheckId: row.activeCheckId ?? null,
  };
}
