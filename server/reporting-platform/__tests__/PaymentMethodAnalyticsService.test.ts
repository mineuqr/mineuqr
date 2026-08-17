import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPaymentMethodAnalytics } from "../PaymentMethodAnalyticsService";
import * as srAdapter from "../settlementRecordReportingAdapter";

vi.mock("../settlementRecordReportingAdapter", () => ({
  listSettlementRecordPaymentLinesForReporting: vi.fn(),
  listSettlementRecordsForReporting: vi.fn(),
  listRefundSettlementRecordPaymentLinesForReporting: vi.fn(),
}));

function line(
  overrides: Partial<{
    paymentMethod: string;
    amount: string;
    checkId: number;
    status: string;
  }> &
    Pick<
      {
        paymentMethod: string;
        amount: string;
        checkId: number;
      },
      "paymentMethod" | "amount" | "checkId"
    >
) {
  return {
    restaurantId: 1,
    checkId: overrides.checkId,
    settlementRecordId: `sr-${overrides.checkId}`,
    paymentMethod: overrides.paymentMethod,
    amount: overrides.amount,
    status: overrides.status ?? "captured",
    businessTimestamp: "2026-07-10T12:00:00.000Z",
    currencyCode: "SAR",
  };
}

describe("PaymentMethodAnalyticsService (Settlement Record)", () => {
  beforeEach(() => {
    vi.mocked(
      srAdapter.listSettlementRecordPaymentLinesForReporting
    ).mockReset();
    vi.mocked(
      srAdapter.listRefundSettlementRecordPaymentLinesForReporting
    ).mockReset();
    vi.mocked(
      srAdapter.listRefundSettlementRecordPaymentLinesForReporting
    ).mockResolvedValue([]);
  });

  it("aggregates monetary mix, check counts, and complimentary separately", async () => {
    vi.mocked(
      srAdapter.listSettlementRecordPaymentLinesForReporting
    ).mockResolvedValue([
      line({ paymentMethod: "cash", amount: "40.00", checkId: 1 }),
      line({ paymentMethod: "mada", amount: "60.00", checkId: 2 }),
      line({ paymentMethod: "mada", amount: "20.00", checkId: 2 }),
      line({
        paymentMethod: "complimentary",
        amount: "15.00",
        checkId: 3,
      }),
      line({
        paymentMethod: "visa",
        amount: "10.00",
        checkId: 4,
        status: "voided",
      }),
    ]);

    const dto = await getPaymentMethodAnalytics({
      restaurantId: 1,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
    });

    expect(dto.contractId).toBe("PaymentMethodAnalytics");
    expect(dto.programId).toBe("REPORTING-PAYMENT-METHOD-ANALYTICS-1");
    expect(dto.monetaryTenderTotal).toBe("120.00");
    expect(dto.complimentaryAmount).toBe("15.00");
    expect(dto.buckets.map((b) => b.paymentMethod)).toEqual(["card", "cash"]);
    const cash = dto.buckets.find((b) => b.paymentMethod === "cash")!;
    const card = dto.buckets.find((b) => b.paymentMethod === "card")!;
    expect(cash.tenderAmount).toBe("40.00");
    expect(cash.mixPercent).toBe("33.33");
    expect(cash.checkCount).toBe(1);
    expect(card.tenderAmount).toBe("80.00");
    expect(card.checkCount).toBe(1);
    expect(card.transactionCount).toBe(2);
    expect(card.averageCheck).toBe("80.00");
    expect(card.category).toBe("card");
  });

  it("returns empty buckets when no captured monetary tenders exist", async () => {
    vi.mocked(
      srAdapter.listSettlementRecordPaymentLinesForReporting
    ).mockResolvedValue([]);
    const dto = await getPaymentMethodAnalytics({ restaurantId: 1 });
    expect(dto.buckets).toEqual([]);
    expect(dto.monetaryTenderTotal).toBe("0.00");
    expect(dto.complimentaryAmount).toBe("0.00");
  });
});
