/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Status badge — SemanticBadge only.
 */

import { StatusBadge } from "@/design-system/semantic-badge";
import {
  mapPlatformOpsHealthToBadgeTone,
  type PlatformOpsHealthStatus,
} from "./status";

type PlatformOpsStatusBadgeProps = {
  status: PlatformOpsHealthStatus | string;
  label?: string;
  className?: string;
};

export function PlatformOpsStatusBadge({
  status,
  label,
  className,
}: PlatformOpsStatusBadgeProps) {
  const tone = mapPlatformOpsHealthToBadgeTone(status);
  return (
    <StatusBadge tone={tone} className={className}>
      {label ?? status}
    </StatusBadge>
  );
}
