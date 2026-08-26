/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — presentation workflow + float parse.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  formatRegisterMoneyDisplay,
  parseMoneyAmountInput,
} from "../openingFloatPresentation";
import {
  closeRequiresCashCount,
  needsOpeningFloatPrompt,
} from "../registerOperationsWorkflow";

describe("parseMoneyAmountInput", () => {
  it("accepts zero and normalizes decimals", () => {
    expect(parseMoneyAmountInput("0")).toEqual({ ok: true, amount: "0.00" });
    expect(parseMoneyAmountInput("100")).toEqual({
      ok: true,
      amount: "100.00",
    });
    expect(parseMoneyAmountInput("12.5")).toEqual({
      ok: true,
      amount: "12.50",
    });
    expect(parseMoneyAmountInput("12,50")).toEqual({
      ok: true,
      amount: "12.50",
    });
  });

  it("rejects empty and invalid", () => {
    expect(parseMoneyAmountInput("")).toEqual({
      ok: false,
      reason: "required",
    });
    expect(parseMoneyAmountInput("  ")).toEqual({
      ok: false,
      reason: "required",
    });
    expect(parseMoneyAmountInput("-1")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(parseMoneyAmountInput("1.234")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(parseMoneyAmountInput("abc")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("needsOpeningFloatPrompt", () => {
  it("prompts only when duty open, loaded, and no shift", () => {
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        hasActiveFinancialShift: false,
        currentLoaded: true,
      })
    ).toBe(true);
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        hasActiveFinancialShift: true,
        currentLoaded: true,
      })
    ).toBe(false);
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "closed",
        hasActiveFinancialShift: false,
        currentLoaded: true,
      })
    ).toBe(false);
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        hasActiveFinancialShift: false,
        currentLoaded: false,
      })
    ).toBe(false);
  });

  it("K. opening-float exits when Shift B exists", () => {
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        hasActiveFinancialShift: true,
        currentLoaded: true,
      })
    ).toBe(false);
  });
});

describe("closeRequiresCashCount", () => {
  it("requires cash count when open duty has active shift", () => {
    expect(
      closeRequiresCashCount({
        dutyStatus: "open",
        hasActiveFinancialShift: true,
      })
    ).toBe(true);
    expect(
      closeRequiresCashCount({
        dutyStatus: "open",
        hasActiveFinancialShift: false,
      })
    ).toBe(false);
  });
});

describe("formatRegisterMoneyDisplay", () => {
  it("localizes amount with symbol", () => {
    expect(formatRegisterMoneyDisplay("10.00", "ر.س", "ar")).toBe("10.00 ر.س");
    expect(formatRegisterMoneyDisplay("10.00", "SAR", "en")).toBe("SAR 10.00");
  });
});
