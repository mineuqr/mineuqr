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

/** Canonical currency for subscription plan list prices (USD per product terms). */
export const SUBSCRIPTION_PLAN_CURRENCY = "USD" as const;

/** Western digits for admin KPI count cards (consistent across locale). */
export function formatAdminKpiNumber(value: number): string {
  if (Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

/** Subscription plan / MRR amounts in USD with Western digits. */
export function formatCurrencyUSD(
  amount: number | string,
  _locale: "ar" | "en" = "ar"
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `$${formatted}`;
}

/** Formatted amount with SAR suffix (restaurant menu display — not subscription plans). */
export function formatCurrencySAR(
  amount: number | string,
  locale: "ar" | "en" = "ar"
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return locale === "ar" ? `${formatted} ر.س` : `SAR ${formatted}`;
}

/** Full price line for a plan + cycle, e.g. "$35.00 / month". */
export function formatPlanPriceForCycle(
  plan: SubscriptionPlanLike | null | undefined,
  billingCycle: BillingCycle,
  locale: "ar" | "en" = "ar"
): string {
  const amount = formatCurrencyUSD(getPlanPrice(plan, billingCycle), locale);
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
