/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Integration matrix — consume existing platforms; no duplicated collectors.
 */

export type RuntimeIntegrationMode =
  | "consume_ssot"
  | "present_only"
  | "emit_to_alerts"
  | "adr_governed"
  | "reserved";

export type RuntimeIntegrationDefinition = {
  id: string;
  partner: string;
  mode: RuntimeIntegrationMode;
  ownsData: boolean;
  notes: string;
};

export const RUNTIME_INTEGRATION_MATRIX: readonly RuntimeIntegrationDefinition[] =
  [
    {
      id: "realtime_observability",
      partner: "REALTIME-PLATFORM-OBSERVABILITY-1",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Runtime does not own Realtime transport or collectors.",
    },
    {
      id: "performance_platform",
      partner: "PERFORMANCE-PLATFORM-ARCHITECTURE-1",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Jobs/queue latency signals coordinate with Performance catalog.",
    },
    {
      id: "platform_health",
      partner: "Platform System Health",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Map runtime health into Platform Ops Health when wired.",
    },
    {
      id: "logging",
      partner: "Logging Platform",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Adapt logs — no parallel log store.",
    },
    {
      id: "alerts",
      partner: "Alert Platform",
      mode: "emit_to_alerts",
      ownsData: false,
      notes: "Escalate infrastructure failures — do not fork Alert Platform.",
    },
    {
      id: "event_metrics",
      partner: "Existing Event Pipeline metrics",
      mode: "consume_ssot",
      ownsData: false,
      notes: "No duplicate event collectors.",
    },
    {
      id: "event_governance",
      partner: "ADR-ARCH-014 / ADR-ARCH-021",
      mode: "adr_governed",
      ownsData: false,
      notes: "Idempotency and delivery guarantees preserved.",
    },
    {
      id: "platform_ops_ui",
      partner: "PLATFORM-OPERATIONS-UI-FOUNDATION-1",
      mode: "present_only",
      ownsData: false,
      notes: "All Runtime UI uses platform-ops-ui only.",
    },
  ] as const;
