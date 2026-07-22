/**
 * ADR-ARCH-022 / ORDER-SETTLEMENT-DOMAIN-1 — pure domain commands.
 *
 * Deterministic. Framework-independent. ADR-ARCH-021 compatible:
 * - Same canonical state + same command ⇒ same result (`applied` | `already_in_state`)
 * - No dependence on event order, transport, or duplicate delivery
 * - Returns explicit outcomes + event contracts for future integration
 */

import type { OrderSettlement } from "./orderSettlementContract";
import {
  eventBaseFromSettlement,
  type OrderSettlementDomainEvent,
} from "./orderSettlementEvents";
import { InvalidTransitionError } from "./orderSettlementErrors";
import {
  assertIdentityValid,
  assertMembershipExistsAtCreate,
  assertNoBusinessIdentityKey,
  assertOrderSettlementValid,
  assertTenantMatch,
  assertUniqueIdentity,
} from "./orderSettlementInvariants";
import {
  assertNonTerminal,
  assertTransitionAllowed,
} from "./orderSettlementLifecycle";
import {
  assertCoverageAmount,
  buildMoneyAmounts,
  calculateOutstandingAmount,
  formatOrderSettlementMoney,
  isFullySettled,
  isPartiallySettled,
  parseOrderSettlementMoney,
} from "./orderSettlementMoney";

/**
 * Explicit command outcome for future idempotent integration (ADR-021).
 * - applied: state changed; events are new facts
 * - already_in_state: no-op success; empty events (safe re-delivery)
 */
export type OrderSettlementCommandOutcome =
  | "applied"
  | "already_in_state";

export type OrderSettlementCommandResult = Readonly<{
  outcome: OrderSettlementCommandOutcome;
  settlement: OrderSettlement;
  events: readonly OrderSettlementDomainEvent[];
}>;

function touch(
  settlement: OrderSettlement,
  patch: Partial<OrderSettlement>,
  at: string
): OrderSettlement {
  const next: OrderSettlement = {
    ...settlement,
    ...patch,
    updatedAt: at,
  };
  assertOrderSettlementValid(next);
  return next;
}

function result(
  outcome: OrderSettlementCommandOutcome,
  settlement: OrderSettlement,
  events: readonly OrderSettlementDomainEvent[]
): OrderSettlementCommandResult {
  return { outcome, settlement, events };
}

function already(settlement: OrderSettlement): OrderSettlementCommandResult {
  return result("already_in_state", settlement, []);
}

export type CreateOrderSettlementCommand = Readonly<{
  restaurantId: number;
  checkId: number;
  orderId: number;
  orderTotalSnapshot: string;
  /** Fact: Membership exists for (checkId, orderId) — I-OS-02 */
  membershipExists: boolean;
  /** Existing identities in the same Check (or wider set) — I-OS-01 */
  existingIdentities?: readonly {
    restaurantId: number;
    checkId: number;
    orderId: number;
  }[];
  checkRestaurantId: number;
  orderRestaurantId: number;
  at: string;
  /** Must not include BI keys — I-OS-12 */
  businessIdentityDay?: unknown;
  businessIdentityDisplay?: unknown;
  businessIdentityScope?: unknown;
}>;

export function createOrderSettlement(
  cmd: CreateOrderSettlementCommand
): OrderSettlementCommandResult {
  assertIdentityValid(cmd);
  assertMembershipExistsAtCreate(cmd.membershipExists);
  assertTenantMatch({
    settlementRestaurantId: cmd.restaurantId,
    checkRestaurantId: cmd.checkRestaurantId,
    orderRestaurantId: cmd.orderRestaurantId,
  });
  assertNoBusinessIdentityKey(cmd);
  assertUniqueIdentity(cmd, cmd.existingIdentities ?? []);

  const money = buildMoneyAmounts({
    orderTotalSnapshot: cmd.orderTotalSnapshot,
    settledAmount: "0.00",
    allocatedAmount: cmd.orderTotalSnapshot,
  });

  const settlement: OrderSettlement = {
    restaurantId: cmd.restaurantId,
    checkId: cmd.checkId,
    orderId: cmd.orderId,
    status: "pending",
    ...money,
    createdAt: cmd.at,
    updatedAt: cmd.at,
  };
  assertOrderSettlementValid(settlement);

  const event = {
    ...eventBaseFromSettlement(settlement, "OrderSettlementCreated", cmd.at),
    eventType: "OrderSettlementCreated" as const,
    orderTotalSnapshot: settlement.orderTotalSnapshot,
  };

  return result("applied", settlement, [event]);
}

export type RecalculateOrderSettlementCommand = Readonly<{
  settlement: OrderSettlement;
  orderTotalSnapshot: string;
  at: string;
}>;

/**
 * Recalculate contributing total while non-terminal (open Check).
 * Adjusts allocated + outstanding; settledAmount preserved.
 */
export function recalculateOrderSettlement(
  cmd: RecalculateOrderSettlementCommand
): OrderSettlementCommandResult {
  const { settlement, at } = cmd;
  assertNonTerminal(settlement.status, "recalculate");

  const money = buildMoneyAmounts({
    orderTotalSnapshot: cmd.orderTotalSnapshot,
    settledAmount: settlement.settledAmount,
    allocatedAmount: cmd.orderTotalSnapshot,
  });

  if (
    money.orderTotalSnapshot === settlement.orderTotalSnapshot &&
    money.outstandingAmount === settlement.outstandingAmount &&
    money.allocatedAmount === settlement.allocatedAmount
  ) {
    return already(settlement);
  }

  // Partial settle + total shrink below settled is overflow — domain rejects
  const next = touch(
    settlement,
    {
      orderTotalSnapshot: money.orderTotalSnapshot,
      allocatedAmount: money.allocatedAmount,
      settledAmount: money.settledAmount,
      outstandingAmount: money.outstandingAmount,
      status: isPartiallySettled(money)
        ? "partially_settled"
        : isFullySettled(money) && parseOrderSettlementMoney(money.settledAmount) > 0
          ? "settled"
          : "pending",
    },
    at
  );

  // Recalc must not invent terminal settle without explicit settle command
  // unless remaining outstanding is zero after prior partial (edge).
  if (next.status === "settled" && settlement.status !== "settled") {
    assertTransitionAllowed(settlement.status, "settled");
  }
  if (
    next.status === "partially_settled" &&
    settlement.status === "pending"
  ) {
    assertTransitionAllowed(settlement.status, "partially_settled");
  }

  const event = {
    ...eventBaseFromSettlement(next, "OrderSettlementRecalculated", at),
    eventType: "OrderSettlementRecalculated" as const,
    orderTotalSnapshot: next.orderTotalSnapshot,
    settledAmount: next.settledAmount,
    outstandingAmount: next.outstandingAmount,
  };

  return result("applied", next, [event]);
}

export type ApplyPartialSettlementCommand = Readonly<{
  settlement: OrderSettlement;
  /** Incremental coverage to add to settledAmount */
  coverageAmount: string;
  at: string;
}>;

export function applyPartialSettlement(
  cmd: ApplyPartialSettlementCommand
): OrderSettlementCommandResult {
  const { settlement, at } = cmd;
  assertNonTerminal(settlement.status, "applyPartialSettlement");

  const coverage = assertCoverageAmount(
    calculateOutstandingAmount(
      settlement.orderTotalSnapshot,
      settlement.settledAmount
    ),
    cmd.coverageAmount,
    { allowPartial: true }
  );

  const newSettled = formatOrderSettlementMoney(
    parseOrderSettlementMoney(settlement.settledAmount) +
      parseOrderSettlementMoney(coverage)
  );
  const money = buildMoneyAmounts({
    orderTotalSnapshot: settlement.orderTotalSnapshot,
    settledAmount: newSettled,
    allocatedAmount: settlement.allocatedAmount,
  });

  if (isFullySettled(money)) {
    // Full cover via partial API — treat as full settle
    return applyFullSettlement({ settlement, at });
  }

  assertTransitionAllowed(settlement.status, "partially_settled");
  const next = touch(
    settlement,
    {
      status: "partially_settled",
      settledAmount: money.settledAmount,
      outstandingAmount: money.outstandingAmount,
    },
    at
  );

  const event = {
    ...eventBaseFromSettlement(next, "OrderSettlementPartiallySettled", at),
    eventType: "OrderSettlementPartiallySettled" as const,
    settledAmount: next.settledAmount,
    outstandingAmount: next.outstandingAmount,
    coverageApplied: coverage,
  };

  return result("applied", next, [event]);
}

export type ApplyFullSettlementCommand = Readonly<{
  settlement: OrderSettlement;
  at: string;
}>;

export function applyFullSettlement(
  cmd: ApplyFullSettlementCommand
): OrderSettlementCommandResult {
  const { settlement, at } = cmd;
  if (settlement.status === "settled") {
    return already(settlement);
  }
  assertTransitionAllowed(settlement.status, "settled");
  if (
    settlement.status !== "pending" &&
    settlement.status !== "partially_settled"
  ) {
    throw new InvalidTransitionError(
      `applyFullSettlement requires pending or partially_settled; current is ${settlement.status}`
    );
  }

  const money = buildMoneyAmounts({
    orderTotalSnapshot: settlement.orderTotalSnapshot,
    settledAmount: settlement.orderTotalSnapshot,
    allocatedAmount: settlement.allocatedAmount,
  });

  const next = touch(
    settlement,
    {
      status: "settled",
      settledAmount: money.settledAmount,
      outstandingAmount: "0.00",
    },
    at
  );

  const event = {
    ...eventBaseFromSettlement(next, "OrderSettlementSettled", at),
    eventType: "OrderSettlementSettled" as const,
    settledAmount: next.settledAmount,
  };

  return result("applied", next, [event]);
}

export type ApplyComplimentaryCommand = Readonly<{
  settlement: OrderSettlement;
  at: string;
}>;

export function applyComplimentary(
  cmd: ApplyComplimentaryCommand
): OrderSettlementCommandResult {
  const { settlement, at } = cmd;
  if (settlement.status === "complimentary") {
    return already(settlement);
  }
  assertTransitionAllowed(settlement.status, "complimentary");

  const next = touch(
    settlement,
    {
      status: "complimentary",
      settledAmount: settlement.orderTotalSnapshot,
      outstandingAmount: "0.00",
    },
    at
  );

  const event = {
    ...eventBaseFromSettlement(next, "OrderSettlementComplimentary", at),
    eventType: "OrderSettlementComplimentary" as const,
    settledAmount: next.settledAmount,
  };

  return result("applied", next, [event]);
}

export type CancelOrderSettlementCommand = Readonly<{
  settlement: OrderSettlement;
  at: string;
}>;

export function cancelOrderSettlement(
  cmd: CancelOrderSettlementCommand
): OrderSettlementCommandResult {
  const { settlement, at } = cmd;
  if (settlement.status === "cancelled") {
    return already(settlement);
  }
  assertTransitionAllowed(settlement.status, "cancelled");

  const next = touch(
    settlement,
    {
      status: "cancelled",
      settledAmount: "0.00",
      outstandingAmount: "0.00",
    },
    at
  );

  const event = {
    ...eventBaseFromSettlement(next, "OrderSettlementCancelled", at),
    eventType: "OrderSettlementCancelled" as const,
  };

  return result("applied", next, [event]);
}

export type VoidOrderSettlementCommand = Readonly<{
  settlement: OrderSettlement;
  at: string;
}>;

export function voidOrderSettlement(
  cmd: VoidOrderSettlementCommand
): OrderSettlementCommandResult {
  const { settlement, at } = cmd;
  if (settlement.status === "voided") {
    return already(settlement);
  }
  assertTransitionAllowed(settlement.status, "voided");

  const next = touch(
    settlement,
    {
      status: "voided",
      settledAmount: "0.00",
      outstandingAmount: "0.00",
    },
    at
  );

  const event = {
    ...eventBaseFromSettlement(next, "OrderSettlementVoided", at),
    eventType: "OrderSettlementVoided" as const,
  };

  return result("applied", next, [event]);
}

export type RefundOrderSettlementCommand = Readonly<{
  settlement: OrderSettlement;
  at: string;
}>;

/**
 * Refund closes paid/complimentary coverage. Does NOT reopen to pending (I-OS-14).
 * Coverage reversed: settled+outstanding zeroed; prior coverage carried on event.
 */
export function refundOrderSettlement(
  cmd: RefundOrderSettlementCommand
): OrderSettlementCommandResult {
  const { settlement, at } = cmd;
  if (settlement.status === "refunded") {
    return already(settlement);
  }
  assertTransitionAllowed(settlement.status, "refunded");

  const refundedAmount = settlement.settledAmount;
  const next = touch(
    settlement,
    {
      status: "refunded",
      settledAmount: "0.00",
      outstandingAmount: "0.00",
    },
    at
  );

  const event = {
    ...eventBaseFromSettlement(next, "OrderSettlementRefunded", at),
    eventType: "OrderSettlementRefunded" as const,
    refundedAmount,
  };

  return result("applied", next, [event]);
}
