import { ORDERING_CHANNEL_KIOSK } from "@shared/ordering-platform/orderingPlatformContracts";
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import type { OrderingNotesCapabilities } from "@shared/ordering-platform/orderingNotesContract";
import { DEFAULT_ORDERING_NOTES_CAPABILITIES } from "@shared/ordering-platform/orderingNotesContract";
import {
  KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION,
  KIOSK_RUNTIME_CONSUMPTION_ENTRY,
} from "./kioskOrderingChannelContract";

/**
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 / ORDERING-NOTES-ARCHITECTURE-1 —
 * runtime consumption model for Kiosk (same note contracts as QR).
 */

export const KIOSK_RUNTIME_CHANNEL_ID = ORDERING_CHANNEL_KIOSK;

export type KioskOrderingRuntimeGates = {
  guestOrderingEnabled: boolean;
  orderingAllowed: boolean;
  platformCanPlaceOrder: boolean;
  canBrowse: boolean;
  notes: OrderingNotesCapabilities;
};

export function deriveKioskOrderingRuntimeGates(
  runtime: OrderingRuntimeContext | null | undefined
): KioskOrderingRuntimeGates {
  if (!runtime) {
    return {
      guestOrderingEnabled: false,
      orderingAllowed: false,
      platformCanPlaceOrder: false,
      canBrowse: false,
      notes: {
        ...DEFAULT_ORDERING_NOTES_CAPABILITIES,
        supportsOrderNotes: false,
        supportsItemNotes: false,
        allowedPolicies: [...DEFAULT_ORDERING_NOTES_CAPABILITIES.allowedPolicies],
      },
    };
  }

  return {
    guestOrderingEnabled: runtime.policies.guest.guestOrderingEnabled,
    orderingAllowed:
      runtime.business.hours.isOpenNow && !runtime.business.closureActive,
    platformCanPlaceOrder: runtime.availability.canPlaceOrder,
    canBrowse: runtime.availability.canBrowse,
    notes: runtime.capabilities.notes,
  };
}

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
  "use_shared_ordering_notes_contracts",
] as const;

export const KIOSK_RUNTIME_FORBIDDEN_SYMBOLS = KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION;

export const KIOSK_RUNTIME_DELIVERY = KIOSK_RUNTIME_CONSUMPTION_ENTRY;
