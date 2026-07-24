/**
 * FINANCIAL-SHIFT-CLOSING-PRESENTATION-1 — closing summary presentation.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  buildShiftClosingReportVm,
  computeLiveCashDifference,
  formatShiftDuration,
  shortenShiftNumber,
} from "../shiftClosingPresentation";
import { registerOperationsUiLabel } from "../registerOperationsCopy";

describe("computeLiveCashDifference", () => {
  it("computes actual minus expected", () => {
    expect(computeLiveCashDifference("110.00", "110")).toBe("0.00");
    expect(computeLiveCashDifference("110.00", "115.50")).toBe("5.50");
    expect(computeLiveCashDifference("110.00", "100")).toBe("-10.00");
  });

  it("returns null for invalid input", () => {
    expect(computeLiveCashDifference("110.00", "")).toBeNull();
    expect(computeLiveCashDifference("110.00", "abc")).toBeNull();
  });
});

describe("formatShiftDuration", () => {
  it("formats hours and minutes", () => {
    expect(
      formatShiftDuration(
        "2026-07-25T08:00:00.000Z",
        "2026-07-25T10:30:00.000Z",
        "en"
      )
    ).toBe("2h 30m");
    expect(
      formatShiftDuration(
        "2026-07-25T08:00:00.000Z",
        "2026-07-25T10:30:00.000Z",
        "ar"
      )
    ).toBe("2 س 30 د");
  });
});

describe("buildShiftClosingReportVm", () => {
  it("includes grouped tender rows and settlement count", () => {
    const vm = buildShiftClosingReportVm({
      language: "ar",
      restaurantName: "مطعم",
      registerName: "الصندوق الرئيسي",
      operatorName: "أحمد",
      financialShiftId: "fsh_a8c120c8-5473-4cb5-a8c2-f64f0cfd4bc1",
      openedAt: "2026-07-25T08:00:00.000Z",
      closedAtIso: "2026-07-25T10:00:00.000Z",
      openingFloatAmount: "100.00",
      expectedCashAmount: "110.00",
      actualCashAmount: "110.00",
      differenceAmount: "0.00",
      tenderSummary: {
        monetaryTenderTotal: "20.00",
        cashTenderTotal: "10.00",
        complimentaryAmount: "0.00",
        refundAmount: "0.00",
        attributedSettlementCount: 2,
        methods: [
          { paymentMethod: "cash", amount: "10.00", transactionCount: 1 },
          { paymentMethod: "mada", amount: "10.00", transactionCount: 1 },
        ],
      },
      generatedAtIso: "2026-07-25T10:00:00.000Z",
    });

    expect(vm.shiftNumber).toBe("f64f0cfd4bc1");
    expect(shortenShiftNumber("fsh_a8c120c8-5473-4cb5-a8c2-f64f0cfd4bc1")).toBe(
      "f64f0cfd4bc1"
    );
    expect(vm.settlementsCount).toBe(2);
    expect(vm.ordersCount).toBe(2);
    expect(vm.tenderRows.find((r) => r.key === "network_bank")?.amount).toBe(
      "10.00"
    );
    expect(vm.tenderRows.find((r) => r.key === "cash")?.label).toBe("نقد");
    expect(vm.differenceAmount).toBe("0.00");
  });
});

describe("closing copy", () => {
  it("uses closing summary and print labels", () => {
    expect(registerOperationsUiLabel("cashCountTitle", "ar")).toBe(
      "ملخص إغلاق الوردية"
    );
    expect(registerOperationsUiLabel("printClosingReport", "ar")).toBe(
      "طباعة تقرير الإغلاق"
    );
  });
});
