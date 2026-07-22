/**
 * ADR-ARCH-022 / ORDER-SETTLEMENT-DOMAIN-1 — invariant enforcement (pure).
 *
 * I-OS-01 … I-OS-12, I-OS-14 (I-OS-13 reserved/unused).
 * Domain receives facts as inputs — no repository / DB access.
 */

import type { OrderSettlement } from "./orderSettlementContract";
import {
  isOrderSettlementNonTerminalStatus,
  isOrderSettlementTerminalStatus,
} from "./orderSettlementContract";
import {
  DuplicateSettlementError,
  IllegalTerminalTransitionError,
  SettlementInvariantViolationError,
} from "./orderSettlementErrors";
import {
  assertAllocationValid,
  assertNoSettlementOverflow,
  assertOutstandingAlgebra,
  assertSnapshotsReconcileToOrdersSubtotal,
  buildMoneyAmounts,
} from "./orderSettlementMoney";
import { assertTransitionAllowed } from "./orderSettlementLifecycle";

/** Check outcomes relevant to I-OS-07…09 (subset; domain does not own Check). */
export type CheckOutcomeForOrderSettlement =
  | "open"
  | "paid"
  | "complimentary"
  | "voided";

export function assertIdentityValid(input: {
  restaurantId: number;
  checkId: number;
  orderId: number;
}): void {
  if (
    !Number.isInteger(input.restaurantId) ||
    input.restaurantId <= 0 ||
    !Number.isInteger(input.checkId) ||
    input.checkId <= 0 ||
    !Number.isInteger(input.orderId) ||
    input.orderId <= 0
  ) {
    throw new SettlementInvariantViolationError(
      "I-OS-01",
      "OrderSettlement identity requires positive integer restaurantId, checkId, orderId"
    );
  }
}

/** I-OS-01 — uniqueness among a provided set (caller supplies existing identities). */
export function assertUniqueIdentity(
  identity: {
    restaurantId: number;
    checkId: number;
    orderId: number;
  },
  existing: readonly {
    restaurantId: number;
    checkId: number;
    orderId: number;
  }[]
): void {
  assertIdentityValid(identity);
  const dup = existing.some(
    (e) =>
      e.restaurantId === identity.restaurantId &&
      e.checkId === identity.checkId &&
      e.orderId === identity.orderId
  );
  if (dup) {
    throw new DuplicateSettlementError(
      `I-OS-01: OrderSettlement already exists for restaurant=${identity.restaurantId} check=${identity.checkId} order=${identity.orderId}`
    );
  }
}

/** I-OS-02 — membership must exist at creation (fact supplied by caller). */
export function assertMembershipExistsAtCreate(membershipExists: boolean): void {
  if (!membershipExists) {
    throw new SettlementInvariantViolationError(
      "I-OS-02",
      "OrderSettlement must not be created without Membership for the same (checkId, orderId)"
    );
  }
}

/**
 * I-OS-03 / I-OS-04 / allocation.
 * Active algebra applies to pending | partially_settled | settled | complimentary.
 * Terminal cancelled | voided | refunded MAY zero settled+outstanding without
 * implying collection (ADR-022 I-OS-03 note).
 */
export function assertMoneyInvariants(settlement: OrderSettlement): void {
  if (
    settlement.status === "cancelled" ||
    settlement.status === "voided" ||
    settlement.status === "refunded"
  ) {
    if (
      settlement.settledAmount !== "0.00" ||
      settlement.outstandingAmount !== "0.00"
    ) {
      throw new SettlementInvariantViolationError(
        "I-OS-03",
        `Terminal status "${settlement.status}" must zero settledAmount and outstandingAmount`
      );
    }
    return;
  }

  assertOutstandingAlgebra({
    orderTotalSnapshot: settlement.orderTotalSnapshot,
    settledAmount: settlement.settledAmount,
    outstandingAmount: settlement.outstandingAmount,
    allocatedAmount: settlement.allocatedAmount,
  });
  const amounts = buildMoneyAmounts({
    orderTotalSnapshot: settlement.orderTotalSnapshot,
    settledAmount: settlement.settledAmount,
    allocatedAmount: settlement.allocatedAmount,
  });
  assertNoSettlementOverflow(amounts);
  assertAllocationValid(amounts);
}

/** I-OS-05 */
export function assertCheckOrdersSubtotalReconciles(
  activeSettlements: readonly OrderSettlement[],
  ordersSubtotal: string
): void {
  assertSnapshotsReconcileToOrdersSubtotal(
    activeSettlements.map((s) => s.orderTotalSnapshot),
    ordersSubtotal
  );
}

/**
 * I-OS-06 — at most one non-void Check contribution path for an order
 * among provided settlements (caller supplies cross-check set).
 */
export function assertSingleNonVoidContribution(
  orderId: number,
  restaurantId: number,
  settlements: readonly OrderSettlement[]
): void {
  const active = settlements.filter(
    (s) =>
      s.orderId === orderId &&
      s.restaurantId === restaurantId &&
      s.status !== "voided" &&
      s.status !== "cancelled"
  );
  const checkIds = new Set(active.map((s) => s.checkId));
  if (checkIds.size > 1) {
    throw new SettlementInvariantViolationError(
      "I-OS-06",
      `Order ${orderId} contributes to more than one non-void Check via OrderSettlement`
    );
  }
}

/** I-OS-07 — Check paid ⇒ all active OS settled */
export function assertPaidCheckConsistency(
  checkOutcome: CheckOutcomeForOrderSettlement,
  activeSettlements: readonly OrderSettlement[]
): void {
  if (checkOutcome !== "paid") return;
  for (const s of activeSettlements) {
    if (s.status !== "settled") {
      throw new SettlementInvariantViolationError(
        "I-OS-07",
        `Check paid requires OrderSettlement status settled; order ${s.orderId} is ${s.status}`
      );
    }
  }
}

/** I-OS-08 */
export function assertComplimentaryCheckConsistency(
  checkOutcome: CheckOutcomeForOrderSettlement,
  activeSettlements: readonly OrderSettlement[]
): void {
  if (checkOutcome !== "complimentary") return;
  for (const s of activeSettlements) {
    if (s.status !== "complimentary") {
      throw new SettlementInvariantViolationError(
        "I-OS-08",
        `Check complimentary requires OrderSettlement status complimentary; order ${s.orderId} is ${s.status}`
      );
    }
  }
}

/** I-OS-09 */
export function assertVoidedCheckConsistency(
  checkOutcome: CheckOutcomeForOrderSettlement,
  activeSettlements: readonly OrderSettlement[]
): void {
  if (checkOutcome !== "voided") return;
  for (const s of activeSettlements) {
    if (s.status !== "voided") {
      throw new SettlementInvariantViolationError(
        "I-OS-09",
        `Check voided requires OrderSettlement status voided; order ${s.orderId} is ${s.status}`
      );
    }
  }
}

/**
 * I-OS-10 — documentation/guard helper: OS must not be treated as Revenue.
 * Domain cannot invent Revenue; this asserts callers do not pass a "revenue" role.
 */
export function assertNotRevenueAuthority(
  claimedRole: "order_settlement_state" | "revenue" | string
): void {
  if (claimedRole === "revenue") {
    throw new SettlementInvariantViolationError(
      "I-OS-10",
      "OrderSettlement must not be treated as Check Revenue authority"
    );
  }
}

/** I-OS-11 */
export function assertTenantMatch(input: {
  settlementRestaurantId: number;
  checkRestaurantId: number;
  orderRestaurantId: number;
}): void {
  if (
    input.settlementRestaurantId !== input.checkRestaurantId ||
    input.settlementRestaurantId !== input.orderRestaurantId
  ) {
    throw new SettlementInvariantViolationError(
      "I-OS-11",
      "OrderSettlement restaurantId must match Check and Order restaurantId"
    );
  }
}

/** I-OS-12 — BI fields must not key OS */
export function assertNoBusinessIdentityKey(input: {
  businessIdentityDay?: unknown;
  businessIdentityDisplay?: unknown;
  businessIdentityScope?: unknown;
}): void {
  if (
    input.businessIdentityDay != null ||
    input.businessIdentityDisplay != null ||
    input.businessIdentityScope != null
  ) {
    throw new SettlementInvariantViolationError(
      "I-OS-12",
      "Business Identity fields must not key OrderSettlement"
    );
  }
}

/** I-OS-14 — explicit regression check */
export function assertNoTerminalRegression(
  from: OrderSettlement["status"],
  to: OrderSettlement["status"]
): void {
  if (
    isOrderSettlementTerminalStatus(from) &&
    isOrderSettlementNonTerminalStatus(to)
  ) {
    throw new IllegalTerminalTransitionError(
      `I-OS-14: cannot transition from terminal "${from}" to non-terminal "${to}"`
    );
  }
  assertTransitionAllowed(from, to);
}

/** Full structural validation of an entity snapshot. */
export function assertOrderSettlementValid(settlement: OrderSettlement): void {
  assertIdentityValid(settlement);
  assertMoneyInvariants(settlement);
}
