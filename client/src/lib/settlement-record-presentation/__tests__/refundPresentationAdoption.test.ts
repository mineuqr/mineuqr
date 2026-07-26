/**
 * REFUND-PRESENTATION-ADOPTION-1 — presentation adoption tests.
 */
import { describe, expect, it } from "vitest";
import { toSettlementChainViewModel } from "../settlementChainPresentation";
import { settlementHistoryFiltersForStatusFacet } from "../settlementHistoryFilterPresentation";
import {
  settlementPaymentStatusLabel,
  settlementRecordUiLabel,
  settlementStatusLabel,
} from "../settlementRecordCopy";
import {
  toSettlementDetailViewModel,
  toSettlementHistoryRowViewModel,
} from "../settlementRecordViewModel";
import type {
  SettlementRecordDetailApiDto,
  SettlementRecordHistoryItemApiDto,
} from "../settlementRecordApiTypes";

function historyItem(
  partial: Partial<SettlementRecordHistoryItemApiDto> &
    Pick<SettlementRecordHistoryItemApiDto, "settlementRecordId" | "settlementStatus">
): SettlementRecordHistoryItemApiDto {
  return {
    settlementNumber: "ST-000010",
    settlementTime: "2026-07-26T14:00:00.000Z",
    sourceType: "check",
    sourceNumber: "10",
    grandTotal: "100.00",
    currencyCode: "SAR",
    currencySymbol: "ر.س",
    paymentStatus: "paid",
    paymentMethodSummary: "cash",
    recordKind: "settlement",
    recordGeneration: 1,
    priorSettlementRecordId: null,
    outcome: "paid",
    businessDay: "2026-07-26",
    checkId: 10,
    sessionId: null,
    ...partial,
  };
}

function detailDto(
  partial: Partial<SettlementRecordDetailApiDto> = {}
): SettlementRecordDetailApiDto {
  return {
    settlementRecordId: "sr:1:10:settlement:1",
    settlementNumber: "ST-000010",
    settlementTime: "2026-07-26T13:00:00.000Z",
    settlementStatus: "settled",
    sourceType: "check",
    sourceIdentifier: "10",
    recordKind: "settlement",
    recordGeneration: 1,
    priorSettlementRecordId: null,
    outcome: "paid",
    checkId: 10,
    sessionId: null,
    orders: [],
    checks: [{ checkId: 10 }],
    itemsSnapshot: [],
    financialSnapshot: {
      subtotal: "100.00",
      discountAmount: "0.00",
      taxAmount: "0.00",
      grandTotal: "100.00",
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    },
    taxSnapshot: { totalTaxAmount: "0.00", lines: [] },
    paymentMethods: [
      {
        paymentMethod: "cash",
        amount: "100.00",
        currencyCode: "SAR",
        status: "captured",
        businessTimestamp: "2026-07-26T13:00:00.000Z",
      },
    ],
    grandTotal: "100.00",
    operator: { actorType: "user", actorId: "42" },
    attribution: null,
    audit: {
      createdAt: "2026-07-26T13:00:00.000Z",
      settledAt: "2026-07-26T13:00:00.000Z",
      businessDay: "2026-07-26",
    },
    ...partial,
  };
}

describe("REFUND-PRESENTATION-ADOPTION-1 status filters", () => {
  it("maps Paid / Refunded / Complimentary / Voided without separate screens", () => {
    expect(settlementHistoryFiltersForStatusFacet("all")).toEqual({
      outcome: null,
      recordKind: null,
    });
    expect(settlementHistoryFiltersForStatusFacet("paid")).toEqual({
      outcome: "paid",
      recordKind: "settlement",
    });
    expect(settlementHistoryFiltersForStatusFacet("refunded")).toEqual({
      outcome: null,
      recordKind: "refund",
    });
    expect(settlementHistoryFiltersForStatusFacet("complimentary")).toEqual({
      outcome: "complimentary",
      recordKind: null,
    });
    expect(settlementHistoryFiltersForStatusFacet("voided")).toEqual({
      outcome: "voided",
      recordKind: null,
    });
  });
});

describe("REFUND-PRESENTATION-ADOPTION-1 history / detail rendering", () => {
  it("renders refund history fields without calculating money", () => {
    const row = toSettlementHistoryRowViewModel(
      historyItem({
        settlementRecordId: "sr:1:10:refund:2",
        settlementStatus: "refunded",
        recordKind: "refund",
        recordGeneration: 2,
        priorSettlementRecordId: "sr:1:10:settlement:1",
        grandTotal: "20.00",
        paymentMethodSummary: "cash",
        businessDay: "2026-07-26",
      }),
      "en"
    );
    expect(row.statusLabel).toBe("Refunded");
    expect(row.generationLabel).toBe("2");
    expect(row.businessDay).toBe("2026-07-26");
    expect(row.priorSettlementRecordId).toBe("sr:1:10:settlement:1");
    expect(row.grandTotalLabel).toBe("ر.س20.00");
  });

  it("detail surfaces chain linkage, attribution labels, and hides raw operator ids", () => {
    const vm = toSettlementDetailViewModel(
      detailDto({
        settlementRecordId: "sr:1:10:refund:2",
        settlementStatus: "refunded",
        recordKind: "refund",
        recordGeneration: 2,
        priorSettlementRecordId: "sr:1:10:settlement:1",
        grandTotal: "20.00",
        financialSnapshot: {
          subtotal: "20.00",
          discountAmount: "0.00",
          taxAmount: "0.00",
          grandTotal: "20.00",
          currencyCode: "SAR",
          currencySymbol: "ر.س",
        },
        paymentMethods: [
          {
            paymentMethod: "cash",
            amount: "20.00",
            currencyCode: "SAR",
            status: "refunded",
            businessTimestamp: "2026-07-26T14:00:00.000Z",
          },
        ],
        attribution: {
          registerLabel: "Front Counter",
          shiftLabel: "3",
          operatorLabel: "Amina",
        },
      }),
      "en"
    );
    expect(vm.settlementStatusLabel).toBe("Refunded");
    expect(vm.generationLabel).toBe("2");
    expect(vm.priorSettlementNumber).toMatch(/^ST-/);
    expect(vm.operatorLabel).toBe("Amina");
    expect(vm.registerLabel).toBe("Front Counter");
    expect(vm.shiftLabel).toBe("3");
    expect(vm.operatorLabel).not.toContain("42");
    expect(vm.payments[0]?.statusLabel).toBe("Refunded");
  });

  it("falls back to Staff label without raw actor ids when attribution missing", () => {
    const vm = toSettlementDetailViewModel(detailDto(), "en");
    expect(vm.operatorLabel).toBe("Staff");
    expect(vm.registerLabel).toBe(
      settlementRecordUiLabel("attributionMissing", "en")
    );
  });
});

describe("REFUND-PRESENTATION-ADOPTION-1 compensating chain", () => {
  it("orders timeline by generation ascending for historical replay", () => {
    const chain = toSettlementChainViewModel(
      [
        detailDto({
          settlementRecordId: "sr:1:10:refund:2",
          recordKind: "refund",
          recordGeneration: 2,
          settlementStatus: "refunded",
          settlementTime: "2026-07-26T15:00:00.000Z",
          priorSettlementRecordId: "sr:1:10:settlement:1",
        }),
        detailDto({
          settlementRecordId: "sr:1:10:settlement:1",
          recordKind: "settlement",
          recordGeneration: 1,
          settlementStatus: "settled",
          settlementTime: "2026-07-26T13:00:00.000Z",
        }),
      ],
      "en",
      "sr:1:10:refund:2"
    );
    expect(chain).toHaveLength(2);
    expect(chain[0]?.recordKindLabel).toBe("Settlement");
    expect(chain[1]?.recordKindLabel).toBe("Refund");
    expect(chain[1]?.isCurrent).toBe(true);
    expect(chain[0]?.generationLabel).toBe("1");
    expect(chain[1]?.generationLabel).toBe("2");
  });
});

describe("REFUND-PRESENTATION-ADOPTION-1 RTL / a11y copy", () => {
  it("provides Arabic labels for refund presentation surfaces", () => {
    expect(settlementStatusLabel("refunded", "ar")).toBe("مُسترد");
    expect(settlementPaymentStatusLabel("refunded", "ar")).toBe("مُسترد");
    expect(settlementRecordUiLabel("compensatingChain", "ar")).toBe(
      "سلسلة التسوية"
    );
    expect(settlementRecordUiLabel("priorSettlement", "ar")).toBe(
      "التسوية السابقة"
    );
  });
});
