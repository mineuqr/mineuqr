/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Shared skeleton / loading states for semantic cards.
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { semanticPanel } from "../tokens/panel";

export function SemanticKpiSkeleton({
  count = 5,
  className,
  gridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:gap-3",
}: {
  count?: number;
  className?: string;
  gridClassName?: string;
}) {
  return (
    <div className={cn(gridClassName, className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Card
          key={index}
          className={cn(semanticPanel.kpi, "animate-pulse")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-1 pt-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <Skeleton className="h-7 w-14" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SemanticExecutiveSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4",
        className
      )}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4",
            i === count - 1 && count >= 6 && "sm:col-span-2 lg:col-span-2"
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
