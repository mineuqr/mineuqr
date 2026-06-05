import { describe, expect, it } from "vitest";
import {
  formatAdminKpiNumber,
  formatAdminRevenueUSD,
  formatAdminSubscriptionPrice,
} from "./formatAdminCurrency";

describe("formatAdminCurrency (PROD-UI-FIX-1)", () => {
  it("formats MRR in USD with Western digits", () => {
    expect(formatAdminRevenueUSD(191.92, "ar")).toBe("$191.92");
  });

  it("formats subscription plan prices in USD", () => {
    const line = formatAdminSubscriptionPrice(
      { nameAr: "باقة", priceMonthly: "35", priceYearly: "299" },
      "monthly",
      "ar"
    );
    expect(line).toContain("$35.00");
    expect(line).not.toContain("ر.س");
  });

  it("formats KPI counts with Western digits", () => {
    expect(formatAdminKpiNumber(7)).toBe("7");
  });
});
