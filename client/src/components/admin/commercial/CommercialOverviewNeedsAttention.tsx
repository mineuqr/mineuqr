import { AlertTriangle, Ban, Clock, type LucideIcon } from "lucide-react";
import { formatAdminKpiNumber } from "@/lib/admin/formatAdminCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

type NeedsAttentionCounts = {
  expiringWithin30Days: number;
  canceledAccounts: number;
  expiredAccounts: number;
};

type AttentionKey = keyof NeedsAttentionCounts;

type AttentionConfig = {
  key: AttentionKey;
  icon: LucideIcon;
  cardClassName: string;
  iconClassName: string;
  hint?: string;
};

const ATTENTION_CONFIG: AttentionConfig[] = [
  {
    key: "expiringWithin30Days",
    icon: Clock,
    cardClassName: "border-amber-500/30 bg-amber-500/5",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "canceledAccounts",
    icon: Ban,
    cardClassName: "border-amber-500/30 bg-amber-500/5",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "expiredAccounts",
    icon: AlertTriangle,
    cardClassName: "border-red-500/30 bg-red-500/5",
    iconClassName: "text-red-600 dark:text-red-400",
  },
];

type CommercialOverviewNeedsAttentionProps = {
  needsAttention?: NeedsAttentionCounts;
  loading?: boolean;
  labels: Record<AttentionKey, string>;
  hints?: Partial<Record<AttentionKey, string>>;
};

function NeedsAttentionSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={cn(adminDash.kpiCard, "space-y-3 p-4")}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function CommercialOverviewNeedsAttention({
  needsAttention,
  loading = false,
  labels,
  hints = {},
}: CommercialOverviewNeedsAttentionProps) {
  if (loading || !needsAttention) {
    return <NeedsAttentionSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {ATTENTION_CONFIG.map(({ key, icon: Icon, cardClassName, iconClassName }) => {
        const hint = hints[key];
        return (
          <Card key={key} className={cn(adminDash.kpiCard, cardClassName)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                {labels[key]}
              </CardTitle>
              <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} aria-hidden />
            </CardHeader>
            <CardContent>
              <div dir="ltr" className="text-xl font-bold tabular-nums sm:text-2xl">
                {formatAdminKpiNumber(needsAttention[key])}
              </div>
              {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
