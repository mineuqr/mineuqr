/**
 * ADR-ARCH-022 / ORDER-SETTLEMENT-DOMAIN-1 — Order Settlement contracts.
 *
 * Check-owned Entity. Not an Aggregate Root. Not Order-owned. Not a Projection.
 * Pure domain types only — no persistence / ORM / API concerns.
 */

export const ORDER_SETTLEMENT_PROGRAM_ID = "ORDER-SETTLEMENT-DOMAIN-1" as const;
export const ORDER_SETTLEMENT_ADR_ID = "ADR-ARCH-022" as const;

/** Canonical lifecycle states (ADR-022 §6.1). */
export const ORDER_SETTLEMENT_STATUSES = [
  "pending",
  "partially_settled",
  "settled",
  "complimentary",
  "cancelled",
  "voided",
  "refunded",
] as const;

export type OrderSettlementStatus =
  (typeof ORDER_SETTLEMENT_STATUSES)[number];

/** Non-terminal — further business transitions allowed. */
export const ORDER_SETTLEMENT_NON_TERMINAL_STATUSES = [
  "pending",
  "partially_settled",
] as const;

export type OrderSettlementNonTerminalStatus =
  (typeof ORDER_SETTLEMENT_NON_TERMINAL_STATUSES)[number];

/** Terminal — must not regress to non-terminal (I-OS-14). */
export const ORDER_SETTLEMENT_TERMINAL_STATUSES = [
  "settled",
  "complimentary",
  "refunded",
  "voided",
  "cancelled",
] as const;

export type OrderSettlementTerminalStatus =
  (typeof ORDER_SETTLEMENT_TERMINAL_STATUSES)[number];

/**
 * Order Settlement entity — identity + financial state.
 * Identity key: (restaurantId, checkId, orderId) — I-OS-01.
 */
export type OrderSettlement = Readonly<{
  restaurantId: number;
  checkId: number;
  orderId: number;
  status: OrderSettlementStatus;
  /** Contributing Order total used for settlement math. */
  orderTotalSnapshot: string;
  /** Amount included in the current open Check bill. */
  allocatedAmount: string;
  /** Amount covered for this Order. */
  settledAmount: string;
  /** orderTotalSnapshot − settledAmount (active algebra). */
  outstandingAmount: string;
  createdAt: string;
  updatedAt: string;
}>;

/** Value object: money amounts as canonical decimal strings. */
export type OrderSettlementMoneyAmounts = Readonly<{
  orderTotalSnapshot: string;
  allocatedAmount: string;
  settledAmount: string;
  outstandingAmount: string;
}>;

/** Identity value object (I-OS-01). */
export type OrderSettlementIdentity = Readonly<{
  restaurantId: number;
  checkId: number;
  orderId: number;
}>;

export function isOrderSettlementStatus(
  value: string
): value is OrderSettlementStatus {
  return (ORDER_SETTLEMENT_STATUSES as readonly string[]).includes(value);
}

export function assertOrderSettlementStatus(
  value: string
): OrderSettlementStatus {
  if (!isOrderSettlementStatus(value)) {
    throw new Error(`Invalid OrderSettlementStatus: ${value}`);
  }
  return value;
}

export function isOrderSettlementTerminalStatus(
  status: OrderSettlementStatus
): status is OrderSettlementTerminalStatus {
  return (ORDER_SETTLEMENT_TERMINAL_STATUSES as readonly string[]).includes(
    status
  );
}

export function isOrderSettlementNonTerminalStatus(
  status: OrderSettlementStatus
): status is OrderSettlementNonTerminalStatus {
  return (ORDER_SETTLEMENT_NON_TERMINAL_STATUSES as readonly string[]).includes(
    status
  );
}
