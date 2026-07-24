/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 /
 * FINANCIAL-SHIFT-TENDER-PRESENTATION-REFINEMENT-1 —
 * tender summary presentation.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  OPS_NETWORK_BANK_METHODS,
  presentTenderSummaryRows,
} from "../financialShiftTenderSummaryPresentation";
import { registerOperationsUiLabel } from "../registerOperationsCopy";

describe("presentTenderSummaryRows (Ops refinement)", () => {
  it("groups electronic methods under network/bank", () => {
    const rows = presentTenderSummaryRows(
      {
        monetaryTenderTotal: "45.00",
        cashTenderTotal: "10.00",
        complimentaryAmount: "0.00",
        refundAmount: "0.00",
        methods: [
          { paymentMethod: "cash", amount: "10.00", transactionCount: 1 },
          { paymentMethod: "mada", amount: "10.00", transactionCount: 1 },
          { paymentMethod: "visa", amount: "15.00", transactionCount: 1 },
          { paymentMethod: "apple_pay", amount: "10.00", transactionCount: 1 },
        ],
      },
      "ar"
    );

    expect(rows.map((r) => r.key)).toEqual([
      "total",
      "cash",
      "network_bank",
      "complimentary",
      "refund",
    ]);
    expect(rows.find((r) => r.key === "total")?.amount).toBe("45.00");
    expect(rows.find((r) => r.key === "cash")?.amount).toBe("10.00");
    expect(rows.find((r) => r.key === "network_bank")?.amount).toBe("35.00");
    expect(rows.find((r) => r.key === "network_bank")?.label).toBe(
      "شبكة / بنك"
    );
    expect(rows.find((r) => r.key === "mada")).toBeUndefined();
    expect(rows.find((r) => r.key === "visa")).toBeUndefined();
  });

  it("handles cash-only and electronic-only", () => {
    const cashOnly = presentTenderSummaryRows(
      {
        monetaryTenderTotal: "10.00",
        cashTenderTotal: "10.00",
        complimentaryAmount: "0.00",
        refundAmount: "0.00",
        methods: [
          { paymentMethod: "cash", amount: "10.00", transactionCount: 1 },
        ],
      },
      "en"
    );
    expect(cashOnly.find((r) => r.key === "network_bank")?.amount).toBe(
      "0.00"
    );

    const electronicOnly = presentTenderSummaryRows(
      {
        monetaryTenderTotal: "20.00",
        cashTenderTotal: "0.00",
        complimentaryAmount: "0.00",
        refundAmount: "0.00",
        methods: [
          { paymentMethod: "mada", amount: "12.00", transactionCount: 1 },
          { paymentMethod: "bank_transfer", amount: "8.00", transactionCount: 1 },
        ],
      },
      "en"
    );
    expect(electronicOnly.find((r) => r.key === "cash")?.amount).toBe("0.00");
    expect(electronicOnly.find((r) => r.key === "network_bank")?.amount).toBe(
      "20.00"
    );
  });

  it("shows hospitality and refund labels without domain changes", () => {
    const rows = presentTenderSummaryRows(
      {
        monetaryTenderTotal: "0.00",
        cashTenderTotal: "0.00",
        complimentaryAmount: "15.00",
        refundAmount: "5.00",
        methods: [],
      },
      "ar"
    );
    expect(rows.find((r) => r.key === "complimentary")?.label).toBe("ضيافة");
    expect(rows.find((r) => r.key === "complimentary")?.amount).toBe("15.00");
    expect(rows.find((r) => r.key === "refund")?.label).toBe("مرتجع");
    expect(rows.find((r) => r.key === "refund")?.amount).toBe("5.00");
    expect(registerOperationsUiLabel("tenderComplimentary", "ar")).toBe(
      "ضيافة"
    );
    expect(registerOperationsUiLabel("cashSales", "ar")).toBe("نقد");
  });

  it("lists all network/bank method codes for grouping coverage", () => {
    expect([...OPS_NETWORK_BANK_METHODS]).toEqual([
      "mada",
      "visa",
      "mastercard",
      "apple_pay",
      "stc_pay",
      "bank_transfer",
      "other",
    ]);
  });
});
