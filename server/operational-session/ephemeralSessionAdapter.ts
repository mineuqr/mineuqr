import type {
  ResolveOperationalSessionResult,
  SessionAnchor,
} from "@shared/operational-session";
import { OperationalSessionValidationError } from "./operationalSessionErrors";

/**
 * NON-TABLE-PLACE-ORDER-1 — non-table Session Anchor resolution.
 *
 * Uniqueness policies `none` / `configurable` (until station persistence exists):
 * no dining_sessions row, no fake tables, sessionId remains null on Order.
 *
 * Channel-agnostic — not a kiosk/counter fork.
 */
export async function resolveEphemeralOperationalSession(input: {
  restaurantId: number;
  anchor: Exclude<SessionAnchor, { anchorType: "table" }>;
}): Promise<ResolveOperationalSessionResult> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new OperationalSessionValidationError("Invalid restaurantId");
  }
  if (!input.anchor.identity?.trim()) {
    throw new OperationalSessionValidationError(
      "Session anchor identity is required"
    );
  }

  return {
    session: null,
    created: false,
    persistence: "ephemeral",
  };
}
