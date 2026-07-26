/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 / ADOPTION-2 — presentation workflow tests.
 */
import { describe, expect, it } from "vitest";
import {
  checkRefundErrorMessage,
  mapCheckRefundApiError,
} from "../checkRefundErrorPresentation";
import { formatElapsedRefundWindow } from "../refundWindowPresentation";
import { isRefundActionVisible } from "../refundWorkflowPresentation";
import { settlementRecordUiLabel } from "../settlementRecordCopy";

describe("refund action visibility", () => {
  it("shows Refund only for paid/complimentary settlement with eligible budget", () => {
    expect(
      isRefundActionVisible({
        recordKind: "settlement",
        outcome: "paid",
        budgetEligible: true,
      })
    ).toBe(true);
    expect(
      isRefundActionVisible({
        recordKind: "settlement",
        outcome: "complimentary",
        budgetEligible: true,
      })
    ).toBe(true);
  });

  it("hides Refund for refund publications, voided, or exhausted budget", () => {
    expect(
      isRefundActionVisible({
        recordKind: "refund",
        outcome: "paid",
        budgetEligible: true,
      })
    ).toBe(false);
    expect(
      isRefundActionVisible({
        recordKind: "settlement",
        outcome: "voided",
        budgetEligible: true,
      })
    ).toBe(false);
    expect(
      isRefundActionVisible({
        recordKind: "settlement",
        outcome: "paid",
        budgetEligible: false,
      })
    ).toBe(false);
    expect(
      isRefundActionVisible({
        recordKind: "settlement",
        outcome: "paid",
        budgetEligible: null,
      })
    ).toBe(false);
  });
});

describe("refund domain error presentation", () => {
  it("maps budget / already / permission errors without inventing validation", () => {
    expect(
      mapCheckRefundApiError({ message: "RF-BUDGET-01 budget exceeded" })
    ).toBe("budget_exhausted");
    expect(
      mapCheckRefundApiError({ message: "Already refunded", data: { code: "PRECONDITION_FAILED" } })
    ).toBe("already_refunded");
    expect(
      mapCheckRefundApiError({ message: "denied", data: { code: "FORBIDDEN" } })
    ).toBe("permission_denied");
    expect(checkRefundErrorMessage("not_refundable", "en")).toBe(
      settlementRecordUiLabel("refundErrorNotRefundable", "en")
    );
    expect(checkRefundErrorMessage("budget_exhausted", "ar")).toBe(
      settlementRecordUiLabel("refundErrorBudget", "ar")
    );
    expect(
      mapCheckRefundApiError({ message: "REFUND_WINDOW_EXPIRED" })
    ).toBe("window_expired");
    expect(
      mapCheckRefundApiError({ message: "Unknown settlement number" })
    ).toBe("unknown_settlement");
  });
});

describe("RTL copy for refund workflow", () => {
  it("exposes Arabic ledger مرتجع entry and window copy", () => {
    expect(settlementRecordUiLabel("ledgerRefundAction", "ar")).toBe("مرتجع");
    expect(settlementRecordUiLabel("refundWindowExpiredTitle", "en")).toBe(
      "Refund period has expired."
    );
    expect(formatElapsedRefundWindow(90 * 60_000, "en")).toBe("1h 30m");
  });
});
