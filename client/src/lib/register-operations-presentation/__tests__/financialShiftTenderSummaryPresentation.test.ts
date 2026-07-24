/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — tender summary presentation.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { presentTenderSummaryRows } from "../financialShiftTenderSummaryPresentation";
import { registerOperationsUiLabel } from "../registerOperationsCopy";

describe("presentTenderSummaryRows", () => {
  it("maps DTO amounts without recalculating totals", () => {
    const rows = presentTenderSummaryRows(
      {
        monetaryTenderTotal: "20.00",
        cashTenderTotal: "10.00",
        complimentaryAmount: "0.00",
        refundAmount: "0.00",
        methods: [
          { paymentMethod: "cash", amount: "10.00", transactionCount: 1 },
          { paymentMethod: "mada", amount: "10.00", transactionCount: 1 },
        ],
      },
      "ar"
    );

    expect(rows.find((r) => r.key === "total")?.amount).toBe("20.00");
    expect(rows.find((r) => r.key === "cash")?.amount).toBe("10.00");
    expect(rows.find((r) => r.key === "mada")?.label).toBe("مدى");
    expect(rows.find((r) => r.key === "mada")?.amount).toBe("10.00");
  });

  it("uses clarified Arabic drawer labels", () => {
    expect(registerOperationsUiLabel("cashDrawerSection", "ar")).toBe(
      "درج النقد"
    );
    expect(registerOperationsUiLabel("expectedCashInDrawer", "ar")).toBe(
      "النقد المتوقع داخل الدرج"
    );
    expect(registerOperationsUiLabel("tenderSummarySection", "ar")).toBe(
      "ملخص وسائل الدفع"
    );
    expect(registerOperationsUiLabel("currentShift", "ar")).toBe(
      "الوردية المالية"
    );
  });
});
