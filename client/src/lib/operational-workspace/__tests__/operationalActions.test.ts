import { describe, expect, it } from "vitest";
import {
  getOrderWorkspaceActions,
  getOrdersWorkspaceActions,
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

  it("cashier_pos operational list offers تم التقديم and never Cancel", () => {
    for (const status of ["pending", "preparing", "ready", "served"] as const) {
      const actions = getOrdersWorkspaceActions(status, {
        sessionless: true,
        unpaidSessionless: true,
        orderingChannel: "cashier_pos",
      });
      expect(actions.map((a) => a.id), status).toEqual(["serve-order"]);
      expect(actions[0]?.labelAr).toBe("تم التقديم");
    }
    expect(
      getOrdersWorkspaceActions("cancelled", {
        sessionless: true,
        unpaidSessionless: false,
        orderingChannel: "cashier_pos",
      })
    ).toEqual([]);
  });
});
