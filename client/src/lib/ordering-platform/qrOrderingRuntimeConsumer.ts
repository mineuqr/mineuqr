/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 / ORDERING-CLIENT-RUNTIME-1 —
 * QR-named re-exports of shared Client Platform gate derivation.
 */
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import {
  asOrderingMenuList,
  deriveOrderingRuntimeGates,
  type OrderingClientRuntimeGates,
} from "@/lib/ordering-client";

export type QrOrderingRuntimeGates = OrderingClientRuntimeGates;

export function deriveQrOrderingRuntimeGates(
  runtime: OrderingRuntimeContext | null | undefined
): QrOrderingRuntimeGates {
  return deriveOrderingRuntimeGates(runtime);
}

/** @deprecated Prefer asOrderingMenuList from @/lib/ordering-client */
export function asQrMenuList<T>(value: readonly unknown[] | undefined): T[] {
  return asOrderingMenuList<T>(value);
}
