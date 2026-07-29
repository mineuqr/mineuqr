/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * + PLATFORM-P0-PRODUCTION-READINESS-1
 * Module navigation tile — overview grid only (presentation).
 */

import { Link } from "wouter";
import { PLATFORM_OPS_UI } from "./tokens";
import { PlatformOpsStatusBadge } from "./PlatformOpsStatusBadge";
import type { PlatformOpsHealthStatus } from "./status";
import { cn } from "@/lib/utils";

type PlatformOpsModuleTileProps = {
  href: string;
  title: string;
  description: string;
  statusLabel: string;
  /**
   * When set, drives badge tone (preferred).
   * Falls back to `live` boolean for older call sites.
   */
  statusTone?: PlatformOpsHealthStatus;
  /** @deprecated Prefer statusTone — true maps to healthy, false to unknown. */
  live?: boolean;
  className?: string;
};

export function PlatformOpsModuleTile({
  href,
  title,
  description,
  statusLabel,
  statusTone,
  live = false,
  className,
}: PlatformOpsModuleTileProps) {
  const tone: PlatformOpsHealthStatus =
    statusTone ?? (live ? "healthy" : "unknown");

  return (
    <Link
      href={href}
      data-slot="platform-ops-module-tile"
      className={cn(
        PLATFORM_OPS_UI.moduleTile,
        "block p-3 transition-colors hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <PlatformOpsStatusBadge status={tone} label={statusLabel} />
      </div>
      <p className="mt-1 text-xs text-cyan-300/80">{description}</p>
    </Link>
  );
}
