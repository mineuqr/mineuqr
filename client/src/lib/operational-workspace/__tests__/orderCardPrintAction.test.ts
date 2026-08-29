/**
 * ORDER-CARD-PRINT-ACTION-1 / ORDER-CARD-OPERATIONAL-PRINT-WINDOWS-1
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { operationalDisplayReference } from "../orderDisplayIdentity";
import {
  getOperationalActionById,
  getOrdersWorkspaceActions,
  getOrderWorkspaceActions,
  isPrintOrderAction,
} from "../operationalActions";
import {
  operationalOrderTicketUiLabel,
  toOperationalOrderTicketViewModel,
} from "../operationalOrderTicket";

const CHANNELS = [
  { id: "kiosk", sessionless: true, unpaidSessionless: true },
  { id: "waiter_tablet", sessionless: false, unpaidSessionless: false },
  { id: "table_session", sessionless: false, unpaidSessionless: false },
  { id: "cashier_pos", sessionless: true, unpaidSessionless: false },
] as const;

describe("ORDER-CARD-PRINT-ACTION-1 catalog", () => {
  it("shows Print on a pending Order Card with Accept and Cancel", () => {
    const actions = getOrderWorkspaceActions("pending");
    expect(actions.map((a) => a.id)).toEqual([
      "accept-order",
      "print-order",
      "cancel-order",
    ]);
    expect(actions.find((a) => a.id === "print-order")?.labelAr).toBe("طباعة");
    expect(actions.find((a) => a.id === "print-order")?.targetStatus).toBeUndefined();
  });

  it("shows Print after acceptance when Cancel is gone", () => {
    const preparing = getOrderWorkspaceActions("preparing");
    expect(preparing.some((a) => a.id === "print-order")).toBe(true);
    expect(preparing.some((a) => a.id === "cancel-order")).toBe(false);
    expect(getOrderWorkspaceActions("ready").some((a) => a.id === "print-order")).toBe(
      true
    );
    expect(getOrderWorkspaceActions("served").map((a) => a.id)).toEqual([
      "print-order",
    ]);
  });

  it("keeps Print independent of Cancel visibility", () => {
    for (const status of ["pending", "preparing", "ready", "served"] as const) {
      const withCancelPossible = getOrdersWorkspaceActions(status, {
        sessionless: false,
        unpaidSessionless: false,
      });
      expect(withCancelPossible.some((a) => a.id === "print-order"), status).toBe(
        true
      );
      expect(
        withCancelPossible.some((a) => a.id === "print-order") &&
          (status === "pending") ===
            withCancelPossible.some((a) => a.id === "cancel-order"),
        status
      ).toBe(true);
    }
    expect(
      getOrderWorkspaceActions("preparing").some((a) => a.id === "print-order")
    ).toBe(true);
    expect(
      getOrderWorkspaceActions("preparing").some((a) => a.id === "cancel-order")
    ).toBe(false);
  });

  it("does not treat Print as Accept or Cancel", () => {
    expect(isPrintOrderAction("print-order")).toBe(true);
    expect(isPrintOrderAction("accept-order")).toBe(false);
    expect(isPrintOrderAction("cancel-order")).toBe(false);
    expect(getOperationalActionById("print-order").targetStatus).toBeUndefined();
    expect(getOperationalActionById("accept-order").targetStatus).toBe("preparing");
    expect(getOperationalActionById("cancel-order").targetStatus).toBe("cancelled");
  });

  it("uses the same Print contract for Kiosk, Waiter, Table/QR, and POS", () => {
    for (const channel of CHANNELS) {
      for (const status of ["pending", "preparing", "ready"] as const) {
        const actions = getOrdersWorkspaceActions(status, {
          sessionless: channel.sessionless,
          unpaidSessionless: channel.unpaidSessionless,
          orderingChannel: channel.id,
        });
        expect(actions.some((a) => a.id === "print-order"), `${channel.id}:${status}`).toBe(
          true
        );
        expect(actions.some((a) => a.id === "print-order" && a.targetStatus != null)).toBe(
          false
        );
      }
    }
  });

  it("preserves existing K/T/WT/P identity — Print does not remap scopes", () => {
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0005",
        businessDay: "2026-08-29",
        dailyDisplayNumber: 5,
        identityScope: "KIOSK",
      })
    ).toBe("K #005");
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0005",
        businessDay: "2026-08-29",
        dailyDisplayNumber: 5,
        identityScope: "TABLE",
      })
    ).toBe("T #005");
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0005",
        businessDay: "2026-08-29",
        dailyDisplayNumber: 5,
        identityScope: "WAITER",
      })
    ).toBe("WT #005");
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0005",
        businessDay: "2026-08-29",
        dailyDisplayNumber: 5,
        identityScope: "POS",
      })
    ).toBe("P #005");
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0005",
        displayReference: "K #005",
      })
    ).toBe("K #005");
  });

  it("keeps print preview errors as print/UI errors, not lifecycle or money errors", () => {
    expect(operationalOrderTicketUiLabel("unavailable", "en")).toMatch(/print/i);
    expect(operationalOrderTicketUiLabel("previewFailed", "ar")).toContain("الطباعة");
    expect(operationalOrderTicketUiLabel("previewFailed", "en")).not.toMatch(
      /cancel|accept|settlement|paid|invoice/i
    );
    const vm = toOperationalOrderTicketViewModel(
      {
        displayReference: "K #005",
        orderingChannel: "kiosk",
        createdAt: "2026-08-29T10:15:00.000Z",
        lineItems: [{ nameAr: "أ", nameEn: "A", quantity: 1 }],
      },
      "en"
    );
    expect(JSON.stringify(vm)).not.toMatch(/invoice|settlement|paid|tax|total/i);
  });
});
