import { describe, expect, it } from "vitest";
import {
  assertLocalJobStateTransition,
  canTransitionLocalJobState,
  getNextLocalJobState,
  LocalJobStateError,
} from "./stateMachine";

describe("execution stateMachine THERMAL-PRINTING-6D Phase-2", () => {
  it("allows received → validated → prepared → acknowledged → delivered", () => {
    expect(canTransitionLocalJobState("received", "validated")).toBe(true);
    expect(canTransitionLocalJobState("validated", "prepared")).toBe(true);
    expect(canTransitionLocalJobState("prepared", "acknowledged")).toBe(true);
    expect(canTransitionLocalJobState("prepared", "delivered")).toBe(true);
    expect(canTransitionLocalJobState("acknowledged", "delivered")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransitionLocalJobState("received", "prepared")).toBe(false);
    expect(canTransitionLocalJobState("received", "acknowledged")).toBe(false);
    expect(canTransitionLocalJobState("validated", "acknowledged")).toBe(false);
    expect(() => assertLocalJobStateTransition("received", "prepared")).toThrow(
      LocalJobStateError
    );
  });

  it("returns next state deterministically", () => {
    expect(getNextLocalJobState("received")).toBe("validated");
    expect(getNextLocalJobState("validated")).toBe("prepared");
    expect(getNextLocalJobState("prepared")).toBe("acknowledged");
    expect(getNextLocalJobState("acknowledged")).toBe("delivered");
    expect(getNextLocalJobState("delivered")).toBeNull();
  });
});
