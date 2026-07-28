/**
 * Platform empty state — only after confirmed Success with empty data.
 * Must never be used for query failures.
 * SEMANTIC-SECTION-STATE-PLATFORM-1 — facade over SemanticEmptyState (page).
 */
import { Button } from "@/components/ui/button";
import { SemanticEmptyState } from "@/design-system/semantic-section-state";
import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
    <SemanticEmptyState
      variant="page"
      title={title}
      description={description}
      icon={Icon}
      action={action}
      className={className}
    />
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
