import {
  isOperationalSessionAnchorActivated,
  type ResolveOperationalSessionRequest,
  type ResolveOperationalSessionResult,
} from "@shared/operational-session";
import {
  OperationalSessionAnchorNotActivatedError,
  OperationalSessionValidationError,
} from "./operationalSessionErrors";
import { resolveEphemeralOperationalSession } from "./ephemeralSessionAdapter";
import { resolveTableOperationalSession } from "./tableSessionAdapter";

/**
 * Canonical session resolution for Order attach (OPERATIONAL-SESSION-PLATFORM-1 /
 * NON-TABLE-PLACE-ORDER-1).
 *
 * TABLE → Dining Session specialization (persistent, production QR path).
 * Other anchors → ephemeral resolution (capability active; no dining_sessions).
 *
 * Channel-independent — no channel-specific branching.
 */
export async function resolveOperationalSession(
  request: ResolveOperationalSessionRequest
): Promise<ResolveOperationalSessionResult> {
  if (!Number.isInteger(request.restaurantId) || request.restaurantId <= 0) {
    throw new OperationalSessionValidationError("Invalid restaurantId");
  }
  if (!request.anchor?.anchorType) {
    throw new OperationalSessionValidationError("Session anchor is required");
  }

  if (!isOperationalSessionAnchorActivated(request.anchor.anchorType)) {
    throw new OperationalSessionAnchorNotActivatedError(
      request.anchor.anchorType
    );
  }

  switch (request.anchor.anchorType) {
    case "table":
      return resolveTableOperationalSession({
        restaurantId: request.restaurantId,
        anchor: request.anchor,
        sessionToken: request.sessionToken,
      });
    case "station":
    case "pickup_point":
    case "queue":
    case "drive_lane":
      return resolveEphemeralOperationalSession({
        restaurantId: request.restaurantId,
        anchor: request.anchor,
      });
    default:
      throw new OperationalSessionAnchorNotActivatedError(
        (request.anchor as { anchorType: string }).anchorType
      );
  }
}
