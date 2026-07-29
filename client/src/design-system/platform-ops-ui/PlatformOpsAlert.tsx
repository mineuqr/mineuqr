/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Operational alerts — StatusBadge + semantic panel chrome (no new colors).
 */

import type { ReactNode } from "react";
import { StatusBadge } from "@/design-system/semantic-badge";
import { semanticPanel } from "@/design-system/semantic-card/tokens/panel";
import {
  mapPlatformOpsAlertToBadgeTone,
  type PlatformOpsAlertSeverity,
} from "./status";
import { cn } from "@/lib/utils";

type PlatformOpsAlertProps = {
  severity: PlatformOpsAlertSeverity | string;
  title: string;
  detail?: string;
  action?: ReactNode;
  className?: string;
};

export function PlatformOpsAlert({
  severity,
  title,
  detail,
  action,
  className,
}: PlatformOpsAlertProps) {
  const tone = mapPlatformOpsAlertToBadgeTone(severity);
  return (
    <div
      data-slot="platform-ops-alert"
      data-severity={severity}
      role="status"
      className={cn(
        semanticPanel.inset,
        "flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={tone}>{severity}</StatusBadge>
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        {detail ? (
          <p className="text-xs text-cyan-300/80">{detail}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type PlatformOpsAlertListProps = {
  children: ReactNode;
  empty?: ReactNode;
  className?: string;
};

export function PlatformOpsAlertList({
  children,
  empty,
  className,
}: PlatformOpsAlertListProps) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  const hasItems = items.some(Boolean);
  if (!hasItems && empty) {
    return <>{empty}</>;
  }
  return (
    <ul
      data-slot="platform-ops-alert-list"
      className={cn("space-y-2", className)}
    >
      {items.map((child, i) => (
        <li key={i}>{child}</li>
      ))}
    </ul>
  );
}
