/**
 * REFUND-REGISTER-ADOPTION-1 — post-commit refund attribution (fail-open).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryCrmpStore } from "../../../crmp/InMemoryCrmpStore";
import { RegisterDomainService } from "../../../crmp/RegisterDomainService";
import { FinancialShiftDomainService } from "../../../crmp/FinancialShiftDomainService";
import { computeExpectedCash } from "@shared/crmp";
import { adoptRefundAttributionAfterFinalize } from "../checkSettlementAttributionAdoption";
import type { SettlementContext } from "@shared/crmp";
import type { SettlementRecord } from "@shared/operational-session";

function resolvedContext(
  over: Partial<SettlementContext> = {}
): SettlementContext {
  return {
    restaurantId: 1,
    registerId: "reg_1",
    financialShiftId: "fsh_1",
    operatorUserId: 10,
    deviceId: "dev_1",
    operationalScreenId: null,
    resolvedAt: "t3",
    status: "resolved",
    gaps: [],
    ...over,
  };
}

function refundSr(
  paymentMethod: string,
  amount: string,
  id = "sr:1:100:refund:2"
): SettlementRecord {
  return {
    settlementRecordId: id,
    restaurantId: 1,
    checkId: 100,
    recordKind: "refund",
    recordGeneration: 2,
    priorSettlementRecordId: "sr:1:100:settlement:1",
    paymentSnapshot: [
      {
        settlementTransactionId: null,
        paymentMethod,
        amount,
        currencyCode: "SAR",
        status: "refunded",
        businessTimestamp: "t3",
        reference: null,
        externalReference: null,
      },
    ],
  } as SettlementRecord;
}

describe("adoptRefundAttributionAfterFinalize", () => {
  let shifts: FinancialShiftDomainService;

  beforeEach(async () => {
    const uow = createInMemoryCrmpStore();
    const registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    await registers.provision({
      restaurantId: 1,
      code: "FRONT",
      displayName: "Front",
      registerType: "counter",
      registerId: "reg_1",
      at: "t0",
    });
    await registers.activate({ restaurantId: 1, registerId: "reg_1", at: "t1" });
    await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      at: "t1b",
    });
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "100.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
  });

  it("attributes cash refund with negative custody (drawer movement via attribution)", async () => {
    await shifts.createAttribution({
      restaurantId: 1,
      financialShiftId: "fsh_1",
      settlementRecordId: "sr:1:100:settlement:1",
      operatorUserId: 10,
      cashTenderAmount: "40.00",
      at: "t2b",
    });

    const bundle = await adoptRefundAttributionAfterFinalize(
      {
        restaurantId: 1,
        settlementContext: resolvedContext(),
        settlementRecord: refundSr("cash", "15.00"),
        at: "t3",
      },
      { shiftService: shifts }
    );

    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.cashTenderAmount).toBe("-15.00");
    expect(bundle.attribution.registerId).toBe("reg_1");
    expect(bundle.attribution.financialShiftId).toBe("fsh_1");
    expect(bundle.attribution.operatorUserId).toBe(10);
    expect(bundle.events[0]?.eventType).toBe("SettlementAttributed");

    const shift = await shifts.get(1, "fsh_1");
    expect(computeExpectedCash(shift!)).toBe("125.00");
  });

  it("attributes card refund with zero cash custody", async () => {
    const bundle = await adoptRefundAttributionAfterFinalize(
      {
        restaurantId: 1,
        settlementContext: resolvedContext(),
        settlementRecord: refundSr("visa", "30.00"),
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.cashTenderAmount).toBe("0.00");
  });

  it("mixed tender refund: only cash portion decreases expected cash", async () => {
    const record = {
      ...refundSr("cash", "10.00"),
      paymentSnapshot: [
        {
          settlementTransactionId: null,
          paymentMethod: "cash",
          amount: "10.00",
          currencyCode: "SAR",
          status: "refunded",
          businessTimestamp: "t3",
          reference: null,
          externalReference: null,
        },
        {
          settlementTransactionId: null,
          paymentMethod: "mada",
          amount: "20.00",
          currencyCode: "SAR",
          status: "refunded",
          businessTimestamp: "t3",
          reference: null,
          externalReference: null,
        },
      ],
    } as SettlementRecord;

    const bundle = await adoptRefundAttributionAfterFinalize(
      {
        restaurantId: 1,
        settlementContext: resolvedContext(),
        settlementRecord: record,
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.cashTenderAmount).toBe("-10.00");
    const shift = await shifts.get(1, "fsh_1");
    expect(computeExpectedCash(shift!)).toBe("90.00");
  });

  it("fail-open skip when Settlement Context incomplete", async () => {
    const bundle = await adoptRefundAttributionAfterFinalize(
      {
        restaurantId: 1,
        settlementContext: resolvedContext({
          financialShiftId: null,
          status: "partial",
          gaps: ["financial_shift_unavailable"],
        }),
        settlementRecord: refundSr("cash", "10.00"),
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("skipped");
    expect(bundle.attribution.gaps).toContain("financial_shift_unavailable");
  });

  it("idempotent retry — already_applied", async () => {
    const first = await adoptRefundAttributionAfterFinalize(
      {
        restaurantId: 1,
        settlementContext: resolvedContext(),
        settlementRecord: refundSr("cash", "10.00"),
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(first.attribution.outcome).toBe("created");

    const second = await adoptRefundAttributionAfterFinalize(
      {
        restaurantId: 1,
        settlementContext: resolvedContext(),
        settlementRecord: refundSr("cash", "10.00"),
        at: "t4",
      },
      { shiftService: shifts }
    );
    expect(second.attribution.outcome).toBe("already_applied");
    expect(second.attribution.cashTenderAmount).toBe("-10.00");
  });

  it("skips non-refund Settlement Record kinds (backward compatibility)", async () => {
    const settlement = {
      ...refundSr("cash", "10.00", "sr:1:100:settlement:1"),
      recordKind: "settlement",
      recordGeneration: 1,
      priorSettlementRecordId: null,
    } as SettlementRecord;
    const bundle = await adoptRefundAttributionAfterFinalize(
      {
        restaurantId: 1,
        settlementContext: resolvedContext(),
        settlementRecord: settlement,
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("skipped");
    expect(bundle.attribution.gaps).toContain("record_kind_not_refund");
  });
});
