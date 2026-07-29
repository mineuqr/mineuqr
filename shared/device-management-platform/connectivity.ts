/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Connectivity signals — consume Realtime connectivity SSOT; no parallel collectors.
 */

export const DEVICE_CONNECTIVITY_SIGNALS = [
  "online_status",
  "last_seen",
  "heartbeat",
  "reconnect_count",
  "latency",
  "realtime_connectivity",
  "provisioning_state",
] as const;

export type DeviceConnectivitySignalId =
  (typeof DEVICE_CONNECTIVITY_SIGNALS)[number];

export type DeviceConnectivityArchitecture = {
  id: DeviceConnectivitySignalId;
  title: string;
  mode: "owned_metadata" | "consume_realtime_ssot";
  notes: string;
};

export const DEVICE_CONNECTIVITY_ARCHITECTURE: readonly DeviceConnectivityArchitecture[] =
  [
    {
      id: "online_status",
      title: "Online Status",
      mode: "owned_metadata",
      notes: "Derived operational status from connectivity signals.",
    },
    {
      id: "last_seen",
      title: "Last Seen",
      mode: "owned_metadata",
      notes: "Device platform stores last-seen metadata.",
    },
    {
      id: "heartbeat",
      title: "Heartbeat",
      mode: "owned_metadata",
      notes: "Heartbeat cadence / freshness metadata.",
    },
    {
      id: "reconnect_count",
      title: "Reconnect Count",
      mode: "consume_realtime_ssot",
      notes: "Prefer Realtime Observability reconnect signals when available.",
    },
    {
      id: "latency",
      title: "Latency",
      mode: "consume_realtime_ssot",
      notes: "Consume Realtime / Performance latency SSOT — no duplicate collectors.",
    },
    {
      id: "realtime_connectivity",
      title: "Realtime Connectivity",
      mode: "consume_realtime_ssot",
      notes: "Device does not own Realtime transport.",
    },
    {
      id: "provisioning_state",
      title: "Provisioning State",
      mode: "owned_metadata",
      notes: "Enrollment connectivity posture — provisioning reserved.",
    },
  ] as const;
