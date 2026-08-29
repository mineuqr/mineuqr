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

  it("attributes a CF-backed Cashier sale without a Settlement Record", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext(),
        settlementRecord: null,
        settlementLines: null,
        at: "t3",
        collectionFact: {
          collectionFactId: "cf_1",
          restaurantId: 1,
          orderId: 44,
          paymentIntentId: "cpi_1",
          purpose: "production",
          amount: "50.00",
          discountAmount: "0.00",
          currencyCode: "SAR",
          tenders: [
            { paymentMethod: "cash", amount: "20.00" },
            { paymentMethod: "card", amount: "30.00" },
          ],
          checkId: null,
          committedAt: "t3",
          businessDay: "2026-08-27",
          actorId: "10",
          terminalId: "term_1",
          orderingChannel: "cashier_pos",
        },
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.collectionFactId).toBe("cf_1");
    expect(bundle.attribution.settlementRecordId).toBeNull();
    expect(bundle.attribution.cashTenderAmount).toBe("20.00");
    expect(bundle.events[0]?.collectionFactId).toBe("cf_1");
  });

  it("retries a transient attribution create failure without requiring Settlement", async () => {
    let calls = 0;
    const original = shifts.createAttribution.bind(shifts);
    shifts.createAttribution = (async (input) => {
      calls += 1;
      if (calls === 1) throw new Error("shift save blip");
      return original(input);
    }) as typeof shifts.createAttribution;
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext(),
        settlementRecord: null,
        settlementLines: null,
        at: "t3",
        collectionFact: {
          collectionFactId: "cf_retry",
          restaurantId: 1,
          orderId: 44,
          paymentIntentId: "cpi_retry",
          purpose: "production",
          amount: "20.00",
          discountAmount: "0.00",
          currencyCode: "SAR",
          tenders: [{ paymentMethod: "cash", amount: "20.00" }],
          checkId: null,
          committedAt: "t3",
          businessDay: "2026-08-27",
          actorId: "10",
          terminalId: "term_1",
          orderingChannel: "cashier_pos",
        },
      },
      { shiftService: shifts }
    );
    expect(calls).toBe(2);
    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.collectionFactId).toBe("cf_retry");
    expect(bundle.attribution.settlementRecordId).toBeNull();
  });

  it("is idempotent by collectionFactId on replay", async () => {
    const input = {
      restaurantId: 1,
      outcome: "paid" as const,
      settlementContext: resolvedContext(),
      settlementRecord: null,
      settlementLines: null,
      at: "t3",
      collectionFact: {
        collectionFactId: "cf_replay",
        restaurantId: 1,
        orderId: 44,
        paymentIntentId: "cpi_1",
        purpose: "production" as const,
        amount: "10.00",
        discountAmount: "0.00",
        currencyCode: "SAR",
        tenders: [{ paymentMethod: "cash" as const, amount: "10.00" }],
        checkId: null,
        committedAt: "t3",
        businessDay: "2026-08-27",
        actorId: "10",
        terminalId: "term_1",
        orderingChannel: "cashier_pos",
      },
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
    const loaded = await shifts.get(1, "fsh_1");
    expect(loaded.attributions).toHaveLength(1);
  });

  it("fails closed for an isolated Collection Fact", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext(),
        settlementRecord: sr("cash", "10.00"),
        settlementLines: null,
        at: "t3",
        collectionFact: {
          collectionFactId: "cf_iso",
          restaurantId: 1,
          orderId: 44,
          paymentIntentId: "cpi_1",
          purpose: "shadow",
          amount: "10.00",
          discountAmount: "0.00",
          currencyCode: "SAR",
          tenders: [{ paymentMethod: "cash", amount: "10.00" }],
          checkId: 100,
          committedAt: "t3",
          businessDay: "2026-08-27",
          actorId: "10",
          terminalId: "term_1",
          orderingChannel: "cashier_pos",
        },
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("failed");
    expect(bundle.attribution.gaps).toContain("isolated_collection_fact");
  });

  it("fails closed for the wrong restaurant", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext(),
        settlementRecord: null,
        settlementLines: null,
        at: "t3",
        collectionFact: {
          collectionFactId: "cf_x",
          restaurantId: 9,
          orderId: 44,
          paymentIntentId: "cpi_1",
          purpose: "production",
          amount: "10.00",
          discountAmount: "0.00",
          currencyCode: "SAR",
          tenders: [{ paymentMethod: "cash", amount: "10.00" }],
          checkId: null,
          committedAt: "t3",
          businessDay: "2026-08-27",
          actorId: "10",
          terminalId: "term_1",
          orderingChannel: "cashier_pos",
        },
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("failed");
    expect(bundle.attribution.gaps).toContain("wrong_restaurant");
  });

  it("attributes a Check-scoped unique Collection Fact without reading SR money", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext(),
        settlementRecord: sr("cash", "99.00"),
        settlementLines: [{ paymentMethod: "cash", amount: "99.00" }],
        at: "t3",
        checkId: 100,
        orderIds: [44],
      },
      {
        shiftService: shifts,
        listProductionFacts: async () => [
          {
            collectionFactId: "cf_money",
            restaurantId: 1,
            orderId: 44,
            paymentIntentId: "cpi_m",
            purpose: "production",
            amount: "12.00",
            discountAmount: "0.00",
            currencyCode: "SAR",
            tenders: [{ paymentMethod: "card", amount: "12.00" }],
            checkId: 100,
            committedAt: "t3",
            businessDay: "2026-08-27",
            actorId: "10",
            terminalId: "term_1",
            orderingChannel: "cashier_pos",
          },
        ],
      }
    );
    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.collectionFactId).toBe("cf_money");
    expect(bundle.attribution.settlementRecordId).toBeNull();
    expect(bundle.attribution.cashTenderAmount).toBe("0.00");
  });

  it("fails closed when a Check has multiple production Collection Facts", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: resolvedContext(),
        settlementRecord: sr("cash", "10.00"),
        settlementLines: null,
        at: "t3",
        checkId: 100,
        orderIds: [44, 45],
      },
      {
        shiftService: shifts,
        listProductionFacts: async () => [
          {
            collectionFactId: "cf_a",
            restaurantId: 1,
            orderId: 44,
            paymentIntentId: "cpi_a",
            purpose: "production",
            amount: "10.00",
            discountAmount: "0.00",
            currencyCode: "SAR",
            tenders: [{ paymentMethod: "cash", amount: "10.00" }],
            checkId: 100,
            committedAt: "t3",
            businessDay: "2026-08-27",
            actorId: "10",
            terminalId: "term_1",
            orderingChannel: "cashier_pos",
          },
          {
            collectionFactId: "cf_b",
            restaurantId: 1,
            orderId: 45,
            paymentIntentId: "cpi_b",
            purpose: "production",
            amount: "10.00",
            discountAmount: "0.00",
            currencyCode: "SAR",
            tenders: [{ paymentMethod: "card", amount: "10.00" }],
            checkId: 100,
            committedAt: "t3",
            businessDay: "2026-08-27",
            actorId: "10",
            terminalId: "term_1",
            orderingChannel: "cashier_pos",
          },
        ],
      }
    );
    expect(bundle.attribution.outcome).toBe("failed");
    expect(bundle.attribution.gaps).toContain("ambiguous_collection_facts");
  });

  it("attributes complimentary Collection Fact cash as zero", async () => {
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "complimentary",
        settlementContext: resolvedContext(),
        settlementRecord: null,
        settlementLines: null,
        at: "t3",
        collectionFact: {
          collectionFactId: "cf_comp",
          restaurantId: 1,
          orderId: 44,
          paymentIntentId: "cpi_c",
          purpose: "production",
          amount: "0.00",
          discountAmount: "15.00",
          currencyCode: "SAR",
          tenders: [{ paymentMethod: "other", amount: "0.00" }],
          checkId: null,
          committedAt: "t3",
          businessDay: "2026-08-27",
          actorId: "10",
          terminalId: "term_1",
          orderingChannel: "cashier_pos",
        },
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("created");
    expect(bundle.attribution.cashTenderAmount).toBe("0.00");
    expect(bundle.attribution.collectionFactId).toBe("cf_comp");
  });

  it("concurrent CF attribution converges on one row", async () => {
    const input = {
      restaurantId: 1,
      outcome: "paid" as const,
      settlementContext: resolvedContext(),
      settlementRecord: null,
      settlementLines: null,
      at: "t3",
      collectionFact: {
        collectionFactId: "cf_race",
        restaurantId: 1,
        orderId: 44,
        paymentIntentId: "cpi_r",
        purpose: "production" as const,
        amount: "10.00",
        discountAmount: "0.00",
        currencyCode: "SAR",
        tenders: [{ paymentMethod: "cash" as const, amount: "10.00" }],
        checkId: null,
        committedAt: "t3",
        businessDay: "2026-08-27",
        actorId: "10",
        terminalId: "term_1",
        orderingChannel: "cashier_pos",
      },
    };
    const [a, b] = await Promise.all([
      adoptSettlementAttributionAfterFinalize(input, { shiftService: shifts }),
      adoptSettlementAttributionAfterFinalize(input, { shiftService: shifts }),
    ]);
    expect(["created", "already_applied", "failed"]).toContain(
      a.attribution.outcome
    );
    expect(["created", "already_applied", "failed"]).toContain(
      b.attribution.outcome
    );
    const loaded = await shifts.get(1, "fsh_1");
    expect(loaded.attributions).toHaveLength(1);
    expect(loaded.attributions[0]?.collectionFactId).toBe("cf_race");
  });
});
