import type { OperationalDeviceRecord } from "./deviceContracts";

export type ScreenConfigVersionSource = Pick<
  OperationalDeviceRecord,
  "updatedAt" | "screenConfigRevision"
>;

/**
 * Canonical runtime configuration version — stable across heartbeat/liveness updates.
 * Prefers monotonic screenConfigRevision; falls back to updatedAt for legacy rows.
 */
export function resolveScreenConfigVersion(source: ScreenConfigVersionSource): string {
  if (source.screenConfigRevision != null && source.screenConfigRevision > 0) {
    return String(source.screenConfigRevision);
  }
  return source.updatedAt;
}

export function screenConfigVersionsDiffer(
  applied: string | null,
  incoming: string
): boolean {
  return applied != null && applied !== incoming;
}
