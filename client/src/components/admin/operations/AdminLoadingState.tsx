import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { adminDash } from "../layout/adminDashStyles";

type AdminLoadingStateProps = {
  variant?: "inline" | "cardList" | "tableRows" | "kpiStrip";
  rows?: number;
  label?: string;
  className?: string;
};

export function AdminLoadingState({
  variant = "inline",
  rows = 3,
  label,
  className,
}: AdminLoadingStateProps) {
  if (variant === "inline") {
    return (
      <div
        className={cn(adminDash.card, "flex items-center justify-center gap-3 p-8", className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      </div>
    );
  }

  if (variant === "kpiStrip") {
    return (
      <div
        className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5", className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn(adminDash.kpiCard, "p-4 space-y-3")}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "tableRows") {
    return (
      <div className={cn("space-y-2 p-4", className)} role="status" aria-live="polite" aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", className)} role="status" aria-live="polite" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn(adminDash.operationsCard, "space-y-3 p-4 sm:p-6")}>
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
