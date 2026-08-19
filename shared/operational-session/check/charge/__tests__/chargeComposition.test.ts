import { describe, expect, it } from "vitest";
import {
  computeChargeNetAmount,
  originNetAmount,
  sumChargeNetAmounts,
} from "../chargeMoney";
import { buildReversalCharge } from "../chargeCommands";
import type { BillCharge } from "../chargeContract";

const charge = (overrides: Partial<BillCharge> = {}): BillCharge => ({
  chargeId: "chg_a",
  restaurantId: 1,
  checkId: 10,
  sequence: 1,
  description: "Tea",
  quantity: 2,
  unitPrice: "5.00",
  lineDiscount: "0.00",
  modifierAmount: "0.00",
  netAmount: "10.00",
  taxCategory: null,
  taxAmount: "0.00",
  currencyCode: "SAR",
  originOrderId: 55,
  originOrderItemId: 7,
  originChannel: "qr",
  originReference: "order_item:7",
  createdAt: "2026-08-19 00:00:00",
  ...overrides,
});

describe("BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 charge money", () => {
  it("computes netAmount from frozen unit price, quantity, discount, modifiers", () => {
    expect(
      computeChargeNetAmount({
        unitPrice: "10.00",
        quantity: 2,
        lineDiscount: "1.50",
        modifierAmount: "0.50",
      })
    ).toBe("19.00");
  });

  it("sums Charge.netAmount including compensating negatives", () => {
    expect(
      sumChargeNetAmounts([
        { netAmount: "50.00" },
        { netAmount: "-50.00" },
        { netAmount: "12.50" },
      ])
    ).toBe("12.50");
  });

  it("origin net is correlation math over Charge facts, not live Orders", () => {
    expect(
      originNetAmount(
        [
          charge({ netAmount: "10.00" }),
          charge({
            chargeId: "chg_b",
            originOrderId: 55,
            originOrderItemId: 7,
            netAmount: "-4.00",
          }),
          charge({ chargeId: "chg_c", originOrderId: 99, netAmount: "99.00" }),
        ],
        { orderId: 55 }
      )
    ).toBe("6.00");
  });
});

describe("BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 compensating Charge", () => {
  it("builds a reversal that does not mutate the source Charge", () => {
    const source = charge();
    const reversal = buildReversalCharge({
      source,
      chargeId: "chg_rev",
      sequence: 2,
      createdAt: "2026-08-19 01:00:00",
    });
    expect(source.netAmount).toBe("10.00");
    expect(reversal.netAmount).toBe("-10.00");
    expect(reversal.originOrderId).toBe(55);
    expect(reversal.originOrderItemId).toBe(7);
    expect(reversal.originReference).toBe("reversal_of:chg_a");
    expect(reversal.chargeId).not.toBe(source.chargeId);
  });
});
