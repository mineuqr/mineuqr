/**
 * TABLE-PLATFORM-ADOPTION-1
 * Shared empty / loading / error / skeleton states for tables.
 */
import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SEMANTIC_TABLE } from "../tokens/tableSurface";

export function SemanticTableEmptyState({
  title,
  message,
  className,
}: {
  title?: string;
  message: string;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-table-empty"
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/40 px-4 py-10 text-center",
        className
      )}
    >
      <Inbox className="h-8 w-8 text-slate-500" aria-hidden />
      {title ? (
        <p className="text-sm font-semibold text-slate-200">{title}</p>
      ) : null}
      <p className="max-w-md text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function SemanticTableLoadingState({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-table-loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/40 py-12 text-sm text-slate-400",
        className
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function SemanticTableErrorState({
  message,
  retryLabel,
  onRetry,
  className,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-table-error"
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-10 text-center",
        className
      )}
    >
      <AlertTriangle className="h-7 w-7 text-orange-400" aria-hidden />
      <p className="max-w-md text-sm text-slate-300">{message}</p>
      {onRetry && retryLabel ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function SemanticTableSkeleton({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-table-skeleton"
      aria-busy="true"
      aria-label="Loading"
      className={cn(SEMANTIC_TABLE.scroll, "p-3", className)}
    >
      <div className="space-y-2">
        <div className="flex gap-2">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-3 flex-1 bg-slate-700/50" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`r-${r}`} className="flex gap-2">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={`c-${r}-${c}`} className="h-8 flex-1 bg-slate-800/60" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SemanticTableStatusCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-table-status-cell"
      className={cn("inline-flex items-center", className)}
    >
      {children}
    </div>
  );
}
