/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1
 * High-level state switcher — features choose which state; platform renders it.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { SemanticSectionStateKind } from "../tokens/state";
import { SemanticEmptyState, type SemanticEmptyVariant } from "./SemanticEmptyState";
import { SemanticErrorState, type SemanticErrorVariant } from "./SemanticErrorState";
import {
  SemanticLoadingState,
  SemanticRefreshingState,
  SemanticSkeletonState,
} from "./SemanticLoadingState";
import { SemanticOfflineState, SemanticSuccessState } from "./SemanticEmptyState";
import type { SemanticSkeletonVariant } from "../tokens/state";

export type SemanticSectionStateProps = {
  status: SemanticSectionStateKind;
  title?: string;
  description?: string;
  message?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  isFetching?: boolean;
  emptyVariant?: SemanticEmptyVariant;
  errorVariant?: SemanticErrorVariant;
  skeletonVariant?: SemanticSkeletonVariant;
  skeletonCount?: number;
  loadingLabel?: string;
  className?: string;
  children?: ReactNode;
};

export function SemanticSectionState({
  status,
  title,
  description,
  message,
  icon,
  action,
  retryLabel,
  onRetry,
  isFetching,
  emptyVariant = "panel",
  errorVariant = "section",
  skeletonVariant = "list",
  skeletonCount,
  loadingLabel,
  className,
  children,
}: SemanticSectionStateProps) {
  switch (status) {
    case "loading":
      return (
        <SemanticLoadingState
          label={loadingLabel ?? description}
          className={className}
        />
      );
    case "skeleton":
      return (
        <SemanticSkeletonState
          variant={skeletonVariant}
          count={skeletonCount}
          className={className}
          label={loadingLabel}
        />
      );
    case "refreshing":
      return (
        <SemanticRefreshingState
          label={loadingLabel ?? description}
          className={className}
        />
      );
    case "empty":
      return (
        <SemanticEmptyState
          title={title}
          message={message ?? description}
          icon={icon}
          action={action}
          variant={emptyVariant}
          className={className}
        />
      );
    case "error":
      return (
        <SemanticErrorState
          title={title}
          message={message ?? description}
          retryLabel={retryLabel}
          onRetry={onRetry}
          isFetching={isFetching}
          variant={errorVariant}
          className={className}
        />
      );
    case "success":
      return (
        <SemanticSuccessState
          title={title ?? ""}
          description={description ?? message}
          action={action}
          icon={icon}
          className={className}
        />
      );
    case "offline":
      return (
        <SemanticOfflineState
          title={title ?? ""}
          description={description ?? message}
          action={action}
          icon={icon}
          className={className}
        />
      );
    default:
      return children ?? null;
  }
}
