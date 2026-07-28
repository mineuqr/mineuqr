/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1
 * Admin empty — facade over SemanticEmptyState (admin density).
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SemanticEmptyState } from "@/design-system/semantic-section-state";

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
  icon,
  title,
  description,
  action,
  className,
  ariaLabel,
}: AdminEmptyStateProps) {
  return (
    <SemanticEmptyState
      variant="admin"
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}
