/**
 * KIOSK-IDENTITY-ADOPTION-1 — Kiosk channel adapter for Order Identity facts.
 * KIOSK-PRESENTATION-ADOPTION-1 — customer-facing fulfilment label is طلب ذاتي.
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
import { KIOSK_CUSTOMER_FACING_LABEL_AR } from "./kioskPresentationLabels";

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
  stationId: string,
  options?: { fulfilmentLabel?: string }
): CheckoutIdentitySubmit {
  return {
    serviceMode: KIOSK_STATION_SERVICE_MODE,
    fulfilmentAnchor: createKioskStationFulfilmentAnchor(
      stationId,
      options?.fulfilmentLabel ?? KIOSK_CUSTOMER_FACING_LABEL_AR
    ),
  };
}
