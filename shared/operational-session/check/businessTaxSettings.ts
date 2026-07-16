/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — Business Settings taxation policy (config).
 * Owner-configured; no country-specific hard-coding.
 */

import {
  TAX_POLICY_SNAPSHOT_VERSION,
  assertCheckTaxMode,
  type CheckTaxMode,
  type CurrencySnapshot,
  type TaxPolicySnapshot,
  type TaxPolicySnapshotComponent,
} from "./checkContract";

/** Live Business Settings shape (restaurants columns / taxPolicyJson). */
export type BusinessTaxSettings = Readonly<{
  currencyCode: string;
  currencySymbol: string;
  taxEnabled: boolean;
  taxMode: CheckTaxMode;
  /**
   * Versioned live policy document. v1: components[] (often length 0 or 1).
   * Not a Check snapshot until captureTaxPolicySnapshot is called.
   */
  taxPolicy: BusinessTaxPolicyDocument;
}>;

export type BusinessTaxPolicyDocument = Readonly<{
  version: number;
  components: readonly TaxPolicySnapshotComponent[];
}>;

export const DEFAULT_BUSINESS_TAX_POLICY: BusinessTaxPolicyDocument =
  Object.freeze({
    version: TAX_POLICY_SNAPSHOT_VERSION,
    components: Object.freeze([]) as readonly TaxPolicySnapshotComponent[],
  });

export function parseBusinessTaxPolicyJson(
  raw: string | null | undefined
): BusinessTaxPolicyDocument {
  if (raw == null || String(raw).trim() === "") {
    return DEFAULT_BUSINESS_TAX_POLICY;
  }
  try {
    const parsed = JSON.parse(String(raw)) as {
      version?: unknown;
      components?: unknown;
    };
    const version =
      typeof parsed.version === "number" && Number.isFinite(parsed.version)
        ? Math.trunc(parsed.version)
        : TAX_POLICY_SNAPSHOT_VERSION;
    const componentsIn = Array.isArray(parsed.components)
      ? parsed.components
      : [];
    const components: TaxPolicySnapshotComponent[] = [];
    for (const c of componentsIn) {
      if (!c || typeof c !== "object") continue;
      const row = c as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const ratePercent =
        typeof row.ratePercent === "string"
          ? row.ratePercent.trim()
          : typeof row.ratePercent === "number"
            ? String(row.ratePercent)
            : "";
      if (!id || !name || !ratePercent) continue;
      components.push({ id, name, ratePercent });
    }
    return { version, components };
  } catch {
    return DEFAULT_BUSINESS_TAX_POLICY;
  }
}

export function serializeBusinessTaxPolicyJson(
  policy: BusinessTaxPolicyDocument
): string {
  return JSON.stringify({
    version: policy.version,
    components: policy.components.map((c) => ({
      id: c.id,
      name: c.name,
      ratePercent: c.ratePercent,
    })),
  });
}

export function captureCurrencySnapshot(settings: {
  currencyCode: string | null | undefined;
  currencySymbol: string | null | undefined;
}): CurrencySnapshot {
  const currencyCode =
    (settings.currencyCode && String(settings.currencyCode).trim()) || "SAR";
  const currencySymbol =
    (settings.currencySymbol && String(settings.currencySymbol).trim()) ||
    currencyCode;
  return { currencyCode, currencySymbol };
}

/**
 * Freeze live Business Settings into an immutable TaxPolicySnapshot.
 * Changing settings later must never rewrite this document on an existing Check.
 */
export function captureTaxPolicySnapshot(settings: {
  taxEnabled: boolean;
  taxMode: string;
  taxPolicy: BusinessTaxPolicyDocument;
}): TaxPolicySnapshot {
  const mode = assertCheckTaxMode(settings.taxMode);
  return {
    version: TAX_POLICY_SNAPSHOT_VERSION,
    enabled: Boolean(settings.taxEnabled),
    mode,
    components: settings.taxPolicy.components.map((c) => ({
      id: c.id,
      name: c.name,
      ratePercent: c.ratePercent,
    })),
  };
}

export function businessTaxSettingsFromRestaurantRow(row: {
  currencyCode: string | null;
  currencySymbol: string | null;
  taxEnabled?: boolean | null;
  taxMode?: string | null;
  taxPolicyJson?: string | null;
}): BusinessTaxSettings {
  return {
    currencyCode: row.currencyCode ?? "SAR",
    currencySymbol: row.currencySymbol ?? "ر.س",
    taxEnabled: Boolean(row.taxEnabled),
    taxMode: assertCheckTaxMode(row.taxMode ?? "exclusive"),
    taxPolicy: parseBusinessTaxPolicyJson(row.taxPolicyJson),
  };
}
