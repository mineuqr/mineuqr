/**
 * SEMANTIC-CARD-VISUAL-CONSISTENCY-1
 * Commercial subscription health KPIs — SemanticKpiCard + Reporting golden grid.
 */
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";
import { formatAdminKpiNumber } from "@/lib/admin/formatAdminCurrency";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SEMANTIC_KPI_GRID,
  SemanticKpiCard,
  semanticPanel,
  type SemanticDomain,
  type SemanticTone,
} from "@/design-system/semantic-card";
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
  tone: SemanticTone;
  domain: SemanticDomain;
};

/** Status → SemanticTone — meanings owned by commercial; chrome by design-system. */
const HEALTH_STATUS_CONFIG: HealthStatusConfig[] = [
  { key: "active", icon: CheckCircle2, tone: "success", domain: "success" },
  { key: "trial", icon: Clock, tone: "info", domain: "information" },
  { key: "canceled", icon: Ban, tone: "warning", domain: "warning" },
  { key: "expired", icon: AlertTriangle, tone: "danger", domain: "danger" },
  { key: "inactive", icon: MinusCircle, tone: "neutral", domain: "analytics" },
];

type CommercialOverviewSubscriptionHealthProps = {
  subscriptionHealth?: SubscriptionHealthCounts;
  loading?: boolean;
  labels: Record<HealthStatusKey, string>;
};

function SubscriptionHealthSkeleton() {
  return (
    <div
      className={SEMANTIC_KPI_GRID.dense}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn(semanticPanel.kpi, "space-y-3 p-4")}>
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
    <div className={SEMANTIC_KPI_GRID.dense}>
      {HEALTH_STATUS_CONFIG.map(({ key, icon, tone, domain }) => (
        <SemanticKpiCard
          key={key}
          label={labels[key]}
          value={formatAdminKpiNumber(subscriptionHealth[key])}
          icon={icon}
          tone={tone}
          domain={domain}
          valueDir="ltr"
        />
      ))}
    </div>
  );
}
