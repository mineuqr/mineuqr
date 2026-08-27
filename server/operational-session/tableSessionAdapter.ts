import type {
  ResolveOperationalSessionResult,
  TableSessionAnchor,
} from "@shared/operational-session";
import {
  resolveSessionForOrderCreate,
  type DiningTableContextPreload,
} from "../diningSession/sessionService";
import { mapDiningSessionToOperational } from "./mapDiningSessionToOperational";
import { OperationalSessionValidationError } from "./operationalSessionErrors";

/**
 * Table Session Anchor adapter — Dining Session specialization.
 * Preserves QR uniqueness: one open session per (restaurantId, tableId).
 * Behaviour-identical to resolveSessionForOrderCreate for the table path.
 */
export async function resolveTableOperationalSession(input: {
  restaurantId: number;
  anchor: TableSessionAnchor;
  sessionToken?: string;
  tableContext?: DiningTableContextPreload;
}): Promise<ResolveOperationalSessionResult> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new OperationalSessionValidationError("Invalid restaurantId");
  }
  if (!Number.isInteger(input.anchor.tableId) || input.anchor.tableId <= 0) {
    throw new OperationalSessionValidationError("Invalid tableId");
  }
  if (
    !Number.isInteger(input.anchor.tableNumber) ||
    input.anchor.tableNumber <= 0
  ) {
    throw new OperationalSessionValidationError("Invalid tableNumber");
  }

  const result = await resolveSessionForOrderCreate({
    restaurantId: input.restaurantId,
    tableId: input.anchor.tableId,
    tableNumber: input.anchor.tableNumber,
    sessionToken: input.sessionToken,
    tableContext: input.tableContext,
  });

  return {
    session: mapDiningSessionToOperational(result.session),
    created: result.created,
    persistence: "persistent",
  };
}
