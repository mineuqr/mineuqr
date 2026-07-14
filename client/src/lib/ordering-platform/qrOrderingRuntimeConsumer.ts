import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 — pure QR consumption helpers.
 * Derives presentation gates from immutable OrderingRuntimeContext.
 * Must never recompute hours, guest entitlement, or compose runtime.
 */

export type QrOrderingRuntimeGates = {
  /** Guest commercial entitlement from platform policies. */
  guestOrderingEnabled: boolean;
  /** Hours + non-closure open state from platform business hours. */
  orderingAllowed: boolean;
  /** Platform availability place-order gate (excludes channel session/journey). */
  platformCanPlaceOrder: boolean;
  /** Restaurant active / browseable. */
  canBrowse: boolean;
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

export function asQrMenuList<T>(value: readonly unknown[] | undefined): T[] {
  return (value ?? []) as T[];
}
