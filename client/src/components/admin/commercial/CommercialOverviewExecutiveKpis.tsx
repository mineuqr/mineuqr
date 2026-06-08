import { DollarSign, Store, TrendingUp, Users } from "lucide-react";
import { formatAdminKpiNumber, formatAdminRevenueUSD } from "@/lib/admin/formatAdminCurrency";
import { AdminStatCard } from "@/components/admin/layout/AdminStatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

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

function ExecutiveKpiSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn(adminDash.kpiCard, "space-y-3 p-4")}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

export function CommercialOverviewExecutiveKpis({
  executive,
  loading = false,
  locale,
  labels,
}: CommercialOverviewExecutiveKpisProps) {
  if (loading || !executive) {
    return <ExecutiveKpiSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <AdminStatCard
        title={labels.commercialSubscribers}
        value={formatAdminKpiNumber(executive.commercialSubscribers)}
        icon={Users}
        hint={labels.commercialSubscribersHint}
        valueDir="ltr"
      />
      <AdminStatCard
        title={labels.activeRestaurants}
        value={formatAdminKpiNumber(executive.activeRestaurants)}
        icon={Store}
        hint={labels.activeRestaurantsHint}
        valueDir="ltr"
      />
      <AdminStatCard
        title={labels.mrr}
        value={formatAdminRevenueUSD(executive.mrr, locale)}
        icon={DollarSign}
        hint={labels.mrrHint}
        valueDir="ltr"
      />
      <AdminStatCard
        title={labels.arr}
        value={formatAdminRevenueUSD(executive.arr, locale)}
        icon={TrendingUp}
        hint={labels.arrHint}
        valueDir="ltr"
      />
    </div>
  );
}
