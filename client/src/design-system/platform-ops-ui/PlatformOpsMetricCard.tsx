/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * + REACT-130-REALTIME-FORENSICS-1
 * Metric card / grid — SemanticKpiCard SSOT.
 *
 * SemanticKpiCard requires `icon` and renders `<Icon />`. Omitting it yields
 * React #130 (element type undefined). Platform Ops call sites often omit
 * icons; the facade supplies a neutral default so presentation stays valid.
 */

import type { ComponentProps, ComponentType, ReactNode } from "react";
import { Activity } from "lucide-react";
import {
  SemanticKpiCard,
  SEMANTIC_KPI_GRID,
} from "@/design-system/semantic-card";
import { PLATFORM_OPS_UI, type PlatformOpsHeroColumns } from "./tokens";
import { cn } from "@/lib/utils";

type SemanticKpiProps = ComponentProps<typeof SemanticKpiCard>;

export type PlatformOpsMetricCardProps = Omit<SemanticKpiProps, "icon"> & {
  icon?: ComponentType<{ className?: string }>;
};

const DEFAULT_METRIC_ICON = Activity;

export function PlatformOpsMetricCard({
  icon = DEFAULT_METRIC_ICON,
  ...props
}: PlatformOpsMetricCardProps) {
  return <SemanticKpiCard {...props} icon={icon} />;
}

type PlatformOpsMetricGridProps = {
  columns?: PlatformOpsHeroColumns;
  children: ReactNode;
  className?: string;
};

export function PlatformOpsMetricGrid({
  columns = 4,
  children,
  className,
}: PlatformOpsMetricGridProps) {
  return (
    <div
      data-slot="platform-ops-metric-grid"
      data-columns={columns}
      className={cn(PLATFORM_OPS_UI.heroGrid[columns] ?? SEMANTIC_KPI_GRID.quad, className)}
    >
      {children}
    </div>
  );
}
