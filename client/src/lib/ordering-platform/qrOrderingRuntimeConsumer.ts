import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import type { OrderingNotesCapabilities } from "@shared/ordering-platform/orderingNotesContract";
import { DEFAULT_ORDERING_NOTES_CAPABILITIES } from "@shared/ordering-platform/orderingNotesContract";

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 / ORDERING-NOTES-ARCHITECTURE-1 —
 * pure QR consumption helpers.
 */

export type QrOrderingRuntimeGates = {
  guestOrderingEnabled: boolean;
  orderingAllowed: boolean;
  platformCanPlaceOrder: boolean;
  canBrowse: boolean;
  /** Platform note capabilities — channels must not redefine. */
  notes: OrderingNotesCapabilities;
};

export function deriveQrOrderingRuntimeGates(
  runtime: OrderingRuntimeContext | null | undefined
): QrOrderingRuntimeGates {
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

export function asQrMenuList<T>(value: readonly unknown[] | undefined): T[] {
  return (value ?? []) as T[];
}
