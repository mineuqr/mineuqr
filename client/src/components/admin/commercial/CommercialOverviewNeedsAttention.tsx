/**
 * SEMANTIC-CARD-PLATFORM-ADOPTION-1
 * Commercial needs-attention KPIs — SemanticKpiCard only (no local color maps).
 */
import { AlertTriangle, Ban, Clock, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { formatAdminKpiNumber } from "@/lib/admin/formatAdminCurrency";
import {
  SemanticKpiCard,
  SemanticKpiSkeleton,
  type SemanticDomain,
  type SemanticTone,
} from "@/design-system/semantic-card";

type NeedsAttentionCounts = {
  expiringWithin30Days: number;
  canceledAccounts: number;
  expiredAccounts: number;
};

type AttentionKey = keyof NeedsAttentionCounts;

type AttentionConfig = {
  key: AttentionKey;
  icon: LucideIcon;
  tone: SemanticTone;
  domain: SemanticDomain;
};

const ATTENTION_CONFIG: AttentionConfig[] = [
  { key: "expiringWithin30Days", icon: Clock, tone: "warning", domain: "warning" },
  { key: "expiredAccounts", icon: AlertTriangle, tone: "danger", domain: "danger" },
  { key: "canceledAccounts", icon: Ban, tone: "warning", domain: "warning" },
];

type CommercialOverviewNeedsAttentionProps = {
  needsAttention?: NeedsAttentionCounts;
  loading?: boolean;
  labels: Record<AttentionKey, string>;
  hints?: Partial<Record<AttentionKey, string>>;
  drillHref?: Partial<Record<AttentionKey, string>>;
};

export function CommercialOverviewNeedsAttention({
  needsAttention,
  loading = false,
  labels,
  hints = {},
  drillHref = {},
}: CommercialOverviewNeedsAttentionProps) {
  if (loading || !needsAttention) {
    return (
      <SemanticKpiSkeleton
        count={3}
        gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {ATTENTION_CONFIG.map(({ key, icon, tone, domain }) => {
        const hint = hints[key];
        const href = drillHref[key];
        const card = (
          <SemanticKpiCard
            label={labels[key]}
            value={formatAdminKpiNumber(needsAttention[key])}
            icon={icon}
            hint={hint}
            tone={tone}
            domain={domain}
            valueDir="ltr"
          />
        );

        if (!href) return <div key={key}>{card}</div>;

        return (
          <Link
            key={key}
            href={href}
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {card}
          </Link>
        );
      })}
    </div>
  );
}
