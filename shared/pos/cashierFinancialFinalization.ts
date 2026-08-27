/**
 * UNIFIED-POS-FINANCIAL-AUTHORITY-1
 * Cashier is the only production Collection Fact / PAID writer.
 * Invoice Intent is operational preparation, never financial truth.
 */
import { parseChargeMoney } from "../operational-session/check/charge/chargeMoney";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
  type OrderingChannelId,
} from "../ordering-platform/orderingChannelRegistry";

export const UNIFIED_POS_FINANCIAL_AUTHORITY_PROGRAM_ID =
  "UNIFIED-POS-FINANCIAL-AUTHORITY-1" as const;

/** Channels whose operational Orders may be finalized only through Cashier Confirm. */
export const CASHIER_FINALIZABLE_ORDERING_CHANNELS = [
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_KIOSK,
] as const;

export type CashierFinalizableOrderingChannel =
  (typeof CASHIER_FINALIZABLE_ORDERING_CHANNELS)[number];

export function isCashierFinalizableOrderingChannel(
  value: string | null | undefined
): value is CashierFinalizableOrderingChannel {
  return (
    typeof value === "string" &&
    (CASHIER_FINALIZABLE_ORDERING_CHANNELS as readonly string[]).includes(value)
  );
}

/**
 * CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 * Channels that may be explicitly handed off into the Cashier Incoming Queue.
 * cashier_pos is Cashier-finalizable but must not self-enqueue as Incoming.
 * table_session remains eligible for compatibility if a historical stamp exists;
 * production Table guest Orders stamp qr, not table_session.
 */
export const CASHIER_HANDOFF_ELIGIBLE_ORDERING_CHANNELS = [
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_KIOSK,
] as const;

export type CashierHandoffEligibleOrderingChannel =
  (typeof CASHIER_HANDOFF_ELIGIBLE_ORDERING_CHANNELS)[number];

export function isCashierHandoffEligibleOrderingChannel(
  value: string | null | undefined
): value is CashierHandoffEligibleOrderingChannel {
  return (
    typeof value === "string" &&
    (CASHIER_HANDOFF_ELIGIBLE_ORDERING_CHANNELS as readonly string[]).includes(
      value
    )
  );
}

export type InvoiceIntentStatus = "awaiting_cashier" | "financially_settled";

export type InvoiceIntentLine = Readonly<{
  menuItemId: number | null;
  nameAr: string;
  nameEn: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}>;

/**
 * Non-authoritative bill the operational channel intends to charge.
 * Invoice Intent != Collection Fact
 * Invoice Intent != PAID
 * Cashier re-resolves authoritative money at Confirm.
 */
export type InvoiceIntent = Readonly<{
  invoiceIntentId: string;
  restaurantId: number;
  sourceChannel: OrderingChannelId | string;
  sessionId: number | null;
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  items: readonly InvoiceIntentLine[];
  expectedSubtotal: string;
  expectedGrandTotal: string;
  status: InvoiceIntentStatus;
}>;

/**
 * Complimentary is Cashier Confirm of a production Collection Fact with
 * collected amount 0 and a positive waived discount. Not a second fact kind.
 * Invoice Intent / manager UI authorization is not PAID.
 */
export const COMPLIMENTARY_COLLECTION_TENDER = {
  paymentMethod: "other" as const,
  amount: "0.00" as const,
};

export function isComplimentaryCollectionFact(fact: {
  amount: string;
  discountAmount: string;
}): boolean {
  try {
    return (
      parseChargeMoney(fact.amount) === 0 &&
      parseChargeMoney(fact.discountAmount) > 0
    );
  } catch {
    return false;
  }
}
