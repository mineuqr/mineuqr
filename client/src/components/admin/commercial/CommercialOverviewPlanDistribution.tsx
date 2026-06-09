import { Layers } from "lucide-react";
import { formatAdminKpiNumber } from "@/lib/admin/formatAdminCurrency";
import { commercialOverviewPlanRows } from "@/lib/admin/commercialOverviewPlanDistribution";
import type { CommercialPlan } from "@commercial/planTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

type PlanDistributionEntry = {
  planCode: CommercialPlan;
  ownerCount: number;
};

type CommercialOverviewPlanDistributionProps = {
  entries?: PlanDistributionEntry[];
  loading?: boolean;
  planLabels: Record<CommercialPlan, string>;
};

function PlanDistributionSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn(adminDash.kpiCard, "space-y-3 p-4")}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function CommercialOverviewPlanDistribution({
  entries,
  loading = false,
  planLabels,
}: CommercialOverviewPlanDistributionProps) {
  if (loading || !entries) {
    return <PlanDistributionSkeleton />;
  }

  const rows = commercialOverviewPlanRows(entries);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
      {rows.map(({ planCode, ownerCount }) => (
        <Card key={planCode} className={adminDash.kpiCard}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {planLabels[planCode]}
            </CardTitle>
            <Layers className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <div dir="ltr" className="text-xl font-bold tabular-nums sm:text-2xl">
              {formatAdminKpiNumber(ownerCount)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
