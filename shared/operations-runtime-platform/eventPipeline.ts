/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Canonical Event Pipeline — ownership boundaries; no new event model.
 */

export const EVENT_PIPELINE_STAGES = [
  "publisher",
  "event_bus",
  "dispatcher",
  "consumer",
  "projection",
  "observability",
  "diagnostics",
] as const;

export type EventPipelineStageId = (typeof EVENT_PIPELINE_STAGES)[number];

export type EventPipelineStageArchitecture = {
  id: EventPipelineStageId;
  title: string;
  owner: string;
  runtimeRole: "consume_ssot" | "present_diagnostics" | "domain_owned";
  notes: string;
};

export const EVENT_PIPELINE_ARCHITECTURE: readonly EventPipelineStageArchitecture[] =
  [
    {
      id: "publisher",
      title: "Publisher",
      owner: "Domain / Outbox publishers (existing)",
      runtimeRole: "consume_ssot",
      notes: "Business domains publish facts. Runtime does not publish business events.",
    },
    {
      id: "event_bus",
      title: "Event Bus",
      owner: "Existing Event / Outbox transport SSOT",
      runtimeRole: "consume_ssot",
      notes: "No new bus. ADR-014 delivery guarantees remain authoritative.",
    },
    {
      id: "dispatcher",
      title: "Dispatcher",
      owner: "Existing Event Pipeline dispatcher",
      runtimeRole: "consume_ssot",
      notes: "Dispatch ownership unchanged.",
    },
    {
      id: "consumer",
      title: "Consumer",
      owner: "Domain integration / projection consumers",
      runtimeRole: "domain_owned",
      notes: "Consumers stay domain-owned; ADR-021 selects idempotency pattern.",
    },
    {
      id: "projection",
      title: "Projection",
      owner: "Projection owners (Orders / Reporting / Settlement / …)",
      runtimeRole: "domain_owned",
      notes: "Projection idempotency remains with projection owners + ADR-021.",
    },
    {
      id: "observability",
      title: "Observability",
      owner: "Existing metrics / logging / Performance Platform consumers",
      runtimeRole: "consume_ssot",
      notes: "No duplicate collectors — adapt existing signals.",
    },
    {
      id: "diagnostics",
      title: "Diagnostics",
      owner: "Operations Runtime Platform",
      runtimeRole: "present_diagnostics",
      notes: "Read-only failure / timeline / DLQ analysis presentation.",
    },
  ] as const;

export const EVENT_GOVERNANCE_ADRS = [
  "ADR-ARCH-014",
  "ADR-ARCH-021",
] as const;

export type EventGovernanceAdrId = (typeof EVENT_GOVERNANCE_ADRS)[number];

export const EVENT_GOVERNANCE_PRESERVED = [
  "event_idempotency",
  "projection_idempotency",
  "settlement_ownership",
  "reporting_ownership",
  "realtime_ownership",
] as const;
