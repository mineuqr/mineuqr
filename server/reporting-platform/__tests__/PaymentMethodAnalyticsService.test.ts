import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SettlementTransaction } from "@shared/operational-session";
import { getPaymentMethodAnalytics } from "../PaymentMethodAnalyticsService";
import * as adapter from "../settlementTransactionReportingAdapter";

vi.mock("../settlementTransactionReportingAdapter", () => ({
  listSettlementTransactionsForReporting: vi.fn(),
}));

function tx(
  overrides: Partial<SettlementTransaction> &
    Pick<SettlementTransaction, "paymentMethod" | "amount" | "checkId">
): SettlementTransaction {
  return {
    id: overrides.id ?? 1,
    restaurantId: 1,
    checkId: overrides.checkId,
    sessionId: 10,
    paymentMethod: overrides.paymentMethod,
    amount: overrides.amount,
    currencyCode: "SAR",
    status: overrides.status ?? "captured",
    businessTimestamp: "2026-07-10T12:00:00.000Z",
    reference: null,
    externalReference: null,
    notes: null,
    createdAt: "2026-07-10T12:00:00.000Z",
    updatedAt: "2026-07-10T12:00:00.000Z",
  };
}

describe("PaymentMethodAnalyticsService", () => {
  beforeEach(() => {
    vi.mocked(adapter.listSettlementTransactionsForReporting).mockReset();
  });

  it("aggregates monetary mix, check counts, and complimentary separately", async () => {
    vi.mocked(adapter.listSettlementTransactionsForReporting).mockResolvedValue([
      tx({ id: 1, paymentMethod: "cash", amount: "40.00", checkId: 1 }),
      tx({ id: 2, paymentMethod: "mada", amount: "60.00", checkId: 2 }),
      tx({ id: 3, paymentMethod: "mada", amount: "20.00", checkId: 2 }),
      tx({
        id: 4,
        paymentMethod: "complimentary",
        amount: "15.00",
        checkId: 3,
      }),
      tx({
        id: 5,
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
    expect(dto.buckets.map((b) => b.paymentMethod)).toEqual(["cash", "mada"]);
    const cash = dto.buckets.find((b) => b.paymentMethod === "cash")!;
    const mada = dto.buckets.find((b) => b.paymentMethod === "mada")!;
    expect(cash.tenderAmount).toBe("40.00");
    expect(cash.mixPercent).toBe("33.33");
    expect(cash.checkCount).toBe(1);
    expect(mada.tenderAmount).toBe("80.00");
    expect(mada.checkCount).toBe(1);
    expect(mada.transactionCount).toBe(2);
    expect(mada.averageCheck).toBe("80.00");
  });

  it("returns empty buckets when no captured monetary tenders exist", async () => {
    vi.mocked(adapter.listSettlementTransactionsForReporting).mockResolvedValue(
      []
    );
    const dto = await getPaymentMethodAnalytics({ restaurantId: 1 });
    expect(dto.buckets).toEqual([]);
    expect(dto.monetaryTenderTotal).toBe("0.00");
    expect(dto.complimentaryAmount).toBe("0.00");
  });
});
