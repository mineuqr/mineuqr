import { DEVICE_OFFLINE_THRESHOLD_MS } from "../domain/deviceRoles";

export type DevicePresence = "online" | "offline" | "never_seen";

export function deriveDevicePresence(
  lastSeenAt: string | null,
  now: number = Date.now()
): DevicePresence {
  if (!lastSeenAt) return "never_seen";
  return now - Date.parse(lastSeenAt) <= DEVICE_OFFLINE_THRESHOLD_MS ? "online" : "offline";
}

export function summarizeDeviceHealth(input: {
  status: "active" | "disabled";
  lastSeenAt: string | null;
  reportedVersion: string | null;
  hasActiveToken: boolean;
  now?: number;
}) {
  const presence = deriveDevicePresence(input.lastSeenAt, input.now);
  const operational =
    input.status === "active" && input.hasActiveToken && presence === "online";
  return {
    presence,
    operational,
    status: input.status,
    reportedVersion: input.reportedVersion,
    lastSeenAt: input.lastSeenAt,
    hasActiveToken: input.hasActiveToken,
  };
}
