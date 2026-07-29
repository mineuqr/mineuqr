/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Hero summary — primary KPIs + status + alerts + actions.
 */

import type { ReactNode } from "react";
import { PlatformOpsMetricGrid } from "./PlatformOpsMetricCard";
import { PlatformOpsStatusBadge } from "./PlatformOpsStatusBadge";
import { PLATFORM_OPS_UI, type PlatformOpsHeroColumns } from "./tokens";
import type { PlatformOpsHealthStatus } from "./status";
import { cn } from "@/lib/utils";

export type { PlatformOpsHeroColumns };

type PlatformOpsHeroSummaryProps = {
  title?: string;
  description?: string;
  health?: PlatformOpsHealthStatus | string;
  healthLabel?: string;
  lastUpdated?: string;
  lastUpdatedLabel?: string;
  alerts?: ReactNode;
  actions?: ReactNode;
  columns?: PlatformOpsHeroColumns;
  children: ReactNode;
  className?: string;
};

export function PlatformOpsHeroSummary({
  title,
  description,
  health,
  healthLabel,
  lastUpdated,
  lastUpdatedLabel,
  alerts,
  actions,
  columns = 4,
  children,
  className,
}: PlatformOpsHeroSummaryProps) {
  return (
    <section
      data-slot="platform-ops-hero-summary"
      className={cn("space-y-3", className)}
      aria-label={title}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {title ? (
            <h2 className="text-sm font-semibold text-white sm:text-base">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="text-xs text-cyan-300/80">{description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {health ? (
              <PlatformOpsStatusBadge status={health} label={healthLabel} />
            ) : null}
            {lastUpdated ? (
              <span className={PLATFORM_OPS_UI.lastUpdated}>
                {lastUpdatedLabel ? `${lastUpdatedLabel}: ` : null}
                {lastUpdated}
              </span>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {alerts ? <div className="space-y-2">{alerts}</div> : null}
      <PlatformOpsMetricGrid columns={columns}>{children}</PlatformOpsMetricGrid>
    </section>
  );
}
