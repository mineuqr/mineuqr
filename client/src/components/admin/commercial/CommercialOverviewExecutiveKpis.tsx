/**
 * SEMANTIC-CARD-PLATFORM-ADOPTION-1
 * Commercial executive KPIs — SemanticKpiCard only.
 */
import { DollarSign, Store, TrendingUp, Users } from "lucide-react";
import { formatAdminKpiNumber, formatAdminRevenueUSD } from "@/lib/admin/formatAdminCurrency";
import {
  SemanticKpiCard,
  SemanticKpiSkeleton,
} from "@/design-system/semantic-card";

type CommercialOverviewExecutiveKpisProps = {
  executive?: {
    commercialSubscribers: number;
    activeRestaurants: number;
    mrr: number;
    arr: number;
  };
  loading?: boolean;
  locale: "ar" | "en";
  labels: {
    commercialSubscribers: string;
    commercialSubscribersHint: string;
    activeRestaurants: string;
    activeRestaurantsHint: string;
    mrr: string;
    mrrHint: string;
    arr: string;
    arrHint: string;
  };
};

export function CommercialOverviewExecutiveKpis({
  executive,
  loading = false,
  locale,
  labels,
}: CommercialOverviewExecutiveKpisProps) {
  if (loading || !executive) {
    return (
      <SemanticKpiSkeleton
        count={4}
        gridClassName="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <SemanticKpiCard
        label={labels.commercialSubscribers}
        value={formatAdminKpiNumber(executive.commercialSubscribers)}
        icon={Users}
        hint={labels.commercialSubscribersHint}
        valueDir="ltr"
        tone="info"
      />
      <SemanticKpiCard
        label={labels.activeRestaurants}
        value={formatAdminKpiNumber(executive.activeRestaurants)}
        icon={Store}
        hint={labels.activeRestaurantsHint}
        valueDir="ltr"
        tone="info"
      />
      <SemanticKpiCard
        label={labels.mrr}
        value={formatAdminRevenueUSD(executive.mrr, locale)}
        icon={DollarSign}
        hint={labels.mrrHint}
        valueDir="ltr"
        tone="success"
        valueVariant="revenue"
      />
      <SemanticKpiCard
        label={labels.arr}
        value={formatAdminRevenueUSD(executive.arr, locale)}
        icon={TrendingUp}
        hint={labels.arrHint}
        valueDir="ltr"
        tone="success"
        valueVariant="revenue"
      />
    </div>
  );
}
