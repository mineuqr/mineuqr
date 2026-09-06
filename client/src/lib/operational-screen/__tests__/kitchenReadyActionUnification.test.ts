/**
 * KITCHEN-READY-ACTION-UNIFICATION-1
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { resolveOperationalScreenAction } from "../interaction/deviceOrderExecutionCapabilities";
import { getOrdersWorkspaceActions } from "@/lib/operational-workspace/operationalActions";
import { rolesExposingMarkReadyOnOperationalScreen } from "../expo/expoWorkspaceContract";
import { kitchenQueueStatusForRole } from "../kitchen/kitchenActiveQueue";

describe("KITCHEN-READY-ACTION-UNIFICATION-1", () => {
  it("Kitchen Screen exposes Ready for preparing orders only", () => {
    const ready = resolveOperationalScreenAction("kitchen_display", "preparing");
    expect(ready?.id).toBe("mark-ready");
    expect(ready?.targetStatus).toBe("ready");
    expect(ready?.labelAr).toBe("جاهز");
    expect(resolveOperationalScreenAction("kitchen_display", "pending")).toBeNull();
    expect(resolveOperationalScreenAction("kitchen_display", "ready")).toBeNull();
    expect(resolveOperationalScreenAction("kitchen_display", "served")).toBeNull();
  });

  it("Kitchen queries the active not-ready queue; Expo keeps the full pipeline", () => {
    expect(kitchenQueueStatusForRole("kitchen_display")).toBe("active");
    expect(kitchenQueueStatusForRole("expo_display")).toBe("all");
    expect(kitchenQueueStatusForRole("pickup_display")).toBe("all");
    expect(kitchenQueueStatusForRole(undefined)).toBe("all");
  });

  it("Kitchen and Expo share Ready; Kitchen cannot serve", () => {
    expect(rolesExposingMarkReadyOnOperationalScreen()).toEqual([
      "kitchen_display",
      "expo_display",
    ]);
    expect(resolveOperationalScreenAction("expo_display", "ready")?.id).toBe("serve-order");
    expect(resolveOperationalScreenAction("kitchen_display", "ready")).toBeNull();
  });

  it("Cashier preparing exposes جاهز and ready exposes تم التقديم", () => {
    const preparing = getOrdersWorkspaceActions("preparing", {
      sessionless: true,
      unpaidSessionless: false,
      orderingChannel: "cashier_pos",
    });
    expect(preparing.map((a) => a.id)).toEqual(["mark-ready", "print-order"]);
    expect(preparing[0]?.labelAr).toBe("جاهز");
    expect(preparing.some((a) => a.id === "serve-order")).toBe(false);

    const ready = getOrdersWorkspaceActions("ready", {
      sessionless: true,
      unpaidSessionless: false,
      orderingChannel: "cashier_pos",
    });
    expect(ready.map((a) => a.id)).toEqual(["serve-order", "print-order"]);
    expect(ready[0]?.labelAr).toBe("تم التقديم");
  });

  it("preserves QR / Table and Waiter workspace lifecycle actions", () => {
    for (const channel of ["table_session", "waiter_tablet"] as const) {
      expect(
        getOrdersWorkspaceActions("pending", {
          sessionless: false,
          unpaidSessionless: false,
          orderingChannel: channel,
        }).map((a) => a.id)
      ).toEqual(["accept-order", "print-order", "cancel-order"]);
      expect(
        getOrdersWorkspaceActions("preparing", {
          sessionless: false,
          unpaidSessionless: false,
          orderingChannel: channel,
        }).map((a) => a.id)
      ).toEqual(["mark-ready", "print-order"]);
      expect(
        getOrdersWorkspaceActions("ready", {
          sessionless: false,
          unpaidSessionless: false,
          orderingChannel: channel,
        }).map((a) => a.id)
      ).toEqual(["serve-order", "print-order"]);
    }
  });
});
