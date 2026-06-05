/**
 * Admin dashboard currency/formatting policy (PROD-UI-FIX-1).
 * Subscription plan prices and MRR are USD; menu currency is separate per restaurant.
 */
export {
  SUBSCRIPTION_PLAN_CURRENCY,
  formatAdminKpiNumber,
  formatCurrencyUSD as formatAdminRevenueUSD,
  formatPlanPriceForCycle as formatAdminSubscriptionPrice,
  formatSubscriptionPlanName,
} from "@/lib/subscription/formatters";
