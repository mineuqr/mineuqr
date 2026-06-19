import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Inbox, Loader2, type LucideIcon } from "lucide-react";
import { restaurantDash, restaurantSemantic } from "./restaurantDashStyles";

export function RestaurantSectionEmpty({
  message,
  icon: Icon = Inbox,
  className,
}: {
  message: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn(restaurantDash.emptyPanel, className)} role="status">
      <Icon className={cn("mx-auto mb-2 h-6 w-6", restaurantSemantic.iconNeutral)} aria-hidden />
      <p className="text-sm text-slate-400">{message}</p>
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
    <div className={cn(restaurantDash.errorPanel, className)} role="alert">
      <AlertTriangle className={cn("h-7 w-7", restaurantSemantic.iconWarning)} aria-hidden />
      <p className="max-w-md text-sm text-slate-400">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={restaurantDash.toolbarBtn}
        disabled={isFetching}
        onClick={onRetry}
      >
        {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {retryLabel}
      </Button>
    </div>
  );
}
