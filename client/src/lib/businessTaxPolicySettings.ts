/**
 * BUSINESS-TAX-POLICY-SETTINGS-1 — Presentation helpers for Restaurant Settings.
 * Persists via restaurant.update → taxEnabled / taxMode / taxPolicyJson.
 * Country defaults are suggestions only (never auto-applied).
 */
import {
  parseBusinessTaxPolicyJson,
  type BusinessTaxPolicyDocument,
  type CheckTaxMode,
} from "@shared/operational-session";

export type CountryFinancialPolicySuggestion = Readonly<{
  countryCode: string;
  taxEnabled: boolean;
  taxMode: CheckTaxMode;
  taxRatePercent: string;
  currencyCode: string;
}>;

/** Optional country → policy hints for the Settings UI. Never auto-applied. */
const COUNTRY_FINANCIAL_POLICY_SUGGESTIONS: Record<
  string,
  Omit<CountryFinancialPolicySuggestion, "countryCode">
> = {
  SA: {
    taxEnabled: true,
    taxMode: "inclusive",
    taxRatePercent: "15",
    currencyCode: "SAR",
  },
  AE: {
    taxEnabled: true,
    taxMode: "inclusive",
    taxRatePercent: "5",
    currencyCode: "AED",
  },
};

export function getCountryFinancialPolicySuggestion(
  countryCode: string | null | undefined
): CountryFinancialPolicySuggestion | null {
  const code = String(countryCode ?? "")
    .trim()
    .toUpperCase();
  if (!code) return null;
  const hit = COUNTRY_FINANCIAL_POLICY_SUGGESTIONS[code];
  if (!hit) return null;
  return { countryCode: code, ...hit };
}

export function extractPrimaryTaxRatePercent(
  taxPolicyJson: string | null | undefined
): string {
  const policy = parseBusinessTaxPolicyJson(taxPolicyJson);
  const rate = policy.components[0]?.ratePercent?.trim() ?? "";
  return rate;
}

export function normalizeTaxRateInput(raw: string): string {
  return raw.trim().replace(",", ".");
}

/** Returns null when valid; otherwise an English error code for the UI. */
export function validateTaxRatePercent(raw: string): string | null {
  const value = normalizeTaxRateInput(raw);
  if (value === "") return "required";
  if (!/^\d+(\.\d+)?$/.test(value)) return "invalid";
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return "range";
  return null;
}

export function buildBusinessTaxPolicyDocument(input: {
  taxRatePercent: string;
  componentId?: string;
  componentName?: string;
  existingPolicyJson?: string | null;
}): BusinessTaxPolicyDocument {
  const existing = parseBusinessTaxPolicyJson(input.existingPolicyJson);
  const rate = normalizeTaxRateInput(input.taxRatePercent);
  if (rate === "") {
    return { version: existing.version || 1, components: [] };
  }
  const first = existing.components[0];
  return {
    version: existing.version || 1,
    components: [
      {
        id: input.componentId || first?.id || "vat",
        name: input.componentName || first?.name || "VAT",
        ratePercent: rate,
      },
    ],
  };
}

export function resolveTaxMode(
  value: string | null | undefined
): CheckTaxMode {
  return value === "inclusive" ? "inclusive" : "exclusive";
}
