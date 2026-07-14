import { ORDERING_CHANNEL_KIOSK } from "@shared/ordering-platform/orderingPlatformContracts";
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import {
  deriveOrderingRuntimeGates,
  type OrderingClientRuntimeGates,
} from "@/lib/ordering-client";
import {
  KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION,
  KIOSK_RUNTIME_CONSUMPTION_ENTRY,
} from "./kioskOrderingChannelContract";

/**
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 / ORDERING-CLIENT-RUNTIME-1 —
 * Kiosk-named gates delegate to Ordering Client Platform (no duplicated mapping).
 */

export const KIOSK_RUNTIME_CHANNEL_ID = ORDERING_CHANNEL_KIOSK;

export type KioskOrderingRuntimeGates = OrderingClientRuntimeGates;

export function deriveKioskOrderingRuntimeGates(
  runtime: OrderingRuntimeContext | null | undefined
): KioskOrderingRuntimeGates {
  return deriveOrderingRuntimeGates(runtime);
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
  "consume_via_ordering_client_platform",
] as const;

export const KIOSK_RUNTIME_FORBIDDEN_SYMBOLS = KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION;

export const KIOSK_RUNTIME_DELIVERY = KIOSK_RUNTIME_CONSUMPTION_ENTRY;
