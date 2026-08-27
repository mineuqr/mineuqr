import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS, ORDERING_CHANNEL_TABLE_SESSION } from "@shared/ordering-platform/orderingChannelRegistry";

const mocks = vi.hoisted(() => ({
  getOrderItemsByOrderId: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrderItemsByOrderId: (...a: unknown[]) => mocks.getOrderItemsByOrderId(...a),
}));

import { freezeCashierPosPayableFromOrder } from "../cashierPosOrderFreeze";

const SNAPSHOTS = {
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    version: 1,
    enabled: false,
    mode: "exclusive" as const,
    components: [],
  },
};

const ORDER = {
  id: 44,
  restaurantId: 1,
  orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
  status: "preparing",
  totalAmount: "999.00",
};

describe("freezeCashierPosPayableFromOrder", () => {
  beforeEach(() => {
    mocks.getOrderItemsByOrderId.mockReset();
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      {
        id: 9,
        nameEn: "Kabsa",
        nameAr: null,
        quantity: 2,
        price: "10.00",
      },
    ]);
  });

  it("freezes payable amount from persisted order items, not order.totalAmount", async () => {
    const freeze = await freezeCashierPosPayableFromOrder({
      restaurantId: 1,
      order: ORDER,
      billDiscountAmount: "0.00",
      snapshots: SNAPSHOTS,
    });
    expect(freeze.freeze.grandTotal).toBe("20.00");
    expect(freeze.freeze.checkId).toBeNull();
    expect(freeze.freeze.tenders).toEqual([{ paymentMethod: "other", amount: "20.00" }]);
    expect(freeze.freeze.composition).toEqual([
      expect.objectContaining({
        netAmount: "20.00",
        originOrderId: 44,
        description: "Kabsa",
      }),
    ]);
    expect(freeze.freeze.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
  });

  it("freezes a table_session Order through Cashier without rewriting channel", async () => {
    const freeze = await freezeCashierPosPayableFromOrder({
      restaurantId: 1,
      order: { ...ORDER, orderingChannel: ORDERING_CHANNEL_TABLE_SESSION },
      billDiscountAmount: "0.00",
      snapshots: SNAPSHOTS,
    });
    expect(freeze.freeze.orderingChannel).toBe(ORDERING_CHANNEL_TABLE_SESSION);
    expect(freeze.freeze.grandTotal).toBe("20.00");
  });

  it("freezes complimentary as zero collection with waived discount and other/0.00 tender", async () => {
    const freeze = await freezeCashierPosPayableFromOrder({
      restaurantId: 1,
      order: ORDER,
      billDiscountAmount: "0.00",
      snapshots: SNAPSHOTS,
      complimentary: true,
    });
    expect(freeze.freeze.grandTotal).toBe("0.00");
    expect(freeze.freeze.discountAmount).toBe("20.00");
    expect(freeze.freeze.tenders).toEqual([
      { paymentMethod: "other", amount: "0.00" },
    ]);
  });

  it("rejects channels that are not Cashier-finalizable", async () => {
    await expect(
      freezeCashierPosPayableFromOrder({
        restaurantId: 1,
        order: { ...ORDER, orderingChannel: "marketplace" },
        billDiscountAmount: "0.00",
        snapshots: SNAPSHOTS,
      })
    ).rejects.toThrow(/Cashier-finalizable/);
  });

  it("rejects client tender totals that do not match the frozen Order amount", async () => {
    await expect(
      freezeCashierPosPayableFromOrder({
        restaurantId: 1,
        order: ORDER,
        billDiscountAmount: "0.00",
        snapshots: SNAPSHOTS,
        settlements: [{ paymentMethod: "cash", amount: "999.00" }],
      })
    ).rejects.toThrow();
  });
});
