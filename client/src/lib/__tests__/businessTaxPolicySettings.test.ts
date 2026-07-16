import { describe, expect, it } from "vitest";
import {
  buildBusinessTaxPolicyDocument,
  extractPrimaryTaxRatePercent,
  getCountryFinancialPolicySuggestion,
  resolveTaxMode,
  validateTaxRatePercent,
} from "../businessTaxPolicySettings";

describe("BUSINESS-TAX-POLICY-SETTINGS-1 helpers", () => {
  it("suggests SA and AE defaults without inventing others", () => {
    expect(getCountryFinancialPolicySuggestion("SA")).toEqual({
      countryCode: "SA",
      taxEnabled: true,
      taxMode: "inclusive",
      taxRatePercent: "15",
      currencyCode: "SAR",
    });
    expect(getCountryFinancialPolicySuggestion("ae")?.taxRatePercent).toBe("5");
    expect(getCountryFinancialPolicySuggestion("US")).toBeNull();
  });

  it("validates tax rate 0–100 with decimals", () => {
    expect(validateTaxRatePercent("")).toBe("required");
    expect(validateTaxRatePercent("abc")).toBe("invalid");
    expect(validateTaxRatePercent("-1")).toBe("invalid");
    expect(validateTaxRatePercent("101")).toBe("range");
    expect(validateTaxRatePercent("0")).toBeNull();
    expect(validateTaxRatePercent("15")).toBeNull();
    expect(validateTaxRatePercent("15.5")).toBeNull();
    expect(validateTaxRatePercent("100")).toBeNull();
    expect(validateTaxRatePercent("15,5")).toBeNull();
  });

  it("extracts primary rate from taxPolicyJson", () => {
    expect(
      extractPrimaryTaxRatePercent(
        JSON.stringify({
          version: 1,
          components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
        })
      )
    ).toBe("15.00");
    expect(extractPrimaryTaxRatePercent(null)).toBe("");
  });

  it("builds taxPolicy document into taxPolicyJson shape", () => {
    const doc = buildBusinessTaxPolicyDocument({
      taxRatePercent: "15",
      componentName: "VAT",
    });
    expect(doc.version).toBe(1);
    expect(doc.components).toEqual([
      { id: "vat", name: "VAT", ratePercent: "15" },
    ]);
    expect(
      buildBusinessTaxPolicyDocument({ taxRatePercent: "" }).components
    ).toEqual([]);
  });

  it("resolves taxMode safely", () => {
    expect(resolveTaxMode("inclusive")).toBe("inclusive");
    expect(resolveTaxMode("exclusive")).toBe("exclusive");
    expect(resolveTaxMode(undefined)).toBe("exclusive");
  });
});
