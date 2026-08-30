/**
 * CASH-DRAWER-SHIFT-ATTRIBUTION-CONSISTENCY-FIX-1
 * CF → Shift temporal boundary: recovery and adoption.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { computeExpectedCash, type SettlementContext } from "@shared/crmp";
import { createInMemoryCrmpStore } from "../InMemoryCrmpStore";
import { RegisterDomainService } from "../RegisterDomainService";
import { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import { SettlementContextResolver } from "../SettlementContextResolver";
import { adoptSettlementAttributionAfterFinalize } from "../../operational-session/check/checkSettlementAttributionAdoption";
import type { CollectionFactAttributionInput } from "../../operational-session/check/checkSettlementAttributionAdoption";

const OPENED = "2026-08-29T19:10:56.000Z";
const NEW_CF_AT = "2026-08-29T19:12:23.000Z";
const PREV_CLOSED = "2026-08-29T19:10:33.000Z";

function cf(
  over: Partial<CollectionFactAttributionInput> & { collectionFactId: string; committedAt: string; amount?: string }
): CollectionFactAttributionInput {
  const amount = over.amount ?? "10.00";
  return {
    restaurantId: 1,
    orderId: 8310001,
    paymentIntentId: `pi_${over.collectionFactId}`,
    purpose: "production",
    amount,
    discountAmount: "0.00",
    currencyCode: "SAR",
    tenders: [{ paymentMethod: "cash", amount }],
    checkId: null,
    businessDay: "2026-08-29",
    actorId: "10",
    terminalId: "dev_1",
    orderingChannel: "cashier_pos",
    ...over,
  };
}

async function recoverFact(input: {
  fact: CollectionFactAttributionInput;
  resolver: SettlementContextResolver;
  shifts: FinancialShiftDomainService;
}): Promise<SettlementContext> {
  const settlementContext = await input.resolver.resolveForCollectionFact({
    restaurantId: input.fact.restaurantId,
    deviceId: input.fact.terminalId ?? undefined,
    operatorUserId: 10,
    committedAt: input.fact.committedAt,
  });
  await adoptSettlementAttributionAfterFinalize(
    {
      restaurantId: input.fact.restaurantId,
      outcome: "paid",
      settlementContext,
      settlementRecord: null,
      settlementLines: null,
      at: "2026-08-29T19:13:40.000Z",
      collectionFact: input.fact,
    },
    { shiftService: input.shifts }
  );
  return settlementContext;
}

describe("CF Shift attribution temporal boundary", () => {
  let uow: ReturnType<typeof createInMemoryCrmpStore>;
  let registers: RegisterDomainService;
  let shifts: FinancialShiftDomainService;
  let resolver: SettlementContextResolver;

  beforeEach(async () => {
    uow = createInMemoryCrmpStore();
    registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    resolver = new SettlementContextResolver(uow);
    await registers.provision({
      restaurantId: 1,
      code: "FRONT",
      displayName: "Front",
      registerType: "counter",
      registerId: "reg_1",
      at: "2026-08-29T08:00:00.000Z",
    });
    await registers.activate({
      restaurantId: 1,
      registerId: "reg_1",
      at: "2026-08-29T08:00:01.000Z",
    });
    await registers.bindDevice({
      restaurantId: 1,
      registerId: "reg_1",
      deviceId: "dev_1",
      at: "2026-08-29T08:00:02.000Z",
    });
    await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      at: "2026-08-29T08:00:03.000Z",
    });
  });

  async function closeShift(financialShiftId: string, at: string) {
    await shifts.recordCount({
      restaurantId: 1,
      financialShiftId,
      kind: "final",
      actualAmount: "0.00",
      actorUserId: 10,
      at,
    });
    await shifts.close({ restaurantId: 1, financialShiftId, at });
  }

  it("keeps one active Shift per Register (overlap is not a legal open)", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_a",
      at: "2026-08-29T08:00:00.000Z",
    });
    await expect(
      shifts.open({
        restaurantId: 1,
        registerId: "reg_1",
        operatorUserId: 10,
        openingFloatAmount: "0.00",
        currencyCode: "SAR",
        financialShiftId: "fsh_b",
        at: "2026-08-29T09:00:00.000Z",
      })
    ).rejects.toThrow(/already has an active Financial Shift/);
  });

  it("attributes a new CF to the current open Shift", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_current",
      at: OPENED,
    });
    const ctx = await recoverFact({
      fact: cf({
        collectionFactId: "pcf_new",
        committedAt: NEW_CF_AT,
      }),
      resolver,
      shifts,
    });
    expect(ctx.status).toBe("resolved");
    expect(ctx.financialShiftId).toBe("fsh_current");
    const loaded = await shifts.get(1, "fsh_current");
    expect(loaded?.attributions).toHaveLength(1);
    expect(computeExpectedCash(loaded!)).toBe("10.00");
  });

  it("does not attribute a historical CF to a later open Shift", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_current",
      at: OPENED,
    });
    const ctx = await recoverFact({
      fact: cf({
        collectionFactId: "pcf_7165079e",
        committedAt: "2026-08-28T08:24:01.000Z",
      }),
      resolver,
      shifts,
    });
    expect(ctx.financialShiftId).toBeNull();
    expect(ctx.gaps).toContain("no_shift_at_commit_time");
    const loaded = await shifts.get(1, "fsh_current");
    expect(loaded?.attributions).toHaveLength(0);
    expect(computeExpectedCash(loaded!)).toBe("0.00");
  });

  it("attributes a delayed CF to its still-open historical Shift, not a later one", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_a",
      at: "2026-08-29T08:06:14.000Z",
    });
    const duringA = cf({
      collectionFactId: "pcf_during_a",
      committedAt: "2026-08-29T12:00:00.000Z",
    });
    await closeShift("fsh_a", PREV_CLOSED);
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_b",
      at: OPENED,
    });
    const ctx = await recoverFact({ fact: duringA, resolver, shifts });
    expect(ctx.financialShiftId).toBeNull();
    expect(ctx.gaps).toContain("shift_not_writable_for_attribution");
    expect((await shifts.get(1, "fsh_a"))?.attributions).toHaveLength(0);
    expect((await shifts.get(1, "fsh_b"))?.attributions).toHaveLength(0);
  });

  it("skips when the belonging Shift is closed", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_closed",
      at: "2026-08-28T08:00:00.000Z",
    });
    await closeShift("fsh_closed", "2026-08-28T20:00:00.000Z");
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_later",
      at: OPENED,
    });
    const ctx = await resolver.resolveForCollectionFact({
      restaurantId: 1,
      registerId: "reg_1",
      committedAt: "2026-08-28T12:00:00.000Z",
    });
    expect(ctx.financialShiftId).toBeNull();
    expect(ctx.gaps).toContain("shift_not_writable_for_attribution");
  });

  it("classifies a multi-Shift timeline without choosing latest", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_a",
      at: "2026-08-29T08:00:00.000Z",
    });
    await closeShift("fsh_a", "2026-08-29T12:00:00.000Z");
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_b",
      at: "2026-08-29T12:00:00.000Z",
    });

    const before = await resolver.resolveForCollectionFact({
      restaurantId: 1,
      registerId: "reg_1",
      committedAt: "2026-08-29T07:00:00.000Z",
    });
    const duringA = await resolver.resolveForCollectionFact({
      restaurantId: 1,
      registerId: "reg_1",
      committedAt: "2026-08-29T09:00:00.000Z",
    });
    const duringB = await resolver.resolveForCollectionFact({
      restaurantId: 1,
      registerId: "reg_1",
      committedAt: "2026-08-29T13:00:00.000Z",
    });

    expect(before.gaps).toContain("no_shift_at_commit_time");
    expect(before.financialShiftId).toBeNull();
    expect(duringA.gaps).toContain("shift_not_writable_for_attribution");
    expect(duringA.financialShiftId).toBeNull();
    expect(duringB.status).toBe("resolved");
    expect(duringB.financialShiftId).toBe("fsh_b");
  });

  it("skips ambiguous overlapping lifetimes instead of taking latest", async () => {
    const register = await registers.get(1, "reg_1");
    await uow.shifts.insert({
      financialShiftId: "fsh_overlap_a",
      shiftNumber: 1,
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      status: "open",
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      drawer: {
        drawerId: "drw_oa",
        currencyCode: "SAR",
        movements: [],
        counts: [],
      },
      handover: null,
      attributions: [],
      version: 1,
      openedAt: "2026-08-29T08:00:00.000Z",
      closedAt: "2026-08-29T14:00:00.000Z",
      closeReason: null,
      archivedAt: null,
      updatedAt: "2026-08-29T08:00:00.000Z",
    });
    await uow.shifts.insert({
      financialShiftId: "fsh_overlap_b",
      shiftNumber: 2,
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      status: "open",
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      drawer: {
        drawerId: "drw_ob",
        currencyCode: "SAR",
        movements: [],
        counts: [],
      },
      handover: null,
      attributions: [],
      version: 1,
      openedAt: "2026-08-29T10:00:00.000Z",
      closedAt: null,
      closeReason: null,
      archivedAt: null,
      updatedAt: "2026-08-29T10:00:00.000Z",
    });
    expect(register?.registerId).toBe("reg_1");
    const ctx = await resolver.resolveForCollectionFact({
      restaurantId: 1,
      registerId: "reg_1",
      committedAt: "2026-08-29T11:00:00.000Z",
    });
    expect(ctx.financialShiftId).toBeNull();
    expect(ctx.gaps).toContain("ambiguous_shift_at_commit_time");
  });

  it("keeps operator and device fallbacks subordinate to committedAt", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_now",
      at: OPENED,
    });
    const byOperator = await resolver.resolveForCollectionFact({
      restaurantId: 1,
      operatorUserId: 10,
      committedAt: "2026-08-28T08:24:01.000Z",
    });
    const byDevice = await resolver.resolveForCollectionFact({
      restaurantId: 1,
      deviceId: "dev_1",
      committedAt: "2026-08-28T08:24:01.000Z",
    });
    const byRegister = await resolver.resolveForCollectionFact({
      restaurantId: 1,
      registerId: "reg_1",
      committedAt: "2026-08-28T08:24:01.000Z",
    });
    expect(byOperator.financialShiftId).toBeNull();
    expect(byDevice.financialShiftId).toBeNull();
    expect(byRegister.financialShiftId).toBeNull();
    expect(byRegister.gaps).toContain("no_shift_at_commit_time");
  });

  it("reproduces the Production 71→101 incident and keeps only the in-shift 10", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_prev",
      at: "2026-08-29T08:06:14.000Z",
    });
    await closeShift("fsh_prev", PREV_CLOSED);
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_ed7ed5d6",
      at: OPENED,
    });

    const facts = [
      cf({
        collectionFactId: "pcf_9335874a",
        committedAt: NEW_CF_AT,
        orderId: 8310001,
      }),
      cf({
        collectionFactId: "pcf_7165079e",
        committedAt: "2026-08-28T08:24:01.000Z",
        orderId: 7980001,
      }),
      cf({
        collectionFactId: "pcf_d78b3d15",
        committedAt: "2026-08-28T08:43:38.000Z",
        orderId: 8010001,
      }),
      cf({
        collectionFactId: "pcf_0e97baa6",
        committedAt: "2026-08-28T19:04:31.000Z",
        orderId: 8130003,
        orderingChannel: "qr",
      }),
    ];
    for (const fact of facts) {
      await recoverFact({ fact, resolver, shifts });
    }

    const current = await shifts.get(1, "fsh_ed7ed5d6");
    expect(current?.attributions.map((a) => a.collectionFactId)).toEqual([
      "pcf_9335874a",
    ]);
    expect(computeExpectedCash(current!)).toBe("10.00");
    expect(computeExpectedCash(current!)).not.toBe("40.00");
    expect(computeExpectedCash(current!)).not.toBe("71.00");
    expect(computeExpectedCash(current!)).not.toBe("101.00");

    const replay = await recoverFact({
      fact: facts[0]!,
      resolver,
      shifts,
    });
    expect(replay.status).toBe("resolved");
    expect((await shifts.get(1, "fsh_ed7ed5d6"))?.attributions).toHaveLength(1);
  });

  it("rejects a CF from another restaurant even when a local Shift is open", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_current",
      at: OPENED,
    });
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: {
          restaurantId: 1,
          registerId: "reg_1",
          financialShiftId: "fsh_current",
          operatorUserId: 10,
          deviceId: "dev_1",
          operationalScreenId: null,
          resolvedAt: NEW_CF_AT,
          status: "resolved",
          gaps: [],
        },
        settlementRecord: null,
        settlementLines: null,
        at: NEW_CF_AT,
        collectionFact: cf({
          collectionFactId: "pcf_other_rest",
          restaurantId: 9,
          committedAt: NEW_CF_AT,
        }),
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("failed");
    expect(bundle.attribution.gaps).toContain("wrong_restaurant");
  });

  it("does not write when the resolved register does not match the Shift", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_current",
      at: OPENED,
    });
    const bundle = await adoptSettlementAttributionAfterFinalize(
      {
        restaurantId: 1,
        outcome: "paid",
        settlementContext: {
          restaurantId: 1,
          registerId: "reg_other",
          financialShiftId: "fsh_current",
          operatorUserId: 10,
          deviceId: "dev_1",
          operationalScreenId: null,
          resolvedAt: NEW_CF_AT,
          status: "resolved",
          gaps: [],
        },
        settlementRecord: null,
        settlementLines: null,
        at: NEW_CF_AT,
        collectionFact: cf({
          collectionFactId: "pcf_wrong_reg",
          committedAt: NEW_CF_AT,
        }),
      },
      { shiftService: shifts }
    );
    expect(bundle.attribution.outcome).toBe("failed");
    expect(bundle.attribution.gaps).toContain("register_mismatch");
  });
});
