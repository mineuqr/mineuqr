/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1 — loading / refreshing / skeleton.
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  SEMANTIC_KPI_GRID,
  semanticPanel,
} from "@/design-system/semantic-card/tokens/panel";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { SemanticSkeletonVariant } from "../tokens/state";

export function SemanticLoadingState({
  label,
  className,
  variant = "spinner",
  minHeight,
}: {
  label?: string;
  className?: string;
  variant?: "spinner" | "inline" | "page";
  minHeight?: string;
}) {
  if (variant === "page") {
    return (
      <div
        data-slot="semantic-loading-state"
        data-variant="page"
        data-app-state="loading"
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-24",
          minHeight,
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Spinner className="size-8 text-primary" />
        {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        data-slot="semantic-loading-state"
        data-variant="inline"
        className={cn(
          semanticPanel.base,
          "flex items-center justify-center gap-3 rounded-xl p-8",
          minHeight,
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        {label ? (
          <span className="text-sm text-muted-foreground">{label}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-slot="semantic-loading-state"
      data-variant="spinner"
      className={cn(
        "flex items-center justify-center gap-2 py-14",
        minHeight,
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className="h-7 w-7 animate-spin text-muted-foreground"
        aria-hidden
      />
      {label ? (
        <span className="text-sm text-muted-foreground">{label}</span>
      ) : null}
    </div>
  );
}

export function SemanticRefreshingState({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-refreshing-state"
      className={cn(
        "flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export function SemanticSkeletonState({
  variant = "list",
  count,
  rows,
  className,
  gridClassName,
  label,
}: {
  variant?: SemanticSkeletonVariant;
  count?: number;
  rows?: number;
  className?: string;
  gridClassName?: string;
  label?: string;
}) {
  const n = count ?? rows ?? (variant === "kpi" ? 5 : variant === "executive" ? 6 : 3);

  if (variant === "kpi") {
    return (
      <div
        data-slot="semantic-skeleton-state"
        data-variant="kpi"
        className={cn(gridClassName ?? SEMANTIC_KPI_GRID.dense, className)}
        aria-busy="true"
        aria-label={label ?? "Loading"}
        role="status"
      >
        {Array.from({ length: n }, (_, index) => (
          <Card
            key={index}
            className={cn(semanticPanel.kpi, "animate-pulse")}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-0 space-y-0 px-3 pb-1 pt-3 sm:px-4 sm:pt-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <Skeleton className="h-7 w-14 sm:h-8 sm:w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "executive") {
    return (
      <div
        data-slot="semantic-skeleton-state"
        data-variant="executive"
        className={cn(SEMANTIC_KPI_GRID.executive, className)}
        aria-busy="true"
        aria-label={label ?? "Loading"}
        role="status"
      >
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4",
              i === n - 1 && n >= 6 && "sm:col-span-2 lg:col-span-2"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-full space-y-3">
                <Skeleton className="h-3 w-24 bg-slate-700/60" />
                <Skeleton className="h-8 w-32 bg-slate-700/50" />
                <Skeleton className="h-3 w-40 bg-slate-800/80" />
              </div>
              <Skeleton className="h-6 w-6 shrink-0 rounded-md bg-slate-700/50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "tableRows") {
    return (
      <div
        data-slot="semantic-skeleton-state"
        data-variant="tableRows"
        className={cn("space-y-2 p-4", className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
      >
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cardList") {
    return (
      <div
        data-slot="semantic-skeleton-state"
        data-variant="cardList"
        className={cn("grid gap-4", className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
      >
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            className={cn(
              semanticPanel.base,
              "space-y-3 overflow-hidden rounded-xl p-4 sm:p-6"
            )}
          >
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <SemanticLoadingState
        variant="inline"
        label={label}
        className={className}
      />
    );
  }

  return (
    <div
      data-slot="semantic-skeleton-state"
      data-variant="list"
      className={cn("space-y-2", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label ?? "Loading"}
    >
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** @deprecated Prefer SemanticSkeletonState variant="kpi" — BC for semantic-card. */
export function SemanticKpiSkeleton({
  count = 5,
  className,
  gridClassName = SEMANTIC_KPI_GRID.dense,
}: {
  count?: number;
  className?: string;
  gridClassName?: string;
}) {
  return (
    <SemanticSkeletonState
      variant="kpi"
      count={count}
      className={className}
      gridClassName={gridClassName}
    />
  );
}

/** @deprecated Prefer SemanticSkeletonState variant="executive". */
export function SemanticExecutiveSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <SemanticSkeletonState variant="executive" count={count} className={className} />
  );
}
