/**
 * SETTLEMENT-HISTORY-UX-RATIONALIZATION-1 / OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1
 * Presentation helpers for Settlement History (ranges / time).
 * Settlement Operational Identity is owned by the shared Operational Identity Provider.
 */

import { formatRiyadhDate, formatRiyadhTime } from "@/lib/datetime";
import {
  resolveSettlementOperationalIdentity,
  type ResolveSettlementOperationalIdentityInput,
} from "@shared/operational-document-identity";
import type { SettlementRecordLang } from "./settlementRecordCopy";

export type SettlementQuickRange = "today" | "7d" | "30d" | "90d" | "custom";

/**
 * @deprecated Use `resolveSettlementOperationalIdentity` from
 * `@shared/operational-document-identity` (OI-08). Kept as a thin alias
 * so Settlement History UX call sites resolve through the platform provider.
 */
export function formatOperationalSettlementNumber(
  input: ResolveSettlementOperationalIdentityInput
): string {
  return resolveSettlementOperationalIdentity(input);
}

function localeOf(language: SettlementRecordLang): string {
  return language === "ar" ? "ar-SA" : "en-US";
}

/** Two-line time: "24 Jul 2026" / "01:22 PM" — no seconds. */
export function formatSettlementHistoryTimeParts(
  value: string,
  language: SettlementRecordLang
): Readonly<{ dateLabel: string; timeLabel: string }> {
  const locale = localeOf(language);
  return {
    dateLabel: formatRiyadhDate(value, locale),
    timeLabel: formatRiyadhTime(value, locale),
  };
}

export function formatSettlementHistoryTimeLabel(
  value: string,
  language: SettlementRecordLang
): string {
  const { dateLabel, timeLabel } = formatSettlementHistoryTimeParts(
    value,
    language
  );
  return `${dateLabel}\n${timeLabel}`;
}

function ymdInLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calendar date range for quick retention filters (presentation only). */
export function settlementQuickRangeBounds(
  range: Exclude<SettlementQuickRange, "custom">,
  now: Date = new Date()
): Readonly<{ dateFrom: string; dateTo: string }> {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  if (range === "today") {
    // start = end
  } else if (range === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (range === "30d") {
    start.setDate(start.getDate() - 29);
  } else if (range === "90d") {
    start.setDate(start.getDate() - 89);
  }
  return {
    dateFrom: ymdInLocal(start),
    dateTo: ymdInLocal(end),
  };
}

export function defaultSettlementHistoryRange(
  now: Date = new Date()
): Readonly<{ dateFrom: string; dateTo: string }> {
  return settlementQuickRangeBounds("30d", now);
}
