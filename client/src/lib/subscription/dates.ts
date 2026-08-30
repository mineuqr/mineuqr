import {
  APP_TIMEZONE,
  addCivilCalendarMonths,
  addCivilCalendarYears,
  formatRiyadhDate,
  todayYmd,
} from "@/lib/datetime";
import type { BillingCycle } from "./types";

/** YYYY-MM-DD for `<input type="date" />` — civil calendar in APP_TIMEZONE. */
export function suggestSubscriptionEndDateInput(
  billingCycle: BillingCycle,
  from: Date = new Date()
): string {
  const start = todayYmd(from, APP_TIMEZONE);
  return billingCycle === "yearly"
    ? addCivilCalendarYears(start, 1)
    : addCivilCalendarMonths(start, 1);
}

/** Display label for period end (date input or ISO string). */
export function formatSubscriptionEndDate(
  value: string | Date | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  if (!value) return "—";
  const iso =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
      ? `${value.trim()}T12:00:00Z`
      : value;
  const formatted = formatRiyadhDate(iso, locale === "ar" ? "ar-SA" : "en-US");
  return formatted || "—";
}
