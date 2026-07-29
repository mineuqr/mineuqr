/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Metric card / grid — SemanticKpiCard SSOT.
 */

import type { ComponentProps, ReactNode } from "react";
import {
  SemanticKpiCard,
  SEMANTIC_KPI_GRID,
} from "@/design-system/semantic-card";
import { PLATFORM_OPS_UI, type PlatformOpsHeroColumns } from "./tokens";
import { cn } from "@/lib/utils";

export type PlatformOpsMetricCardProps = ComponentProps<typeof SemanticKpiCard>;

export function PlatformOpsMetricCard(props: PlatformOpsMetricCardProps) {
  return <SemanticKpiCard {...props} />;
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
