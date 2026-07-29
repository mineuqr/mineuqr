/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * + PLATFORM-OPERATIONS-UI-ADOPTION-1
 * Platform Operations page header — AdminOperationsShell facade.
 * Presentation only; does not own routing or permissions.
 */

import type { ReactNode } from "react";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import type { AdminBreadcrumbItem } from "@/components/admin/layout/AdminShellBreadcrumbs";
import { PlatformOpsHeaderMeta } from "./PlatformOpsHeaderMeta";
import type { PlatformOpsHealthStatus } from "./status";

export type PlatformOpsHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  health?: PlatformOpsHealthStatus | string;
  healthLabel?: string;
  lastUpdated?: string;
  lastUpdatedLabel?: string;
  /** Primary action cluster (right of title). */
  primaryActions?: ReactNode;
  /** Alias for primaryActions — AdminOperationsShell headerActions. */
  headerActions?: ReactNode;
  secondaryActions?: ReactNode;
  statusIndicator?: ReactNode;
  headerFooter?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Shared Platform Operations header + workspace frame.
 * Prefer this over calling AdminOperationsShell from feature pages.
 */
export function PlatformOpsHeader({
  title,
  subtitle,
  breadcrumbs,
  health,
  healthLabel,
  lastUpdated,
  lastUpdatedLabel,
  primaryActions,
  headerActions,
  secondaryActions,
  statusIndicator,
  headerFooter,
  children,
  className,
}: PlatformOpsHeaderProps) {
  const actions = primaryActions ?? headerActions;
  const meta =
    statusIndicator ??
    (health || lastUpdated || secondaryActions ? (
      <PlatformOpsHeaderMeta
        health={health}
        healthLabel={healthLabel}
        lastUpdated={lastUpdated}
        lastUpdatedLabel={lastUpdatedLabel}
        extra={secondaryActions}
      />
    ) : undefined);

  return (
    <AdminOperationsShell
      title={title}
      subtitle={subtitle}
      breadcrumbs={breadcrumbs}
      compact
      narrowContent={false}
      headerActions={actions}
      statusIndicator={meta}
      headerFooter={headerFooter}
      className={className}
    >
      {children}
    </AdminOperationsShell>
  );
}
