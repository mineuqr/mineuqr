import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, AgentLifecycleError } from "./state";

describe("agent runtime state THERMAL-PRINTING-6D", () => {
  it("allows boot to connecting", () => {
    expect(canTransition("starting", "connecting")).toBe(true);
  });

  it("allows successful registration path", () => {
    expect(canTransition("connecting", "registering")).toBe(true);
    expect(canTransition("registering", "ready")).toBe(true);
  });

  it("allows reconnect path", () => {
    expect(canTransition("ready", "reconnecting")).toBe(true);
    expect(canTransition("reconnecting", "connecting")).toBe(true);
  });

  it("allows graceful shutdown", () => {
    expect(canTransition("ready", "stopping")).toBe(true);
    expect(canTransition("stopping", "offline")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("starting", "ready")).toBe(false);
    expect(() => assertTransition("starting", "ready")).toThrow(AgentLifecycleError);
  });
});
