import { describe, expect, it } from "vitest";
import {
  getOrderWorkspaceActions,
  getOrdersWorkspaceActions,
} from "../operationalActions";

describe("operationalActions", () => {
  it("exposes action-first labels for pending orders", () => {
    const actions = getOrderWorkspaceActions("pending");
    expect(actions.map((a) => a.id)).toEqual([
      "accept-order",
      "print-order",
      "cancel-order",
    ]);
    expect(actions[0]?.labelEn).toBe("Accept Order");
    expect(actions[1]?.labelAr).toBe("طباعة");
  });

  it("hides Cancel after acceptance and keeps Print", () => {
    expect(getOrderWorkspaceActions("preparing").map((a) => a.id)).toEqual([
      "mark-ready",
      "print-order",
    ]);
    expect(getOrderWorkspaceActions("ready").map((a) => a.id)).toEqual([
      "serve-order",
      "print-order",
    ]);
  });

  it("uses the same Cancel-after-accept hide for Kiosk, Waiter, and Table/QR", () => {
    for (const channel of ["kiosk", "waiter_tablet", "table_session"] as const) {
      const pending = getOrdersWorkspaceActions("pending", {
        sessionless: channel === "kiosk",
        unpaidSessionless: channel === "kiosk",
        orderingChannel: channel,
      });
      expect(pending.some((a) => a.id === "cancel-order"), channel).toBe(true);
      expect(
        getOrdersWorkspaceActions("preparing", {
          sessionless: channel === "kiosk",
          unpaidSessionless: channel === "kiosk",
          orderingChannel: channel,
        }).some((a) => a.id === "cancel-order"),
        channel
      ).toBe(false);
    }
  });

  it("does not expose restore when domain has no transition", () => {
    const served = getOrderWorkspaceActions("served");
    const cancelled = getOrderWorkspaceActions("cancelled");
    expect(served.map((a) => a.id)).toEqual(["print-order"]);
    expect(cancelled).toEqual([]);
    expect(served.some((a) => a.id === "restore-order")).toBe(false);
  });

  it("cashier_pos operational list offers تم التقديم until served, never Cancel", () => {
    for (const status of ["pending", "preparing", "ready"] as const) {
      const actions = getOrdersWorkspaceActions(status, {
        sessionless: true,
        unpaidSessionless: true,
        orderingChannel: "cashier_pos",
      });
      expect(actions.map((a) => a.id), status).toEqual([
        "serve-order",
        "print-order",
      ]);
      expect(actions[0]?.labelAr).toBe("تم التقديم");
    }
    expect(
      getOrdersWorkspaceActions("served", {
        sessionless: true,
        unpaidSessionless: false,
        orderingChannel: "cashier_pos",
      }).map((a) => a.id)
    ).toEqual(["print-order"]);
    expect(
      getOrdersWorkspaceActions("cancelled", {
        sessionless: true,
        unpaidSessionless: false,
        orderingChannel: "cashier_pos",
      })
    ).toEqual([]);
  });
});
