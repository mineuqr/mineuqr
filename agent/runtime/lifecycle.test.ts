import { describe, expect, it } from "vitest";
import { AgentLifecycle } from "./lifecycle";

describe("agent lifecycle THERMAL-PRINTING-6D", () => {
  it("starts in starting state", () => {
    expect(new AgentLifecycle().getState()).toBe("starting");
  });

  it("notifies listeners on transition", () => {
    const lifecycle = new AgentLifecycle();
    const states: string[] = [];
    lifecycle.onStateChange((state) => states.push(state));

    lifecycle.transition("connecting");
    lifecycle.transition("registering");
    lifecycle.transition("ready");

    expect(states).toEqual(["connecting", "registering", "ready"]);
  });
});
