import type { OrderingFulfilmentAnchor } from "@shared/ordering-platform/orderingIdentityContract";
import {
  createTableSessionAnchor,
  type SessionAnchor,
} from "./operationalSessionContract";

/**
 * Map Order Fulfilment Anchor → Session Anchor (same typed location facts).
 * Ownership remains split: Fulfilment Anchor on Order Identity; Session Anchor on Session.
 */
export function sessionAnchorFromFulfilmentAnchor(
  anchor: OrderingFulfilmentAnchor
): SessionAnchor {
  switch (anchor.anchorType) {
    case "table":
      return createTableSessionAnchor({
        tableId: anchor.tableId,
        tableNumber: anchor.tableNumber,
      });
    case "station":
      return {
        anchorType: "station",
        identity: anchor.stationId,
        stationId: anchor.stationId,
      };
    case "pickup_point":
      return {
        anchorType: "pickup_point",
        identity: anchor.pickupPointId,
        pickupPointId: anchor.pickupPointId,
      };
    case "queue":
      return {
        anchorType: "queue",
        identity: anchor.queueId,
        queueId: anchor.queueId,
      };
    case "drive_lane":
      return {
        anchorType: "drive_lane",
        identity: anchor.laneId,
        laneId: anchor.laneId,
      };
    default: {
      const _exhaustive: never = anchor;
      return _exhaustive;
    }
  }
}
