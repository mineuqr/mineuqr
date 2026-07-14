import { ORDERING_CHANNEL_KIOSK } from "@shared/ordering-platform/orderingPlatformContracts";
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import {
  KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION,
  KIOSK_RUNTIME_CONSUMPTION_ENTRY,
} from "./kioskOrderingChannelContract";

/**
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 — runtime consumption model for Kiosk.
 *
 * Mirrors QR adoption: consume immutable OrderingRuntimeContext only.
 * No construction, composition, mutation, or local hours/guest recalculation.
 */

export const KIOSK_RUNTIME_CHANNEL_ID = ORDERING_CHANNEL_KIOSK;

export type KioskOrderingRuntimeGates = {
  guestOrderingEnabled: boolean;
  orderingAllowed: boolean;
  platformCanPlaceOrder: boolean;
  canBrowse: boolean;
};

/**
 * Derive presentation gates from platform runtime.
 * Same semantic mapping as QR — channel must not recompute hours or entitlement.
 */
export function deriveKioskOrderingRuntimeGates(
  runtime: OrderingRuntimeContext | null | undefined
): KioskOrderingRuntimeGates {
  if (!runtime) {
    return {
      guestOrderingEnabled: false,
      orderingAllowed: false,
      platformCanPlaceOrder: false,
      canBrowse: false,
    };
  }

  return {
    guestOrderingEnabled: runtime.policies.guest.guestOrderingEnabled,
    orderingAllowed:
      runtime.business.hours.isOpenNow && !runtime.business.closureActive,
    platformCanPlaceOrder: runtime.availability.canPlaceOrder,
    canBrowse: runtime.availability.canBrowse,
  };
}

/** Assert runtime channel matches kiosk when a snapshot is present. */
export function assertKioskRuntimeChannel(
  runtime: OrderingRuntimeContext
): boolean {
  return runtime.channel === KIOSK_RUNTIME_CHANNEL_ID;
}

export const KIOSK_RUNTIME_CONSUMPTION_RULES = [
  "consume_ordering_runtime_context_only",
  "never_mutate_runtime",
  "never_rebuild_runtime",
  "never_compose_runtime",
  "never_query_repositories_for_runtime_construction",
  "use_platform_delivery_entry",
] as const;

export const KIOSK_RUNTIME_FORBIDDEN_SYMBOLS = KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION;

export const KIOSK_RUNTIME_DELIVERY = KIOSK_RUNTIME_CONSUMPTION_ENTRY;
