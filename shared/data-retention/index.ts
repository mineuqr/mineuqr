/**
 * DATA-RETENTION-PLATFORM-1 / ADR-ARCH-031 —
 * Data Retention & Archival Platform (DRAP) barrel.
 * Lifecycle policy authority only. Domains own data.
 */

export {
  DRAP_ADR_ID,
  DRAP_DEFAULT_ARCHIVE_RETENTION_DAYS,
  DRAP_DEFAULT_DISPLAY_WINDOW_DAYS,
  DRAP_DEFAULT_OPERATIONAL_RETENTION_DAYS,
  DRAP_PLATFORM_FALLBACK_POLICY_ID,
  DRAP_PLATFORM_ID,
  RETENTION_ENTITY_TYPES,
  RETENTION_HOLD_KINDS,
  RETENTION_LIFECYCLE_STATES,
  RETENTION_SCHEDULER_HOOKS,
} from "./constants";

export type {
  PolicyResolutionSource,
  ResolvedRetentionPolicy,
  RetentionAuditEvent,
  RetentionEligibility,
  RetentionEntityType,
  RetentionFeatureFlags,
  RetentionHold,
  RetentionHoldKind,
  RetentionLifecycleState,
  RetentionMetricSnapshot,
  RetentionPolicy,
  RetentionSchedulerHook,
  RetentionSubjectRef,
  RetentionTimestamps,
  RetentionTransitionResult,
} from "./types";

export {
  buildPlatformFallbackPolicy,
  buildSettlementRecordSafePolicy,
} from "./policy/defaults";
export {
  assertValidRetentionPolicy,
  validateRetentionPolicy,
  type RetentionPolicyValidationIssue,
  type RetentionPolicyValidationResult,
} from "./policy/validateRetentionPolicy";

export {
  createRetentionPolicyRegistry,
  type RetentionPolicyRegistry,
} from "./registry/policyRegistry";

export {
  LIFECYCLE_ORDER,
  daysBetween,
  isAdjacentTransition,
  isLifecycleTerminal,
  lifecycleIndex,
  nextLifecycleState,
} from "./engine/lifecycleStates";
export {
  advanceLifecycleTowardEligibility,
  deriveTargetLifecycleState,
  evaluateRetentionEligibility,
  transitionLifecycleState,
  type EvaluateLifecycleInput,
} from "./engine/lifecycleEngine";

export {
  createRetentionHoldRegistry,
  holdsBlockArchive,
  holdsBlockPurge,
  type RetentionHoldRegistry,
} from "./holds/retentionHolds";

export {
  createRetentionScheduler,
  enqueueDryRunArchive,
  enqueueSimulation,
  type RetentionScheduler,
  type RetentionSchedulerJob,
  type RetentionSchedulerJobKind,
  type RetentionSchedulerHookHandler,
} from "./scheduler/retentionScheduler";

export {
  assertAdapterTenantIsolation,
  createRetentionAdapterRegistry,
  type RetentionAdapter,
  type RetentionAdapterRegistry,
} from "./adapters/retentionAdapter";

export {
  createRetentionDiagnostics,
  structuredRetentionLog,
  type RetentionDiagnostics,
} from "./observability/retentionDiagnostics";

export {
  DEFAULT_RETENTION_FEATURE_FLAGS,
  mergeRetentionFeatureFlags,
} from "./featureFlags";

export {
  createDataRetentionPlatform,
  type DataRetentionPlatform,
} from "./createDataRetentionPlatform";
