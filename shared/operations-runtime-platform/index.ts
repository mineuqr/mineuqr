/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Shared Operations Runtime Platform architecture barrel.
 * Architecture only — no workers, queues, schedulers, or event bus.
 */

export {
  OPERATIONS_RUNTIME_PLATFORM_PROGRAM,
  RUNTIME_DOMAINS,
  RUNTIME_DOMAIN_DEFINITIONS,
  type RuntimeDomainId,
  type RuntimeDomainMaturity,
  type RuntimeDomainDefinition,
} from "./domains";

export {
  RUNTIME_PLATFORM_OWNS,
  RUNTIME_PLATFORM_DOES_NOT_OWN,
  RUNTIME_ARCHITECTURE_PRINCIPLES,
  type RuntimePlatformOwns,
  type RuntimePlatformDoesNotOwn,
} from "./ownership";

export {
  JOB_KINDS,
  JOB_PLATFORM_CAPABILITIES,
  JOB_PLATFORM_ARCHITECTURE,
  type JobKind,
  type JobPlatformCapability,
  type JobPlatformCapabilityArchitecture,
} from "./jobs";

export {
  EVENT_PIPELINE_STAGES,
  EVENT_PIPELINE_ARCHITECTURE,
  EVENT_GOVERNANCE_ADRS,
  EVENT_GOVERNANCE_PRESERVED,
  type EventPipelineStageId,
  type EventPipelineStageArchitecture,
  type EventGovernanceAdrId,
} from "./eventPipeline";

export {
  QUEUE_CAPABILITIES,
  QUEUE_PLATFORM_ARCHITECTURE,
  type QueueCapabilityId,
  type QueueCapabilityArchitecture,
} from "./queues";

export {
  WORKER_KINDS,
  WORKER_PLATFORM_ARCHITECTURE,
  type WorkerKindId,
  type WorkerKindArchitecture,
} from "./workers";

export {
  RUNTIME_DIAGNOSTIC_CAPABILITIES,
  RUNTIME_DIAGNOSTICS_ARCHITECTURE,
  type RuntimeDiagnosticCapabilityId,
  type RuntimeDiagnosticArchitecture,
} from "./diagnostics";

export {
  RUNTIME_HEALTH_STATUSES,
  RUNTIME_HEALTH_RULE_ARCHITECTURE,
  type RuntimeHealthStatus,
  type RuntimeHealthRuleArchitecture,
} from "./health";

export {
  RUNTIME_TIMELINE_EVENTS,
  RUNTIME_TIMELINE_ARCHITECTURE,
  type RuntimeTimelineEventId,
  type RuntimeTimelineEventArchitecture,
} from "./timeline";

export {
  RETRY_ARCHITECTURE_CAPABILITIES,
  RETRY_ARCHITECTURE,
  type RetryArchitectureCapabilityId,
  type RetryArchitectureDefinition,
} from "./retry";

export {
  RUNTIME_DASHBOARD_SECTIONS,
  RUNTIME_DASHBOARD_ARCHITECTURE,
  RUNTIME_DASHBOARD_HOST_PATHS,
  type RuntimeDashboardSectionId,
  type RuntimeDashboardSectionArchitecture,
} from "./dashboard";

export {
  RUNTIME_INTEGRATION_MATRIX,
  type RuntimeIntegrationMode,
  type RuntimeIntegrationDefinition,
} from "./integrations";
