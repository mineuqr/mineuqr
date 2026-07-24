/**
 * SETTLEMENT-HISTORY-UX-RATIONALIZATION-1 — presentation-only history helpers.
 * No financial logic. Hides internal Settlement Record identifiers.
 */

import { formatRiyadhDate, formatRiyadhTime } from "@/lib/datetime";
import type { SettlementRecordLang } from "./settlementRecordCopy";

export type SettlementQuickRange = "today" | "7d" | "30d" | "90d" | "custom";

function localeOf(language: SettlementRecordLang): string {
  return language === "ar" ? "ar-SA" : "en-US";
}

function padSettlementSequence(value: number): string {
  const n = Math.max(0, Math.trunc(value));
  return String(n).padStart(6, "0");
}

/**
 * Operational Settlement Number: ST-000001
 * Derived from Check identity (+ generation when > 1).
 * Hides sr: / restaurantId / opaque technical ids.
 */
export function formatOperationalSettlementNumber(input: {
  checkId: number;
  settlementRecordId?: string | null;
}): string {
  const checkId = Number(input.checkId);
  if (!Number.isFinite(checkId) || checkId <= 0) {
    return "ST-000000";
  }
  let generation = 1;
  const id = input.settlementRecordId?.trim() ?? "";
  if (id.startsWith("sr:")) {
    const parts = id.split(":");
    const gen = Number.parseInt(parts[4] ?? "1", 10);
    if (Number.isFinite(gen) && gen > 0) generation = gen;
  }
  const base = `ST-${padSettlementSequence(checkId)}`;
  return generation > 1 ? `${base}-${generation}` : base;
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
