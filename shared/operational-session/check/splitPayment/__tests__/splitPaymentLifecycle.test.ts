import { describe, expect, it } from "vitest";
import {
  assertTransitionAllowed,
  getAllowedTransitions,
  isTransitionAllowed,
} from "../splitPaymentLifecycle";
import {
  IllegalTerminalTransitionError,
  InvalidTransitionError,
} from "../splitPaymentErrors";

describe("splitPaymentLifecycle", () => {
  it("allows pending → authorized | captured | cancelled | failed", () => {
    expect(getAllowedTransitions("pending")).toEqual([
      "authorized",
      "captured",
      "cancelled",
      "failed",
    ]);
  });

  it("allows captured → partially_applied | applied | voided | refunded", () => {
    expect(isTransitionAllowed("captured", "partially_applied")).toBe(true);
    expect(isTransitionAllowed("captured", "applied")).toBe(true);
  });

  it("allows applied → refunded only", () => {
    expect(getAllowedTransitions("applied")).toEqual(["refunded"]);
    expect(isTransitionAllowed("applied", "pending")).toBe(false);
  });

  it("treats same-state as allowed for idempotency", () => {
    expect(isTransitionAllowed("captured", "captured")).toBe(true);
    expect(() => assertTransitionAllowed("failed", "failed")).not.toThrow();
  });

  it("blocks terminal → non-terminal reopen", () => {
    expect(() => assertTransitionAllowed("applied", "pending")).toThrow(
      IllegalTerminalTransitionError
    );
    expect(() => assertTransitionAllowed("cancelled", "authorized")).toThrow(
      IllegalTerminalTransitionError
    );
    expect(() => assertTransitionAllowed("failed", "captured")).toThrow(
      IllegalTerminalTransitionError
    );
  });

  it("blocks illegal forward transitions", () => {
    expect(() => assertTransitionAllowed("pending", "applied")).toThrow(
      InvalidTransitionError
    );
    expect(() => assertTransitionAllowed("authorized", "partially_applied")).toThrow(
      InvalidTransitionError
    );
  });
});
