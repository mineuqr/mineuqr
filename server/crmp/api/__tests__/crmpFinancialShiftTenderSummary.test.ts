/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — tender summary read compose.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { SettlementRecord } from "@shared/operational-session";
import { createInMemoryCrmpStore } from "../../InMemoryCrmpStore";
import { RegisterDomainService } from "../../RegisterDomainService";
import { FinancialShiftDomainService } from "../../FinancialShiftDomainService";
import { buildFinancialShiftTenderSummary } from "../crmpFinancialShiftTenderSummary";

function sr(input: {
  id: string;
  checkId: number;
  recordKind?: SettlementRecord["recordKind"];
  grandTotal?: string;
  orderIds?: readonly number[];
  lines: readonly { paymentMethod: string; amount: string }[];
}): SettlementRecord {
  return {
    settlementRecordId: input.id,
    restaurantId: 42,
    checkId: input.checkId,
    sessionId: null,
    orderRefs: (input.orderIds ?? []).map((orderId) => ({ orderId })),
    orderSettlementRefs: [],
    businessDay: "2026-07-24",
    outcome: input.recordKind === "refund" ? "applied" : "paid",
    recordKind: input.recordKind ?? "settlement",
    recordGeneration: 1,
    priorSettlementRecordId: null,
    currencyCode: "SAR",
    currencySnapshot: null,
    taxPolicySnapshot: null,
    subtotal: input.grandTotal ?? "0.00",
    taxTotal: "0.00",
    discountTotal: "0.00",
    serviceChargeTotal: "0.00",
    tipTotal: "0.00",
    grandTotal: input.grandTotal ?? "0.00",
    paymentSnapshot: input.lines.map((l) => ({
      paymentMethod: l.paymentMethod,
      amount: l.amount,
      status: "captured",
      tipAmount: "0.00",
    })),
    settledAt: "t4",
    createdAt: "t4",
    financialReference: null,
  } as SettlementRecord;
}

describe("buildFinancialShiftTenderSummary", () => {
  let registers: RegisterDomainService;
  let shifts: FinancialShiftDomainService;

  beforeEach(async () => {
    const uow = createInMemoryCrmpStore();
    registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    await registers.provision({
      restaurantId: 42,
      code: "C1",
      displayName: "Counter",
      registerType: "counter",
      registerId: "reg_1",
      at: "t0",
    });
    await registers.activate({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t1",
    });
    await registers.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    await shifts.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      openingFloatAmount: "100.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t3",
    });
  });

  it("aggregates cash + legacy mada as canonical card from attributed Settlement Records", async () => {
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      settlementRecordId: "sr_cash",
      operatorUserId: 7,
      cashTenderAmount: "10.00",
      at: "t4",
    });
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      settlementRecordId: "sr_mada",
      operatorUserId: 7,
      cashTenderAmount: "0.00",
      at: "t5",
    });

    const records = [
      sr({
        id: "sr_cash",
        checkId: 1,
        grandTotal: "10.00",
        lines: [{ paymentMethod: "cash", amount: "10.00" }],
      }),
      sr({
        id: "sr_mada",
        checkId: 2,
        grandTotal: "10.00",
        lines: [{ paymentMethod: "mada", amount: "10.00" }],
      }),
    ];

    const summary = await buildFinancialShiftTenderSummary({
      restaurantId: 42,
      registerId: "reg_1",
      shifts,
      loadSettlementRecords: async () => records,
    });

    expect(summary).not.toBeNull();
    expect(summary!.monetaryTenderTotal).toBe("20.00");
    expect(summary!.cashTenderTotal).toBe("10.00");
    expect(
      summary!.methods.find((m) => m.paymentMethod === "card")?.amount
    ).toBe("10.00");
    expect(
      summary!.methods.find((m) => m.paymentMethod === "mada")
    ).toBeUndefined();
    expect(summary!.complimentaryAmount).toBe("0.00");
    expect(summary!.refundAmount).toBe("0.00");
  });

  it("does not change expected cash formula (cash tenders only on shift)", async () => {
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      settlementRecordId: "sr_mada",
      operatorUserId: 7,
      cashTenderAmount: "0.00",
      at: "t4",
    });
    const expected = await shifts.getExpectedCash(42, "fsh_1");
    expect(expected).toBe("100.00");
  });

  it("includes complimentary and refund amounts from Settlement Records", async () => {
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      settlementRecordId: "sr_comp",
      operatorUserId: 7,
      cashTenderAmount: "0.00",
      at: "t4",
    });
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      settlementRecordId: "sr_refund",
      operatorUserId: 7,
      cashTenderAmount: "0.00",
      at: "t5",
    });

    const summary = await buildFinancialShiftTenderSummary({
      restaurantId: 42,
      registerId: "reg_1",
      shifts,
      loadSettlementRecords: async () => [
        sr({
          id: "sr_comp",
          checkId: 3,
          lines: [{ paymentMethod: "complimentary", amount: "15.00" }],
        }),
        sr({
          id: "sr_refund",
          checkId: 4,
          recordKind: "refund",
          grandTotal: "5.00",
          lines: [{ paymentMethod: "cash", amount: "5.00" }],
        }),
      ],
    });

    expect(summary!.complimentaryAmount).toBe("15.00");
    expect(summary!.refundAmount).toBe("5.00");
    // Refund lines excluded from monetary tender total
    expect(summary!.monetaryTenderTotal).toBe("0.00");
  });

  it("returns null when no active shift", async () => {
    const summary = await buildFinancialShiftTenderSummary({
      restaurantId: 42,
      registerId: "missing",
      shifts,
      loadSettlementRecords: async () => [],
    });
    expect(summary).toBeNull();
  });

  it("reads current Cashier tenders from Collection Fact, including split tenders", async () => {
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      collectionFactId: "cf_split",
      operatorUserId: 7,
      cashTenderAmount: "20.00",
      at: "t4",
    });

    const summary = await buildFinancialShiftTenderSummary({
      restaurantId: 42,
      registerId: "reg_1",
      shifts,
      loadSettlementRecords: async () => [],
      loadCollectionFacts: async () => [
        {
          collectionFactId: "cf_split",
          restaurantId: 42,
          orderId: 88,
          purpose: "production",
          amount: "50.00",
          discountAmount: "0.00",
          tenders: [
            { paymentMethod: "cash", amount: "20.00" },
            { paymentMethod: "card", amount: "30.00" },
          ],
          checkId: 9,
          orderingChannel: "cashier_pos",
        } as never,
      ],
    });

    expect(summary!.monetaryTenderTotal).toBe("50.00");
    expect(summary!.cashTenderTotal).toBe("20.00");
    expect(
      summary!.methods.find((m) => m.paymentMethod === "card")?.amount
    ).toBe("30.00");
  });

  it("does not treat complimentary Collection Fact other/0.00 as collected revenue", async () => {
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      collectionFactId: "cf_comp",
      operatorUserId: 7,
      cashTenderAmount: "0.00",
      at: "t4",
    });

    const summary = await buildFinancialShiftTenderSummary({
      restaurantId: 42,
      registerId: "reg_1",
      shifts,
      loadSettlementRecords: async () => [],
      loadCollectionFacts: async () => [
        {
          collectionFactId: "cf_comp",
          restaurantId: 42,
          orderId: 89,
          purpose: "production",
          amount: "0.00",
          discountAmount: "15.00",
          tenders: [{ paymentMethod: "other", amount: "0.00" }],
          checkId: 10,
          orderingChannel: "cashier_pos",
        } as never,
      ],
    });

    expect(summary!.monetaryTenderTotal).toBe("0.00");
    expect(summary!.complimentaryAmount).toBe("15.00");
  });

  it("does not double-count overlapping CF and SR sale identities", async () => {
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      collectionFactId: "cf_win",
      operatorUserId: 7,
      cashTenderAmount: "10.00",
      at: "t4",
    });
    await shifts.createAttribution({
      restaurantId: 42,
      financialShiftId: "fsh_1",
      settlementRecordId: "sr_overlap",
      operatorUserId: 7,
      cashTenderAmount: "10.00",
      at: "t5",
    });

    const summary = await buildFinancialShiftTenderSummary({
      restaurantId: 42,
      registerId: "reg_1",
      shifts,
      loadCollectionFacts: async () => [
        {
          collectionFactId: "cf_win",
          restaurantId: 42,
          orderId: 77,
          purpose: "production",
          amount: "10.00",
          discountAmount: "0.00",
          tenders: [{ paymentMethod: "cash", amount: "10.00" }],
          checkId: 5,
          orderingChannel: "cashier_pos",
        } as never,
      ],
      loadSettlementRecords: async () => [
        sr({
          id: "sr_overlap",
          checkId: 5,
          orderIds: [77],
          grandTotal: "10.00",
          lines: [{ paymentMethod: "cash", amount: "10.00" }],
        }),
      ],
    });

    expect(summary!.monetaryTenderTotal).toBe("10.00");
    expect(summary!.cashTenderTotal).toBe("10.00");
  });
});
