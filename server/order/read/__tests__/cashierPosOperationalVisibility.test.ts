import { describe, expect, it } from "vitest";
import { isCashierPosOperationallyListed } from "../cashierPosOperationalVisibility";

describe("CASHIER-ORDER-VISIBILITY-AND-NOTIFICATION-1 operational listing", () => {
  it("lists non-cashier channels regardless of Check payment", () => {
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "table_session",
        paidCheck: false,
      })
    ).toBe(true);
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "kiosk",
        paidCheck: false,
      })
    ).toBe(true);
  });

  it("hides unpaid cashier_pos from operational lists until a Paid Check exists", () => {
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "cashier_pos",
        paidCheck: false,
      })
    ).toBe(false);
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "cashier_pos",
        paidCheck: true,
      })
    ).toBe(true);
  });
});
