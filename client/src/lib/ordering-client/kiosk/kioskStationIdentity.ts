/**
 * KIOSK-IDENTITY-ADOPTION-1 — Kiosk channel adapter for Order Identity facts.
 *
 * Channel supplies station + service mode; Ordering Platform owns types.
 * Does not invent tables. Does not call PlaceOrder infrastructure directly.
 */

import {
  createStationFulfilmentAnchor,
  type OrderingFulfilmentAnchor,
  type OrderingServiceMode,
} from "@shared/ordering-platform/orderingIdentityContract";
import type { CheckoutIdentitySubmit } from "../checkout/checkoutTypes";

/** Approved Service Mode for station / self-order counter-style fulfilment. */
export const KIOSK_STATION_SERVICE_MODE: OrderingServiceMode = "counter";

export function createKioskStationFulfilmentAnchor(
  stationId: string,
  fulfilmentLabel?: string
): OrderingFulfilmentAnchor {
  return createStationFulfilmentAnchor({
    stationId: stationId.trim(),
    fulfilmentLabel: fulfilmentLabel?.trim() || stationId.trim(),
  });
}

/** Build Client Platform identity submit facts from kiosk station binding. */
export function buildKioskStationCheckoutIdentity(
  stationId: string
): CheckoutIdentitySubmit {
  return {
    serviceMode: KIOSK_STATION_SERVICE_MODE,
    fulfilmentAnchor: createKioskStationFulfilmentAnchor(stationId),
  };
}
