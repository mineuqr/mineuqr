/**
 * REPORTING-PRODUCT-POLISH-1 + SEMANTIC-SECTION-STATE-PLATFORM-1
 * Restaurant section empty / error — thin facades over Section State Platform.
 */
import {
  SemanticEmptyState,
  SemanticErrorState,
} from "@/design-system/semantic-section-state";
import { Inbox, type LucideIcon } from "lucide-react";

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
    <SemanticEmptyState
      title={title}
      message={message}
      icon={Icon}
      className={className}
      variant="panel"
    />
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
    <SemanticErrorState
      message={message}
      retryLabel={retryLabel}
      onRetry={onRetry}
      isFetching={isFetching}
      className={className}
      variant="section"
    />
  );
}
