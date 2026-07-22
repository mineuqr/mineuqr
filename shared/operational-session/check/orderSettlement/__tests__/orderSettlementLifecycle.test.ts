import { describe, expect, it } from "vitest";
import {
  assertTransitionAllowed,
  getAllowedTransitions,
  isTransitionAllowed,
} from "../orderSettlementLifecycle";
import {
  IllegalTerminalTransitionError,
  InvalidTransitionError,
} from "../orderSettlementErrors";
import {
  ORDER_SETTLEMENT_STATUSES,
  ORDER_SETTLEMENT_TERMINAL_STATUSES,
  type OrderSettlementStatus,
} from "../orderSettlementContract";
import { assertNoTerminalRegression } from "../orderSettlementInvariants";

describe("ORDER-SETTLEMENT-DOMAIN-1 lifecycle", () => {
  it("allows canonical pending transitions", () => {
    expect(getAllowedTransitions("pending")).toEqual(
      expect.arrayContaining([
        "partially_settled",
        "settled",
        "complimentary",
        "cancelled",
        "voided",
      ])
    );
  });

  it("allows same-state for idempotent re-entry", () => {
    for (const status of ORDER_SETTLEMENT_STATUSES) {
      expect(isTransitionAllowed(status, status)).toBe(true);
      expect(() => assertTransitionAllowed(status, status)).not.toThrow();
    }
  });

  it("rejects illegal non-terminal transitions", () => {
    expect(() => assertTransitionAllowed("pending", "refunded")).toThrow(
      InvalidTransitionError
    );
    expect(() => assertTransitionAllowed("cancelled", "voided")).toThrow(
      InvalidTransitionError
    );
  });

  it("enforces I-OS-14 for every terminal → non-terminal", () => {
    const nonTerminal: OrderSettlementStatus[] = [
      "pending",
      "partially_settled",
    ];
    for (const from of ORDER_SETTLEMENT_TERMINAL_STATUSES) {
      for (const to of nonTerminal) {
        expect(() => assertTransitionAllowed(from, to)).toThrow(
          IllegalTerminalTransitionError
        );
        expect(() => assertNoTerminalRegression(from, to)).toThrow(
          IllegalTerminalTransitionError
        );
      }
    }
  });

  it("allows settled → refunded and settled → voided", () => {
    expect(() => assertTransitionAllowed("settled", "refunded")).not.toThrow();
    expect(() => assertTransitionAllowed("settled", "voided")).not.toThrow();
    expect(() =>
      assertTransitionAllowed("complimentary", "refunded")
    ).not.toThrow();
  });
});
