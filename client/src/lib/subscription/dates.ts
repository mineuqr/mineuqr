import { formatRiyadhDate } from "@/lib/datetime";
import type { BillingCycle } from "./types";

/** YYYY-MM-DD for `<input type="date" />` — mirrors server create-subscription period logic. */
export function suggestSubscriptionEndDateInput(
  billingCycle: BillingCycle,
  from: Date = new Date()
): string {
  const end = new Date(from);
  if (billingCycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
