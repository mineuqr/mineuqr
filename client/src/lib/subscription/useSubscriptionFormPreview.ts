import { useMemo } from "react";
import {
  formatPlanPriceForCycle,
  formatSubscriptionLabel,
  formatSubscriptionPlanName,
  getBillingCycleLabel,
  getSubscriptionStatusLabel,
} from "./formatters";
import { formatSubscriptionEndDate, suggestSubscriptionEndDateInput } from "./dates";
import { getPlanPrice } from "./pricing";
import type { BillingCycle, SubscriptionPlanLike } from "./types";

export function useSubscriptionFormPreview({
  plans,
  planId,
  billingCycle,
  status,
  endDate,
  locale,
}: {
  plans: SubscriptionPlanLike[] | undefined;
  planId: string;
  billingCycle: BillingCycle;
  status?: string;
  endDate: string;
  locale: "ar" | "en";
}) {
  const selectedPlan = useMemo(
    () => plans?.find((p) => p.id.toString() === planId),
    [plans, planId]
  );

  const price = useMemo(
    () => getPlanPrice(selectedPlan, billingCycle),
    [selectedPlan, billingCycle]
  );

  const suggestedEndDateInput = useMemo(
    () => suggestSubscriptionEndDateInput(billingCycle),
    [billingCycle]
  );

  const planName = useMemo(
    () => formatSubscriptionPlanName(selectedPlan, locale),
    [selectedPlan, locale]
  );

  const planLabel = useMemo(
    () => formatSubscriptionLabel(selectedPlan, billingCycle, locale),
    [selectedPlan, billingCycle, locale]
  );

  const priceDisplay = useMemo(
    () => formatPlanPriceForCycle(selectedPlan, billingCycle, locale),
    [selectedPlan, billingCycle, locale]
  );

  const cycleLabel = useMemo(
    () => getBillingCycleLabel(billingCycle, locale),
    [billingCycle, locale]
  );

  const formattedEndDate = useMemo(
    () => (endDate ? formatSubscriptionEndDate(endDate, locale) : "—"),
    [endDate, locale]
  );

  const formattedSuggestedEnd = useMemo(
    () => formatSubscriptionEndDate(suggestedEndDateInput, locale),
    [suggestedEndDateInput, locale]
  );

  const statusLabel = useMemo(
    () => (status ? getSubscriptionStatusLabel(status, locale) : "—"),
    [status, locale]
  );

  return {
    selectedPlan,
    price,
    suggestedEndDateInput,
    planName,
    planLabel,
    priceDisplay,
    cycleLabel,
    formattedEndDate,
    formattedSuggestedEnd,
    statusLabel,
  };
}
