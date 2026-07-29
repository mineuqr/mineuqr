/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Diagnostics — read-only; no runtime mutation.
 */

export const DEVICE_DIAGNOSTIC_CAPABILITIES = [
  "connectivity",
  "provisioning_failures",
  "registration_failures",
  "version_mismatch",
  "heartbeat_analysis",
  "configuration_drift",
  "realtime_connectivity",
  "restart_history",
] as const;

export type DeviceDiagnosticCapabilityId =
  (typeof DEVICE_DIAGNOSTIC_CAPABILITIES)[number];

export type DeviceDiagnosticArchitecture = {
  id: DeviceDiagnosticCapabilityId;
  title: string;
  mutationAllowed: false;
  notes: string;
};

export const DEVICE_DIAGNOSTICS_ARCHITECTURE: readonly DeviceDiagnosticArchitecture[] =
  [
    {
      id: "connectivity",
      title: "Connectivity",
      mutationAllowed: false,
      notes: "Observe connectivity posture only.",
    },
    {
      id: "provisioning_failures",
      title: "Provisioning Failures",
      mutationAllowed: false,
      notes: "Observe enrollment failures — provisioning reserved.",
    },
    {
      id: "registration_failures",
      title: "Registration Failures",
      mutationAllowed: false,
      notes: "Observe registration failures only.",
    },
    {
      id: "version_mismatch",
      title: "Version Mismatch",
      mutationAllowed: false,
      notes: "Detect version skew — updates reserved.",
    },
    {
      id: "heartbeat_analysis",
      title: "Heartbeat Analysis",
      mutationAllowed: false,
      notes: "Analyze heartbeat freshness / gaps.",
    },
    {
      id: "configuration_drift",
      title: "Configuration Drift",
      mutationAllowed: false,
      notes: "Compare expected vs reported config metadata.",
    },
    {
      id: "realtime_connectivity",
      title: "Realtime Connectivity",
      mutationAllowed: false,
      notes: "Consume Realtime SSOT — do not own transport.",
    },
    {
      id: "restart_history",
      title: "Restart History",
      mutationAllowed: false,
      notes: "Historical restart metadata only.",
    },
  ] as const;
