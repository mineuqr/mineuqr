/**
 * REPORTING-PRODUCT-POLISH-1 — Shared empty / error states for restaurant dashboards.
 */
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Inbox, Loader2, type LucideIcon } from "lucide-react";
import { restaurantDash, restaurantSemantic } from "./restaurantDashStyles";

export function RestaurantSectionEmpty({
  message,
  title,
  icon: Icon = Inbox,
  className,
}: {
  message: string;
  title?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(restaurantDash.emptyPanel, "rounded-2xl", className)}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-600/40 bg-slate-900/60">
        <Icon
          className={cn("h-6 w-6", restaurantSemantic.iconNeutral)}
          aria-hidden
        />
      </div>
      {title ? (
        <p className="mb-1 text-sm font-semibold text-slate-200">{title}</p>
      ) : null}
      <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
        {message}
      </p>
    </div>
  );
}

export function RestaurantSectionError({
  message,
  retryLabel,
  onRetry,
  isFetching = false,
  className,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  isFetching?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(restaurantDash.errorPanel, "rounded-2xl", className)}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10">
        <AlertTriangle
          className={cn("h-6 w-6", restaurantSemantic.iconWarning)}
          aria-hidden
        />
      </div>
      <p className="max-w-md text-sm leading-relaxed text-slate-300">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(restaurantDash.toolbarBtn, "min-h-10 px-4")}
        disabled={isFetching}
        onClick={onRetry}
      >
        {isFetching ? (
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />
        ) : null}
        {retryLabel}
      </Button>
    </div>
  );
}
