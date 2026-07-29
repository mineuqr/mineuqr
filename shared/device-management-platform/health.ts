/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Device health model — threshold driven; evaluation deferred.
 */

export const DEVICE_HEALTH_STATUSES = [
  "healthy",
  "warning",
  "offline",
  "disconnected",
  "provisioning",
  "updating",
  "maintenance",
  "retired",
  "unknown",
] as const;

export type DeviceHealthStatus = (typeof DEVICE_HEALTH_STATUSES)[number];

export type DeviceHealthRuleArchitecture = {
  id: string;
  signal: string;
  description: string;
  configurable: true;
  bands: readonly {
    status: Exclude<DeviceHealthStatus, "unknown">;
    note: string;
  }[];
};

export const DEVICE_HEALTH_RULE_ARCHITECTURE: readonly DeviceHealthRuleArchitecture[] =
  [
    {
      id: "device.last_seen",
      signal: "connectivity.lastSeen",
      description: "Last-seen freshness bands",
      configurable: true,
      bands: [
        { status: "healthy", note: "within heartbeat window" },
        { status: "warning", note: "approaching stale" },
        { status: "offline", note: "past offline threshold" },
        { status: "disconnected", note: "explicit disconnect signal" },
      ],
    },
    {
      id: "device.lifecycle",
      signal: "lifecycle.state",
      description: "Lifecycle-driven health overlays",
      configurable: true,
      bands: [
        { status: "provisioning", note: "enrollment in progress" },
        { status: "updating", note: "update in progress" },
        { status: "maintenance", note: "operator maintenance" },
        { status: "retired", note: "end of life" },
      ],
    },
  ] as const;
