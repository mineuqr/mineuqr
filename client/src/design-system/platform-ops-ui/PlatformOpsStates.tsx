/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Empty / loading / error — Semantic Section State facades (admin density).
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  SemanticEmptyState,
  SemanticErrorState,
  SemanticLoadingState,
  SemanticRefreshingState,
  SemanticSkeletonState,
} from "@/design-system/semantic-section-state";
import { PLATFORM_OPS_UI } from "./tokens";
import { cn } from "@/lib/utils";

type PlatformOpsEmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PlatformOpsEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: PlatformOpsEmptyStateProps) {
  return (
    <SemanticEmptyState
      variant="admin"
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

type PlatformOpsLoadingStateProps = {
  label?: string;
  variant?: "inline" | "skeleton" | "kpi" | "table";
  count?: number;
  className?: string;
};

export function PlatformOpsLoadingState({
  label,
  variant = "inline",
  count = 4,
  className,
}: PlatformOpsLoadingStateProps) {
  if (variant === "kpi") {
    return (
      <SemanticSkeletonState
        variant="kpi"
        count={count}
        label={label}
        className={className}
      />
    );
  }
  if (variant === "table") {
    return (
      <SemanticSkeletonState
        variant="tableRows"
        rows={count}
        label={label}
        className={className}
      />
    );
  }
  if (variant === "skeleton") {
    return (
      <SemanticSkeletonState
        variant="cardList"
        rows={count}
        label={label}
        className={className}
      />
    );
  }
  return (
    <SemanticLoadingState
      variant="inline"
      label={label}
      className={className}
    />
  );
}

export function PlatformOpsRefreshingState({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return <SemanticRefreshingState label={label} className={className} />;
}

type PlatformOpsErrorStateProps = {
  title: string;
  message?: string;
  errorId?: string;
  diagnosticHref?: string;
  diagnosticLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
  isFetching?: boolean;
  className?: string;
};

export function PlatformOpsErrorState({
  title,
  message,
  errorId,
  diagnosticHref,
  diagnosticLabel,
  retryLabel,
  onRetry,
  isFetching,
  className,
}: PlatformOpsErrorStateProps) {
  return (
    <div data-slot="platform-ops-error" className={cn("space-y-2", className)}>
      <SemanticErrorState
        variant="section"
        title={title}
        message={message}
        retryLabel={retryLabel}
        onRetry={onRetry}
        isFetching={isFetching}
      />
      <div className="flex flex-wrap items-center gap-3 px-1">
        {errorId ? (
          <span className={PLATFORM_OPS_UI.metaText}>ID: {errorId}</span>
        ) : null}
        {diagnosticHref && diagnosticLabel ? (
          <a
            href={diagnosticHref}
            className="text-[11px] text-cyan-300 underline-offset-2 hover:underline"
          >
            {diagnosticLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
