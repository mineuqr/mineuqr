/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Admin KPI card — compatibility wrapper over SemanticKpiCard.
 */
import type { LucideIcon } from "lucide-react";
import { SemanticKpiCard } from "@/design-system/semantic-card";

type AdminStatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  valueClassName?: string;
  /** Isolate numbers/dates in LTR for RTL layouts. */
  valueDir?: "ltr" | "rtl" | "auto";
  /** UX-REFINE-1C — denser KPI strip for overview console */
  compact?: boolean;
};

export function AdminStatCard({
  title,
  value,
  icon,
  hint,
  loading = false,
  valueClassName,
  valueDir = "auto",
  compact = false,
}: AdminStatCardProps) {
  return (
    <SemanticKpiCard
      label={title}
      value={value}
      icon={icon}
      hint={hint}
      loading={loading}
      valueClassName={valueClassName}
      valueDir={valueDir}
      tone="info"
      emphasis={compact ? "compact" : "secondary"}
    />
  );
}
