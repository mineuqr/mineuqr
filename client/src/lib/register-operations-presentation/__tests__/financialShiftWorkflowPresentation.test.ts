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
  classifyCurrentShiftQuery,
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

describe("classifyCurrentShiftQuery", () => {
  const openB = {
    financialShiftId: "B",
    registerId: "reg_1",
    restaurantId: 42,
    status: "open",
    version: 1,
    openedAt: "2026-01-01T12:00:00.000Z",
  };

  it("does not treat undefined/loading as no current shift", () => {
    expect(
      classifyCurrentShiftQuery({
        queryEnabled: true,
        isPending: true,
        isError: false,
        data: undefined,
      })
    ).toBe("unknown");
    expect(
      classifyCurrentShiftQuery({
        queryEnabled: false,
        isPending: true,
        isError: false,
        data: undefined,
      })
    ).toBe("unknown");
  });

  it("does not treat error as no current shift", () => {
    expect(
      classifyCurrentShiftQuery({
        queryEnabled: true,
        isPending: false,
        isError: true,
        data: undefined,
      })
    ).toBe("error");
  });

  it("treats null as confirmed no current shift", () => {
    expect(
      classifyCurrentShiftQuery({
        queryEnabled: true,
        isPending: false,
        isError: false,
        data: null,
      })
    ).toBe("none");
  });

  it("treats an open shift as active", () => {
    expect(
      classifyCurrentShiftQuery({
        queryEnabled: true,
        isPending: false,
        isError: false,
        data: openB,
      })
    ).toBe("active");
  });
});

describe("needsOpeningFloatPrompt", () => {
  it("prompts only when duty open and current shift is confirmed none", () => {
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        currentShiftKind: "none",
      })
    ).toBe(true);
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        currentShiftKind: "active",
      })
    ).toBe(false);
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "closed",
        currentShiftKind: "none",
      })
    ).toBe(false);
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        currentShiftKind: "unknown",
      })
    ).toBe(false);
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        currentShiftKind: "error",
      })
    ).toBe(false);
  });

  it("hides opening-float when Shift B is active", () => {
    expect(
      needsOpeningFloatPrompt({
        dutyStatus: "open",
        currentShiftKind: "active",
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
