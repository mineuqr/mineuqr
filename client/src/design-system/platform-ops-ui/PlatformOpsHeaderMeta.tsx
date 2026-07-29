/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Page header meta slots — health + last updated for AdminOperationsShell.
 * Does not alter routing, breadcrumbs ownership, or navigation.
 */

import type { ReactNode } from "react";
import { PlatformOpsStatusBadge } from "./PlatformOpsStatusBadge";
import { PLATFORM_OPS_UI } from "./tokens";
import type { PlatformOpsHealthStatus } from "./status";
import { cn } from "@/lib/utils";

type PlatformOpsHeaderMetaProps = {
  health?: PlatformOpsHealthStatus | string;
  healthLabel?: string;
  lastUpdated?: string;
  lastUpdatedLabel?: string;
  extra?: ReactNode;
  className?: string;
};

/** Pass as `statusIndicator` on PlatformOpsWorkspaceShell / AdminOperationsShell. */
export function PlatformOpsHeaderMeta({
  health,
  healthLabel,
  lastUpdated,
  lastUpdatedLabel,
  extra,
  className,
}: PlatformOpsHeaderMetaProps) {
  return (
    <div
      data-slot="platform-ops-header-meta"
      className={cn(
        "flex flex-wrap items-center gap-2",
        className
      )}
    >
      {health ? (
        <PlatformOpsStatusBadge status={health} label={healthLabel} />
      ) : null}
      {lastUpdated ? (
        <span className={PLATFORM_OPS_UI.lastUpdated}>
          {lastUpdatedLabel ? `${lastUpdatedLabel}: ` : null}
          {lastUpdated}
        </span>
      ) : null}
      {extra}
    </div>
  );
}
