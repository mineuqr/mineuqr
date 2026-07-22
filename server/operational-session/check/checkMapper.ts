/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — persistence ↔ OperationalCheck mapping.
 */

import type { SelectOperationalCheck } from "../../../drizzle/schema";
import {
  assertCheckOutcome,
  assertCheckTaxMode,
  TAX_POLICY_SNAPSHOT_VERSION,
  type CurrencySnapshot,
  type OperationalCheck,
  type ServiceChargeSnapshot,
  type TaxBreakdown,
  type TaxPolicySnapshot,
} from "@shared/operational-session";

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function parseCurrencySnapshot(raw: unknown): CurrencySnapshot {
  const row = asRecord(raw);
  return {
    currencyCode:
      typeof row.currencyCode === "string" && row.currencyCode.trim()
        ? row.currencyCode.trim()
        : "SAR",
    currencySymbol:
      typeof row.currencySymbol === "string" && row.currencySymbol.trim()
        ? row.currencySymbol.trim()
        : "ر.س",
  };
}

export function parseTaxPolicySnapshot(raw: unknown): TaxPolicySnapshot {
  const row = asRecord(raw);
  const componentsIn = Array.isArray(row.components) ? row.components : [];
  const components = componentsIn
    .map((c) => {
      const item = asRecord(c);
      const id = typeof item.id === "string" ? item.id : "";
      const name = typeof item.name === "string" ? item.name : "";
      const ratePercent =
        typeof item.ratePercent === "string"
          ? item.ratePercent
          : typeof item.ratePercent === "number"
            ? String(item.ratePercent)
            : "";
      if (!id || !name || !ratePercent) return null;
      return { id, name, ratePercent };
    })
    .filter((c): c is NonNullable<typeof c> => c != null);

  return {
    version:
      typeof row.version === "number" && Number.isFinite(row.version)
        ? Math.trunc(row.version)
        : TAX_POLICY_SNAPSHOT_VERSION,
    enabled: Boolean(row.enabled),
    mode: assertCheckTaxMode(
      typeof row.mode === "string" ? row.mode : "exclusive"
    ),
    components,
  };
}

export function parseTaxBreakdown(raw: unknown): TaxBreakdown {
  const row = asRecord(raw);
  const linesIn = Array.isArray(row.lines) ? row.lines : [];
  const lines = linesIn
    .map((l) => {
      const item = asRecord(l);
      const componentId =
        typeof item.componentId === "string" ? item.componentId : "";
      const name = typeof item.name === "string" ? item.name : "";
      const ratePercent =
        typeof item.ratePercent === "string" ? item.ratePercent : "0";
      const amount = typeof item.amount === "string" ? item.amount : "0.00";
      if (!componentId) return null;
      return { componentId, name, ratePercent, amount };
    })
    .filter((l): l is NonNullable<typeof l> => l != null);

  return {
    lines,
    totalTaxAmount:
      typeof row.totalTaxAmount === "string" ? row.totalTaxAmount : "0.00",
  };
}

export function parseServiceChargeSnapshot(
  raw: unknown
): ServiceChargeSnapshot | null {
  if (raw == null) return null;
  const row = asRecord(raw);
  return {
    version:
      typeof row.version === "number" && Number.isFinite(row.version)
        ? Math.trunc(row.version)
        : 1,
    enabled: Boolean(row.enabled),
    ratePercent:
      typeof row.ratePercent === "string"
        ? row.ratePercent
        : row.ratePercent == null
          ? null
          : String(row.ratePercent),
    label: typeof row.label === "string" ? row.label : null,
  };
}

export function mapRowToOperationalCheck(
  row: SelectOperationalCheck
): OperationalCheck {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    sessionId: row.sessionId ?? null,
    outcome: assertCheckOutcome(row.outcome),
    currencySnapshot: parseCurrencySnapshot(row.currencySnapshotJson),
    taxPolicySnapshot: parseTaxPolicySnapshot(row.taxPolicySnapshotJson),
    serviceChargeSnapshot: parseServiceChargeSnapshot(
      row.serviceChargeSnapshotJson
    ),
    billDiscountAmount: String(row.billDiscountAmount ?? "0.00"),
    subtotal: String(row.subtotal ?? "0.00"),
    taxAmount: String(row.taxAmount ?? "0.00"),
    taxBreakdown: parseTaxBreakdown(row.taxBreakdownJson),
    grandTotal: String(row.grandTotal ?? "0.00"),
    snapshotsFrozenAt: row.snapshotsFrozenAt,
    totalsFrozenAt: row.totalsFrozenAt ?? null,
    settledAt: row.settledAt ?? null,
    voidedAt: row.voidedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
