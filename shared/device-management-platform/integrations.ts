/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Integration matrix — consume existing platforms; no duplicated collectors.
 */

export type DeviceIntegrationMode =
  | "consume_ssot"
  | "present_only"
  | "emit_to_alerts"
  | "reserved"
  | "partner_ssot";

export type DeviceIntegrationDefinition = {
  id: string;
  partner: string;
  mode: DeviceIntegrationMode;
  ownsData: boolean;
  notes: string;
};

export const DEVICE_INTEGRATION_MATRIX: readonly DeviceIntegrationDefinition[] =
  [
    {
      id: "realtime_platform",
      partner: "REALTIME-PLATFORM-ARCHITECTURE-1 / OBSERVABILITY-1",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Consume connectivity / reconnect / latency signals — never own transport.",
    },
    {
      id: "performance_platform",
      partner: "PERFORMANCE-PLATFORM-ARCHITECTURE-1",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Latency / capacity presentation coordination.",
    },
    {
      id: "operations_runtime",
      partner: "OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Runtime job/event diagnostics remain with Runtime Platform.",
    },
    {
      id: "platform_health",
      partner: "Platform System Health",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Map device health into Platform Ops Health when wired.",
    },
    {
      id: "alert_platform",
      partner: "Alert Platform",
      mode: "emit_to_alerts",
      ownsData: false,
      notes: "Escalate device health / offline — do not fork Alert Platform.",
    },
    {
      id: "observability",
      partner: "Observability",
      mode: "consume_ssot",
      ownsData: false,
      notes: "No parallel collectors or metric stores.",
    },
    {
      id: "operational_device_domain",
      partner: "server/operational-device (existing)",
      mode: "partner_ssot",
      ownsData: false,
      notes: "Existing operational device domain remains; this package is architecture SSOT for platform lifecycle — no API/runtime changes.",
    },
    {
      id: "platform_ops_ui",
      partner: "PLATFORM-OPERATIONS-UI-FOUNDATION-1 / ADOPTION-1",
      mode: "present_only",
      ownsData: false,
      notes: "All Devices UI uses platform-ops-ui only.",
    },
  ] as const;
