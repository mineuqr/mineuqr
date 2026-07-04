import { describe, expect, it } from "vitest";
import {
  getKitchenWorkspaceActions,
  getOrderWorkspaceActions,
} from "../operationalActions";

describe("operationalActions", () => {
  it("exposes action-first labels for pending orders", () => {
    const actions = getOrderWorkspaceActions("pending");
    expect(actions.map((a) => a.id)).toEqual(["accept-order", "cancel-order"]);
    expect(actions[0]?.labelEn).toBe("Accept Order");
  });

  it("maps preparing to mark ready and cancel", () => {
    const actions = getOrderWorkspaceActions("preparing");
    expect(actions.map((a) => a.id)).toEqual(["mark-ready", "cancel-order"]);
  });

  it("maps ready to serve and cancel", () => {
    const actions = getOrderWorkspaceActions("ready");
    expect(actions.map((a) => a.id)).toEqual(["serve-order", "cancel-order"]);
  });

  it("does not expose restore when domain has no transition", () => {
    const served = getOrderWorkspaceActions("served");
    const cancelled = getOrderWorkspaceActions("cancelled");
    expect(served).toEqual([]);
    expect(cancelled).toEqual([]);
    expect(served.some((a) => a.id === "restore-order")).toBe(false);
  });

  it("kitchen workspace owns no lifecycle actions", () => {
    expect(getKitchenWorkspaceActions("pending")).toEqual([]);
    expect(getKitchenWorkspaceActions("preparing")).toEqual([]);
    expect(getKitchenWorkspaceActions("ready")).toEqual([]);
  });
});
