import { getPlanPrice } from "./pricing";
import type { BillingCycle, SubscriptionPlanLike, SubscriptionStatus } from "./types";

export function getBillingCycleLabel(
  billingCycle: BillingCycle,
  locale: "ar" | "en" = "ar"
): string {
  if (billingCycle === "yearly") {
    return locale === "ar" ? "سنوي" : "Yearly";
  }
  return locale === "ar" ? "شهري" : "Monthly";
}

/** Formatted amount with SAR suffix (number in LTR-friendly order). */
export function formatCurrencySAR(
  amount: number | string,
  locale: "ar" | "en" = "ar"
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return locale === "ar" ? `${formatted} ر.س` : `SAR ${formatted}`;
}

/** Full price line for a plan + cycle, e.g. "99.00 ر.س / شهر". */
export function formatPlanPriceForCycle(
  plan: SubscriptionPlanLike | null | undefined,
  billingCycle: BillingCycle,
  locale: "ar" | "en" = "ar"
): string {
  const amount = formatCurrencySAR(getPlanPrice(plan, billingCycle), locale);
  const cycle = getBillingCycleLabel(billingCycle, locale);
  return locale === "ar" ? `${amount} / ${cycle}` : `${amount} / ${cycle}`;
}

export function formatSubscriptionPlanName(
  plan: SubscriptionPlanLike | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  if (!plan) return "—";
  return locale === "ar" ? plan.nameAr : plan.nameEn || plan.nameAr;
}

/** Select option / summary label: plan name + live price for cycle. */
export function formatSubscriptionLabel(
  plan: SubscriptionPlanLike | null | undefined,
  billingCycle: BillingCycle,
  locale: "ar" | "en" = "ar"
): string {
  const name = formatSubscriptionPlanName(plan, locale);
  if (!plan) return name;
  const price = formatPlanPriceForCycle(plan, billingCycle, locale);
  return `${name} — ${price}`;
}

export function getSubscriptionStatusLabel(
  status: SubscriptionStatus | string,
  locale: "ar" | "en" = "ar"
): string {
  const mapAr: Record<string, string> = {
    active: "فعال",
    trial: "تجريبي",
    expired: "منتهي",
    canceled: "ملغي",
  };
  const mapEn: Record<string, string> = {
    active: "Active",
    trial: "Trial",
    expired: "Expired",
    canceled: "Canceled",
  };
  const map = locale === "ar" ? mapAr : mapEn;
  return map[status] ?? status;
}
