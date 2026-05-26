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
      className={cn(adminDash.operationsCard, "p-8 sm:p-12 text-center", className)}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border/50 bg-muted/30">
        <Icon className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
