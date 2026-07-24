import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryCrmpStore } from "../../../crmp/InMemoryCrmpStore";
import { RegisterDomainService } from "../../../crmp/RegisterDomainService";
import { FinancialShiftDomainService } from "../../../crmp/FinancialShiftDomainService";
import { adoptSettlementAttributionAfterFinalize } from "../checkSettlementAttributionAdoption";
import type { SettlementContext } from "@shared/crmp";
import type { SettlementRecord } from "@shared/operational-session";

function resolvedContext(over: Partial<SettlementContext> = {}): SettlementContext {
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

function sr(paymentMethod: string, amount: string): SettlementRecord {
  return {
    settlementRecordId: "sr:1:100:settlement:1",
    restaurantId: 1,
    checkId: 100,
    paymentSnapshot: [
      {
        settlementTransactionId: null,
        paymentMethod,
        amount,
        currencyCode: "SAR",
        status: "captured",
        businessTimestamp: "t3",
        reference: null,
        externalReference: null,
      },
    ],
  } as SettlementRecord;
}

describe("checkSettlementAttributionAdoption", () => {
  let shifts: FinancialShiftDomainService;

  beforeEach(async () => {
    const uow = createInMemoryCrmpStore();
    const registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    await registers.provision({
      restaurantId: 1,
      displayName: "Front",
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

  it("attributes cash settlement to open shift", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext(),
        settlementRecord: sr("cash", "42.00"),
        settlementLines: [{ paymentMethod: "cash", amount: "42.00" }],
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.cashTenderAmount).toBe("42.00");
    expect(bundle.attribution.registerId).toBe("reg_1");
    expect(bundle.attribution.financialShiftId).toBe("fsh_1");
    expect(bundle.attribution.settlementRecordId).toBe("sr:1:100:settlement:1");
    expect(bundle.events[0]?.eventType).toBe("SettlementAttributed");
  });

  it("attributes card settlement with zero cash tender", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext(),
        settlementRecord: sr("visa", "42.00"),
        settlementLines: [{ paymentMethod: "visa", amount: "42.00" }],
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.cashTenderAmount).toBe("0.00");
  });

  it("attributes complimentary with zero cash", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "complimentary",
        settlementContext: resolvedContext(),
        settlementRecord: sr("none", "0.00"),
        settlementLines: [{ paymentMethod: "none", amount: "0.00" }],
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.cashTenderAmount).toBe("0.00");
  });

  it("idempotent by settlementRecordId", async () => {
    const input = {
      restaurantId: 1,
      outcome: "paid" as const,
      settlementContext: resolvedContext(),
      settlementRecord: sr("cash", "10.00"),
      settlementLines: [{ paymentMethod: "cash" as const, amount: "10.00" }],
      at: "t3",
    };
    const first = await adoptSettlementAttributionAfterFinalize(input, {
      shiftService: shifts,
    });
    const second = await adoptSettlementAttributionAfterFinalize(
      { ...input, at: "t4" },
      { shiftService: shifts }
    );
    expect(first.attribution.outcome).toBe("created");
    expect(second.attribution.outcome).toBe("already_applied");
    expect(second.attribution.attributionId).toBe(
      first.attribution.attributionId
    );
  });

  it("fail-open skip when shift missing from context", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext({
          financialShiftId: null,
          status: "partial",
          gaps: ["no_active_shift"],
        }),
        settlementRecord: sr("cash", "10.00"),
        settlementLines: null,
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("skipped");
    expect(bundle.attribution.gaps).toContain("financial_shift_unavailable");
  });

  it("fail-open skip when register missing", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext({
          registerId: null,
          status: "partial",
        }),
        settlementRecord: sr("cash", "10.00"),
        settlementLines: null,
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("skipped");
    expect(bundle.attribution.gaps).toContain("register_unavailable");
  });

  it("does not attribute void", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "voided",
        settlementContext: resolvedContext(),
        settlementRecord: sr("cash", "0.00"),
        settlementLines: null,
        at: "t3",
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("skipped");
    expect(bundle.attribution.gaps).toContain("outcome_not_attributable");
  });
});
