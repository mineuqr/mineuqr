/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1 — header / footer / states.
 */
import type { ReactNode } from "react";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Inbox, Loader2, AlertTriangle, type LucideIcon } from "lucide-react";

export function SemanticDetailHeader({
  title,
  subtitle,
  icon,
  status,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  status?: ReactNode;
  className?: string;
}) {
  return (
    <SheetHeader
      data-slot="semantic-detail-header"
      className={cn(
        "shrink-0 space-y-0 border-b border-border/40 p-0 pb-3 text-start",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-foreground">{title}</SheetTitle>
            {status}
          </div>
          {subtitle ? (
            <SheetDescription className="text-muted-foreground">
              {subtitle}
            </SheetDescription>
          ) : null}
        </div>
      </div>
    </SheetHeader>
  );
}

export function SemanticDetailFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer
      data-slot="semantic-detail-footer"
      className={cn(
        "mt-auto shrink-0 space-y-2 border-t border-border/40 pt-3",
        className
      )}
    >
      {children}
    </footer>
  );
}

export function SemanticDetailLoading({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-detail-loading"
      className={cn(
        "flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground",
        className
      )}
      role="status"
      aria-busy="true"
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export function SemanticDetailEmpty({
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
      data-slot="semantic-detail-empty"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center",
        className
      )}
      role="status"
    >
      <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden />
      {title ? (
        <p className="text-sm font-medium text-foreground">{title}</p>
      ) : null}
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function SemanticDetailError({
  message,
  retryLabel,
  onRetry,
  isFetching = false,
  className,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  isFetching?: boolean;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-detail-error"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 py-10 text-center",
        className
      )}
      role="alert"
    >
      <AlertTriangle className="h-8 w-8 text-destructive/80" aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && retryLabel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={onRetry}
        >
          {isFetching ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
