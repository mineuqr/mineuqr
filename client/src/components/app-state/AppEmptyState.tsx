import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Platform empty state — only after confirmed Success with empty data.
 * Must never be used for query failures.
 */
export function AppEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center sm:py-16",
        className
      )}
      role="status"
      data-app-state="empty"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border/50 bg-muted/30">
        <Icon className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function AppEmptyStateActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button type="button" onClick={onClick} className="shadow-sm">
      {children}
    </Button>
  );
}
