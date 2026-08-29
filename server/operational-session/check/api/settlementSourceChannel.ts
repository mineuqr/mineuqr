/**
 * SETTLEMENT-DOWNSTREAM-OF-COLLECTION-FACT-BOUNDARY-1
 * Settlement Source is derived from Order.orderingChannel — not Session/Check/TABLE.
 */

import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform/orderingChannelRegistry";

export const SETTLEMENT_SOURCE_CHANNELS = [
  "counter",
  "table_order",
  "waiter_order",
  "self_order",
] as const;

export type SettlementSourceChannel = (typeof SETTLEMENT_SOURCE_CHANNELS)[number];

export function settlementSourceChannelFromOrderingChannel(
  orderingChannel: string | null | undefined
): SettlementSourceChannel | null {
  const channel = orderingChannel?.trim() ?? "";
  if (!channel) return null;
  if (channel === ORDERING_CHANNEL_CASHIER_POS) return "counter";
  if (channel === ORDERING_CHANNEL_QR || channel === ORDERING_CHANNEL_TABLE_SESSION) {
    return "table_order";
  }
  if (channel === ORDERING_CHANNEL_WAITER_TABLET) return "waiter_order";
  if (channel === ORDERING_CHANNEL_KIOSK) return "self_order";
  return null;
}
