/**
 * ORDERING-CLIENT-RUNTIME-1 — single gate derivation for all ordering channels.
 * Pure mapping from OrderingRuntimeContext; no hours recalculation.
 */
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import type { OrderingNotesCapabilities } from "@shared/ordering-platform/orderingNotesContract";
import { DEFAULT_ORDERING_NOTES_CAPABILITIES } from "@shared/ordering-platform/orderingNotesContract";

export type OrderingClientRuntimeGates = {
  guestOrderingEnabled: boolean;
  orderingAllowed: boolean;
  platformCanPlaceOrder: boolean;
  canBrowse: boolean;
  notes: OrderingNotesCapabilities;
};

const DISABLED_NOTES: OrderingNotesCapabilities = {
  ...DEFAULT_ORDERING_NOTES_CAPABILITIES,
  supportsOrderNotes: false,
  supportsItemNotes: false,
  allowedPolicies: [...DEFAULT_ORDERING_NOTES_CAPABILITIES.allowedPolicies],
};

export function deriveOrderingRuntimeGates(
  runtime: OrderingRuntimeContext | null | undefined
): OrderingClientRuntimeGates {
  if (!runtime) {
    return {
      guestOrderingEnabled: false,
      orderingAllowed: false,
      platformCanPlaceOrder: false,
      canBrowse: false,
      notes: DISABLED_NOTES,
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

export function asOrderingMenuList<T>(value: readonly unknown[] | undefined): T[] {
  return (value ?? []) as T[];
}
