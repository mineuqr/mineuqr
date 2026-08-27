import { describe, expect, it } from "vitest";
import { mergeCapturedTenderLinesPreferringCollectionFact } from "../cashierTenderAnalyticsMerge";
import { collectionFactTendersToAnalyticsLines } from "../collectionFactTenderReportingAdapter";
import { getPaymentMethodAnalytics } from "../PaymentMethodAnalyticsService";
import * as srAdapter from "../settlementRecordReportingAdapter";
import * as stAdapter from "../settlementTransactionReportingAdapter";
import * as cfAdapter from "../collectionFactTenderReportingAdapter";
import { vi, beforeEach } from "vitest";

vi.mock("../settlementRecordReportingAdapter", () => ({
  listSettlementRecordPaymentLinesForReporting: vi.fn(),
  listSettlementRecordsForReporting: vi.fn(),
  listRefundSettlementRecordPaymentLinesForReporting: vi.fn(),
}));

vi.mock("../settlementTransactionReportingAdapter", () => ({
  listSettlementTransactionsForReporting: vi.fn(),
  listCapturedSettlementsByPaymentMethod: vi.fn(),
}));

vi.mock("../collectionFactTenderReportingAdapter", async () => {
  const actual = await vi.importActual<
    typeof import("../collectionFactTenderReportingAdapter")
  >("../collectionFactTenderReportingAdapter");
  return {
    ...actual,
    listProductionCollectionFactTenderLinesForReporting: vi.fn(),
  };
});

describe("ST-TENDER-PROJECTION-CLEANUP-1 merge", () => {
  it("CF + matching ST counts as one sale", () => {
    const merged = mergeCapturedTenderLinesPreferringCollectionFact({
      collectionFactLines: [
        {
          paymentMethod: "cash",
          amount: "50.00",
          status: "captured",
          checkId: 9,
          saleKey: "cf:fact-1",
        },
      ],
      historicalStLines: [
        {
          paymentMethod: "cash",
          amount: "50.00",
          status: "captured",
          checkId: 9,
          saleKey: "st:9",
        },
      ],
      overlappingCheckIds: new Set([9]),
    });
    expect(merged).toHaveLength(1);
    expect(merged[0]?.saleKey).toBe("cf:fact-1");
  });

  it("historical ST-only remains when no CF occupies the Check", () => {
    const merged = mergeCapturedTenderLinesPreferringCollectionFact({
      collectionFactLines: [],
      historicalStLines: [
        {
          paymentMethod: "card",
          amount: "20.00",
          status: "captured",
          checkId: 4,
          saleKey: "st:4",
        },
      ],
      overlappingCheckIds: new Set(),
    });
    expect(merged).toEqual([
      expect.objectContaining({ checkId: 4, amount: "20.00" }),
    ]);
  });
});

describe("ST-TENDER-PROJECTION-CLEANUP-1 CF tender mapping", () => {
  it("maps split tenders from tendersJson", () => {
    const lines = collectionFactTendersToAnalyticsLines({
      collectionFactId: "cf-split",
      amount: "70.00",
      discountAmount: "0.00",
      checkId: 2,
      tenders: [
        { paymentMethod: "cash", amount: "30.00" },
        { paymentMethod: "card", amount: "40.00" },
      ],
    });
    expect(lines.map((l) => l.paymentMethod)).toEqual(["cash", "card"]);
    expect(lines.map((l) => l.amount)).toEqual(["30.00", "40.00"]);
    expect(lines.every((l) => l.saleKey === "cf:cf-split")).toBe(true);
  });

  it("maps complimentary CF as complimentary amount, not other/0", () => {
    const lines = collectionFactTendersToAnalyticsLines({
      collectionFactId: "cf-comp",
      amount: "0.00",
      discountAmount: "25.00",
      checkId: null,
      tenders: [{ paymentMethod: "other", amount: "0.00" }],
    });
    expect(lines).toEqual([
      expect.objectContaining({
        paymentMethod: "complimentary",
        amount: "25.00",
        status: "captured",
        saleKey: "cf:cf-comp",
      }),
    ]);
  });
});

describe("getPaymentMethodAnalytics CF-native captured tenders", () => {
  beforeEach(() => {
    vi.mocked(
      srAdapter.listRefundSettlementRecordPaymentLinesForReporting
    ).mockReset();
    vi.mocked(
      srAdapter.listRefundSettlementRecordPaymentLinesForReporting
    ).mockResolvedValue([]);
    vi.mocked(
      srAdapter.listSettlementRecordPaymentLinesForReporting
    ).mockReset();
    vi.mocked(stAdapter.listSettlementTransactionsForReporting).mockReset();
    vi.mocked(
      cfAdapter.listProductionCollectionFactTenderLinesForReporting
    ).mockReset();
  });

  it("uses CF tenders for a single-tender Cashier sale", async () => {
    vi.mocked(
      cfAdapter.listProductionCollectionFactTenderLinesForReporting
    ).mockResolvedValue({
      lines: [
        {
          paymentMethod: "cash",
          amount: "40.00",
          status: "captured",
          checkId: 1,
          saleKey: "cf:a",
        },
      ],
      occupiedCheckIds: new Set([1]),
    });
    vi.mocked(stAdapter.listSettlementTransactionsForReporting).mockResolvedValue(
      []
    );

    const dto = await getPaymentMethodAnalytics({ restaurantId: 1 });
    expect(dto.monetaryTenderTotal).toBe("40.00");
    expect(dto.buckets[0]?.paymentMethod).toBe("cash");
  });

  it("does not double-count CF + ST for the same Check", async () => {
    vi.mocked(
      cfAdapter.listProductionCollectionFactTenderLinesForReporting
    ).mockResolvedValue({
      lines: [
        {
          paymentMethod: "cash",
          amount: "50.00",
          status: "captured",
          checkId: 9,
          saleKey: "cf:a",
        },
      ],
      occupiedCheckIds: new Set([9]),
    });
    vi.mocked(stAdapter.listSettlementTransactionsForReporting).mockResolvedValue(
      [
        {
          id: 1,
          restaurantId: 1,
          checkId: 9,
          sessionId: null,
          paymentMethod: "cash",
          amount: "50.00",
          currencyCode: "SAR",
          status: "captured",
          businessTimestamp: "2026-08-01T00:00:00.000Z",
          reference: null,
          externalReference: null,
          notes: null,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ]
    );

    const dto = await getPaymentMethodAnalytics({ restaurantId: 1 });
    expect(dto.monetaryTenderTotal).toBe("50.00");
    expect(dto.buckets[0]?.transactionCount).toBe(1);
  });

  it("keeps historical ST-only sales", async () => {
    vi.mocked(
      cfAdapter.listProductionCollectionFactTenderLinesForReporting
    ).mockResolvedValue({
      lines: [],
      occupiedCheckIds: new Set(),
    });
    vi.mocked(stAdapter.listSettlementTransactionsForReporting).mockResolvedValue(
      [
        {
          id: 2,
          restaurantId: 1,
          checkId: 4,
          sessionId: null,
          paymentMethod: "card",
          amount: "20.00",
          currencyCode: "SAR",
          status: "captured",
          businessTimestamp: "2026-01-01T00:00:00.000Z",
          reference: null,
          externalReference: null,
          notes: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]
    );

    const dto = await getPaymentMethodAnalytics({ restaurantId: 1 });
    expect(dto.monetaryTenderTotal).toBe("20.00");
    expect(dto.buckets[0]?.paymentMethod).toBe("card");
  });

  it("does not treat complimentary CF as gross tender revenue", async () => {
    vi.mocked(
      cfAdapter.listProductionCollectionFactTenderLinesForReporting
    ).mockResolvedValue({
      lines: [
        {
          paymentMethod: "complimentary",
          amount: "25.00",
          status: "captured",
          checkId: 0,
          saleKey: "cf:comp",
        },
      ],
      occupiedCheckIds: new Set(),
    });
    vi.mocked(stAdapter.listSettlementTransactionsForReporting).mockResolvedValue(
      []
    );

    const dto = await getPaymentMethodAnalytics({ restaurantId: 1 });
    expect(dto.monetaryTenderTotal).toBe("0.00");
    expect(dto.complimentaryAmount).toBe("25.00");
  });

  it("leaves refund SR lines on the refund side", async () => {
    vi.mocked(
      cfAdapter.listProductionCollectionFactTenderLinesForReporting
    ).mockResolvedValue({
      lines: [
        {
          paymentMethod: "cash",
          amount: "100.00",
          status: "captured",
          checkId: 1,
          saleKey: "cf:a",
        },
      ],
      occupiedCheckIds: new Set([1]),
    });
    vi.mocked(stAdapter.listSettlementTransactionsForReporting).mockResolvedValue(
      []
    );
    vi.mocked(
      srAdapter.listRefundSettlementRecordPaymentLinesForReporting
    ).mockResolvedValue([
      {
        restaurantId: 1,
        checkId: 1,
        settlementRecordId: "sr-r",
        paymentMethod: "cash",
        amount: "10.00",
        status: "refunded",
        businessTimestamp: "2026-08-02T00:00:00.000Z",
        currencyCode: "SAR",
      },
    ]);

    const dto = await getPaymentMethodAnalytics({ restaurantId: 1 });
    expect(dto.monetaryTenderTotal).toBe("100.00");
    expect(dto.refundTenderTotal).toBe("10.00");
  });
});
