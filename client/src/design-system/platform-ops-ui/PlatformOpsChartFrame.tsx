/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Chart chrome — shared spacing / title / legend / empty / loading.
 * Does not invent chart libraries; wraps feature-supplied chart body.
 */

import type { ReactNode } from "react";
import { PlatformOpsEmptyState } from "./PlatformOpsStates";
import { PlatformOpsLoadingState } from "./PlatformOpsStates";
import { PLATFORM_OPS_UI } from "./tokens";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

type PlatformOpsChartFrameProps = {
  title: string;
  description?: string;
  legend?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children?: ReactNode;
  className?: string;
};

export function PlatformOpsChartFrame({
  title,
  description,
  legend,
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  children,
  className,
}: PlatformOpsChartFrameProps) {
  return (
    <div
      data-slot="platform-ops-chart-frame"
      className={cn("space-y-2", className)}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description ? (
            <p className={PLATFORM_OPS_UI.metaText}>{description}</p>
          ) : null}
        </div>
        {legend ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-cyan-300/80">
            {legend}
          </div>
        ) : null}
      </div>
      {loading ? (
        <PlatformOpsLoadingState variant="skeleton" count={2} />
      ) : empty ? (
        <PlatformOpsEmptyState
          icon={BarChart3}
          title={emptyTitle ?? title}
          description={emptyDescription}
        />
      ) : (
        <div className="min-h-[8rem]">{children}</div>
      )}
    </div>
  );
}
