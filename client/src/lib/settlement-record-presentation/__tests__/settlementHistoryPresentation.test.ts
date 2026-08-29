/**
 * SETTLEMENT-HISTORY-UX-RATIONALIZATION-1 — presentation helpers.
 */
import { describe, expect, it } from "vitest";
import {
  defaultSettlementHistoryRange,
  formatOperationalSettlementNumber,
  settlementQuickRangeBounds,
} from "../settlementHistoryPresentation";
import { toSettlementHistoryRowViewModel } from "../settlementRecordViewModel";
import type { SettlementRecordHistoryItemApiDto } from "../settlementRecordApiTypes";

describe("formatOperationalSettlementNumber", () => {
  it("formats human-readable ST numbers without technical prefixes", () => {
    expect(
      formatOperationalSettlementNumber({
        checkId: 1,
        settlementRecordId: "sr:720007:1:settlement:1",
      })
    ).toBe("ST-000001");
    expect(
      formatOperationalSettlementNumber({
        checkId: 360004,
        settlementRecordId: "sr:720007:360004:settlement:1",
      })
    ).toBe("ST-360004");
  });

  it("appends generation when greater than 1", () => {
    expect(
      formatOperationalSettlementNumber({
        checkId: 12,
        settlementRecordId: "sr:1:12:refund:2",
      })
    ).toBe("ST-000012");
  });

  it("never exposes restaurantId or sr: prefix", () => {
    const n = formatOperationalSettlementNumber({
      checkId: 99,
      settlementRecordId: "sr:720007:99:settlement:1",
    });
    expect(n).not.toContain("sr:");
    expect(n).not.toContain("720007");
  });
});

describe("settlementQuickRangeBounds", () => {
  it("defaults history retention to last 30 days", () => {
    const now = new Date(2026, 6, 24); // 24 Jul 2026 local
    const def = defaultSettlementHistoryRange(now);
    expect(def.dateTo).toBe("2026-07-24");
    expect(def.dateFrom).toBe("2026-06-25");
    expect(settlementQuickRangeBounds("30d", now)).toEqual(def);
  });

  it("supports today / 7d / 90d quick ranges", () => {
    const now = new Date(2026, 6, 24);
    expect(settlementQuickRangeBounds("today", now)).toEqual({
      dateFrom: "2026-07-24",
      dateTo: "2026-07-24",
    });
    expect(settlementQuickRangeBounds("7d", now).dateFrom).toBe("2026-07-18");
    expect(settlementQuickRangeBounds("90d", now).dateFrom).toBe("2026-04-26");
  });
});

describe("toSettlementHistoryRowViewModel rationalization", () => {
  const sample: SettlementRecordHistoryItemApiDto = {
    settlementRecordId: "sr:720007:360004:settlement:1",
    settlementNumber: "ST-360004",
    documentNumber: "ST-360004",
    documentType: "settlement",
    settlementTime: "2026-07-24T10:22:00.000Z",
    sourceType: "session",
    sourceNumber: "2310003",
    grandTotal: "57.50",
    currencyCode: "SAR",
    currencySymbol: "ر.س",
    paymentStatus: "paid",
    paymentMethodSummary: "cash",
    settlementStatus: "settled",
    recordKind: "settlement",
    outcome: "paid",
    businessDay: "2026-07-24",
    checkId: 360004,
    sessionId: 2310003,
  };

  it("merges source, hides technical id, keeps single status", () => {
    const row = toSettlementHistoryRowViewModel(sample, "en");
    expect(row.settlementNumber).toBe("ST-360004");
    expect(row.sourceLabel).toBe("Session #2310003");
    expect(row.statusLabel).toBe("Settled");
    expect(row.settlementTimeDateLabel.length).toBeGreaterThan(0);
    expect(row.settlementTimeClockLabel.length).toBeGreaterThan(0);
    expect(row.settlementNumber).not.toContain("sr:");
  });

  it("shows Order source channel and Invoice serial when present", () => {
    const row = toSettlementHistoryRowViewModel(
      {
        ...sample,
        sourceChannel: "self_order",
        invoiceNumber: "000042",
      },
      "en"
    );
    expect(row.sourceLabel).toBe("Self-Order");
    expect(row.invoiceNumber).toBe("000042");
    expect(row.sourceLabel).not.toContain("T #");
  });
});
