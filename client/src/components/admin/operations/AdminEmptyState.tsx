import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminDash } from "../layout/adminDashStyles";

type AdminEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** For screen readers — defaults to title */
  ariaLabel?: string;
};

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ariaLabel,
}: AdminEmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={ariaLabel ?? title}
      className={cn("p-6 sm:p-8 text-center", className)}
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-muted/30">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
