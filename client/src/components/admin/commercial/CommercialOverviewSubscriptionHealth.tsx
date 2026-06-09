import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";
import { formatAdminKpiNumber } from "@/lib/admin/formatAdminCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

type SubscriptionHealthCounts = {
  active: number;
  trial: number;
  canceled: number;
  expired: number;
  inactive: number;
};

type HealthStatusKey = keyof SubscriptionHealthCounts;

type HealthStatusConfig = {
  key: HealthStatusKey;
  icon: LucideIcon;
  cardClassName: string;
  iconClassName: string;
};

/** Visual tones aligned with CommercialStatusBadge — authority statuses only. */
const HEALTH_STATUS_CONFIG: HealthStatusConfig[] = [
  {
    key: "active",
    icon: CheckCircle2,
    cardClassName: "border-green-500/30 bg-green-500/5",
    iconClassName: "text-green-600 dark:text-green-400",
  },
  {
    key: "trial",
    icon: Clock,
    cardClassName: "border-blue-500/30 bg-blue-500/5",
    iconClassName: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "canceled",
    icon: Ban,
    cardClassName: "border-amber-500/30 bg-amber-500/5",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "expired",
    icon: AlertTriangle,
    cardClassName: "border-red-500/30 bg-red-500/5",
    iconClassName: "text-red-600 dark:text-red-400",
  },
  {
    key: "inactive",
    icon: MinusCircle,
    cardClassName: "border-border/50 bg-muted/20",
    iconClassName: "text-muted-foreground",
  },
];

type CommercialOverviewSubscriptionHealthProps = {
  subscriptionHealth?: SubscriptionHealthCounts;
  loading?: boolean;
  labels: Record<HealthStatusKey, string>;
};

function SubscriptionHealthSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn(adminDash.kpiCard, "space-y-3 p-4")}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function CommercialOverviewSubscriptionHealth({
  subscriptionHealth,
  loading = false,
  labels,
}: CommercialOverviewSubscriptionHealthProps) {
  if (loading || !subscriptionHealth) {
    return <SubscriptionHealthSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {HEALTH_STATUS_CONFIG.map(({ key, icon: Icon, cardClassName, iconClassName }) => (
        <Card key={key} className={cn(adminDash.kpiCard, cardClassName)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {labels[key]}
            </CardTitle>
            <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} aria-hidden />
          </CardHeader>
          <CardContent>
            <div dir="ltr" className="text-xl font-bold tabular-nums sm:text-2xl">
              {formatAdminKpiNumber(subscriptionHealth[key])}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
