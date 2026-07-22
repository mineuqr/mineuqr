import { describe, expect, it } from "vitest";
import {
  IllegalTerminalTransitionError,
  InvalidAllocationTransitionError,
} from "../multiCheckAllocationErrors";
import {
  assertTransitionAllowed,
  canAdjust,
  canApply,
  canCancel,
  canComplete,
  canReserve,
  canReverse,
  getAllowedTransitions,
  isTransitionAllowed,
} from "../multiCheckAllocationLifecycle";

describe("multiCheckAllocationLifecycle", () => {
  it("allows canonical happy path", () => {
    expect(isTransitionAllowed("pending", "reserved")).toBe(true);
    expect(isTransitionAllowed("reserved", "applied")).toBe(true);
    expect(isTransitionAllowed("applied", "completed")).toBe(true);
    expect(getAllowedTransitions("applied")).toEqual(
      expect.arrayContaining(["adjusted", "reversed", "completed"])
    );
  });

  it("allows cancel from pending/reserved only", () => {
    expect(canCancel("pending")).toBe(true);
    expect(canCancel("reserved")).toBe(true);
    expect(canCancel("applied")).toBe(false);
    expect(canReserve("pending")).toBe(true);
    expect(canApply("reserved")).toBe(true);
    expect(canAdjust("applied")).toBe(true);
    expect(canReverse("adjusted")).toBe(true);
    expect(canComplete("applied")).toBe(true);
  });

  it("same-state is idempotent; terminals cannot reopen", () => {
    expect(() => assertTransitionAllowed("completed", "completed")).not.toThrow();
    expect(() => assertTransitionAllowed("completed", "pending")).toThrow(
      IllegalTerminalTransitionError
    );
    expect(() => assertTransitionAllowed("reversed", "applied")).toThrow(
      IllegalTerminalTransitionError
    );
    expect(() => assertTransitionAllowed("cancelled", "reserved")).toThrow(
      IllegalTerminalTransitionError
    );
    expect(() => assertTransitionAllowed("pending", "applied")).toThrow(
      InvalidAllocationTransitionError
    );
  });
});
