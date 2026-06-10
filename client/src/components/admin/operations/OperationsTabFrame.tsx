import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminDash } from "../layout/adminDashStyles";

type OperationsTabFrameProps = {
  toolbar: ReactNode;
  toolbarActions?: ReactNode;
  /** Slim header inside content card (e.g. list count). */
  listLabel?: string;
  children: ReactNode;
  className?: string;
};

/**
 * UX-REFINE-1 — shared Accounts / Tenants / Communications layout rhythm.
 */
export function OperationsTabFrame({
  toolbar,
  toolbarActions,
  listLabel,
  children,
  className,
}: OperationsTabFrameProps) {
  return (
    <div className={cn(adminDash.opsWorkspace, className)}>
      <div className={cn(adminDash.operationsCard, adminDash.opsToolbar)}>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 sm:max-w-xl">{toolbar}</div>
          {toolbarActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">{toolbarActions}</div>
          ) : null}
        </div>
      </div>

      <div className={adminDash.operationsCard}>
        {listLabel ? (
          <div className="border-b border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">{listLabel}</p>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
