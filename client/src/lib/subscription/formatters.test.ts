import { describe, expect, it } from "vitest";
import {
  formatAdminKpiNumber,
  formatCurrencyUSD,
  formatPlanPriceForCycle,
} from "./formatters";

describe("subscription formatters (ADMIN-KPI-FIX-1)", () => {
  it("formatCurrencyUSD uses dollar prefix and Western digits", () => {
    expect(formatCurrencyUSD(229.92, "ar")).toBe("$229.92");
    expect(formatCurrencyUSD(229.92, "en")).toBe("$229.92");
  });

  it("formatAdminKpiNumber uses Western digits", () => {
    expect(formatAdminKpiNumber(1234)).toBe("1,234");
  });

  it("formatPlanPriceForCycle shows USD for subscription plans", () => {
    const line = formatPlanPriceForCycle(
      { id: 1, nameAr: "باقة", priceMonthly: "35", priceYearly: "299" },
      "monthly",
      "ar"
    );
    expect(line).toContain("$35.00");
    expect(line).not.toContain("ر.س");
  });
});
