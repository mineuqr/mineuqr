import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllOrderStatusWriteConfirmations,
  confirmOrderStatusWrite,
} from "@shared/read-freshness";
import { retainCashierPosOperationalGraceItem } from "../cashierPosGraceRetain";

describe("retainCashierPosOperationalGraceItem", () => {
  beforeEach(() => {
    clearAllOrderStatusWriteConfirmations();
  });

  it("keeps grace for non-cashier channels", () => {
    confirmOrderStatusWrite(8, "served");
    expect(
      retainCashierPosOperationalGraceItem({
        orderId: 8,
        orderingChannel: "kiosk",
        status: "ready",
      })
    ).toBe(true);
  });

  it("drops cashier_pos grace after a confirmed served write", () => {
    confirmOrderStatusWrite(8, "served");
    expect(
      retainCashierPosOperationalGraceItem({
        orderId: 8,
        orderingChannel: "cashier_pos",
        status: "pending",
      })
    ).toBe(false);
  });

  it("keeps cashier_pos grace when the write is not terminal", () => {
    confirmOrderStatusWrite(8, "ready");
    expect(
      retainCashierPosOperationalGraceItem({
        orderId: 8,
        orderingChannel: "cashier_pos",
        status: "preparing",
      })
    ).toBe(true);
  });
});
