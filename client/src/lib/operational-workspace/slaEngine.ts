/** Certified SLA thresholds (KITCHEN-DISPLAY-ARCHITECTURE-1). */
export const SLA_TARGET_PENDING_SECONDS = 300;
export const SLA_TARGET_PREPARING_SECONDS = 900;
export const SLA_TARGET_READY_SECONDS = 300;
export const SLA_ELEVATED_SECONDS = 600;
export const SLA_CRITICAL_SECONDS = 1200;

export type SlaStatus = "on-time" | "at-risk" | "late" | "critical";

export type SlaSnapshot = {
  elapsedSeconds: number;
  targetSeconds: number;
  lateSeconds: number;
  status: SlaStatus;
  urgencyTier: "normal" | "elevated" | "critical";
};

export function targetSecondsForStatus(status: string): number {
  switch (status) {
    case "pending":
      return SLA_TARGET_PENDING_SECONDS;
    case "preparing":
      return SLA_TARGET_PREPARING_SECONDS;
    case "ready":
      return SLA_TARGET_READY_SECONDS;
    default:
      return SLA_TARGET_PREPARING_SECONDS;
  }
}

export function computeSlaSnapshot(
  status: string,
  columnElapsedSeconds: number,
  totalElapsedSeconds: number
): SlaSnapshot {
  const targetSeconds = targetSecondsForStatus(status);
  const elapsedSeconds = columnElapsedSeconds;
  const lateSeconds = Math.max(0, elapsedSeconds - targetSeconds);

  let statusLevel: SlaStatus = "on-time";
  if (elapsedSeconds >= SLA_CRITICAL_SECONDS) statusLevel = "critical";
  else if (elapsedSeconds >= targetSeconds) statusLevel = "late";
  else if (elapsedSeconds >= targetSeconds * 0.75) statusLevel = "at-risk";

  let urgencyTier: SlaSnapshot["urgencyTier"] = "normal";
  if (elapsedSeconds >= SLA_CRITICAL_SECONDS) urgencyTier = "critical";
  else if (elapsedSeconds >= SLA_ELEVATED_SECONDS) urgencyTier = "elevated";

  return {
    elapsedSeconds: totalElapsedSeconds,
    targetSeconds,
    lateSeconds,
    status: statusLevel,
    urgencyTier,
  };
}

export function formatElapsedLabel(seconds: number, isAr: boolean): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return isAr ? `${mins} د` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return isAr ? `${hours} س ${rem} د` : `${hours}h ${rem}m`;
}
