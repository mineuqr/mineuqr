import {
  isOperationalSessionAnchorActivated,
  type ResolveOperationalSessionRequest,
  type ResolveOperationalSessionResult,
} from "@shared/operational-session";
import {
  OperationalSessionAnchorNotActivatedError,
  OperationalSessionValidationError,
} from "./operationalSessionErrors";
import { resolveTableOperationalSession } from "./tableSessionAdapter";

/**
 * OPERATIONAL-SESSION-PLATFORM-1 — canonical session resolution for Order attach.
 *
 * Target entry: resolveOperationalSession(anchor).
 * Table resolution is one adapter; other anchors are contract-ready but inactive.
 *
 * Channel-independent — QR / Kiosk / Waiter must not own this function.
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
    default:
      throw new OperationalSessionAnchorNotActivatedError(
        request.anchor.anchorType
      );
  }
}
