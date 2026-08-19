import { describe, expect, it } from "vitest";
import {
  computeChargeNetAmount,
  originNetAmount,
  sumChargeNetAmounts,
} from "../chargeMoney";
import { buildReversalCharge, planOpenChargeCorrections } from "../chargeCommands";
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

describe("BILL-CHARGE-COMPOSITION-HARDENING-1 OPEN-Bill correction plan", () => {
  it("adds a Charge for a new Order item without rebuilding existing Charges", () => {
    const existing = charge();
    const plan = planOpenChargeCorrections({
      orderId: 55,
      charges: [existing],
      intended: [
        {
          originOrderItemId: 7,
          description: "Tea",
          quantity: 2,
          unitPrice: "5.00",
        },
        {
          originOrderItemId: 8,
          description: "Water",
          quantity: 1,
          unitPrice: "3.00",
        },
      ],
    });
    expect(plan).toEqual([
      expect.objectContaining({
        originOrderItemId: 8,
        netAmount: "3.00",
        quantity: 1,
        unitPrice: "3.00",
        modifierAmount: "0.00",
      }),
    ]);
    expect(existing.netAmount).toBe("10.00");
  });

  it("represents a price change as a compensating fact, not a mutation", () => {
    const existing = charge({
      quantity: 1,
      unitPrice: "50.00",
      netAmount: "50.00",
    });
    const plan = planOpenChargeCorrections({
      orderId: 55,
      charges: [existing],
      intended: [
        {
          originOrderItemId: 7,
          description: "Burger",
          quantity: 1,
          unitPrice: "45.00",
        },
      ],
    });
    expect(existing.netAmount).toBe("50.00");
    expect(plan).toEqual([
      expect.objectContaining({
        originOrderItemId: 7,
        netAmount: "-5.00",
        originReference: "correction:order_item:7",
      }),
    ]);
  });

  it("represents quantity increase and decrease as compensating facts", () => {
    const existing = charge({
      quantity: 2,
      unitPrice: "50.00",
      netAmount: "100.00",
    });
    expect(
      planOpenChargeCorrections({
        orderId: 55,
        charges: [existing],
        intended: [
          {
            originOrderItemId: 7,
            description: "Burger",
            quantity: 3,
            unitPrice: "50.00",
          },
        ],
      })[0]?.netAmount
    ).toBe("50.00");
    expect(
      planOpenChargeCorrections({
        orderId: 55,
        charges: [existing],
        intended: [
          {
            originOrderItemId: 7,
            description: "Burger",
            quantity: 1,
            unitPrice: "50.00",
          },
        ],
      })[0]?.netAmount
    ).toBe("-50.00");
  });

  it("removes an item by compensating remaining origin net to zero", () => {
    const existing = charge();
    const plan = planOpenChargeCorrections({
      orderId: 55,
      charges: [existing],
      intended: [],
    });
    expect(existing.netAmount).toBe("10.00");
    expect(plan).toEqual([
      expect.objectContaining({ originOrderItemId: 7, netAmount: "-10.00" }),
    ]);
  });

  it("is idempotent when intended nets already match Charge composition", () => {
    expect(
      planOpenChargeCorrections({
        orderId: 55,
        charges: [charge()],
        intended: [
          {
            originOrderItemId: 7,
            description: "Tea",
            quantity: 2,
            unitPrice: "5.00",
          },
        ],
      })
    ).toEqual([]);
  });

  it("does not invent financial modifier amounts from display labels", () => {
    const plan = planOpenChargeCorrections({
      orderId: 55,
      charges: [],
      intended: [
        {
          originOrderItemId: 7,
          description: "Tea",
          quantity: 1,
          unitPrice: "5.00",
        },
      ],
    });
    expect(plan[0]?.modifierAmount).toBe("0.00");
  });
});
