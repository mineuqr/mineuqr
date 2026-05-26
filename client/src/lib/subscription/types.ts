export type BillingCycle = "monthly" | "yearly";

export type SubscriptionPlanLike = {
  id: number;
  nameAr: string;
  nameEn?: string | null;
  priceMonthly?: string | number | null;
  priceYearly?: string | number | null;
};

export type SubscriptionStatus = "active" | "trial" | "expired" | "canceled";
