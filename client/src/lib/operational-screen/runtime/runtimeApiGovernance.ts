/**
 * RUNTIME-PUBLIC-API-CONSOLIDATION-1 — authoritative Runtime API classification.
 *
 * Every Runtime export must appear in exactly one tier below.
 * Architecture tests enforce this registry against provider and module exports.
 */

/** Preferred read surface — slice selectors over RuntimeInstanceContext. */
export const RUNTIME_PUBLIC_READ_API = [
  "useRuntimeIdentity",
  "useRuntimeBusiness",
  "useRuntimeDevice",
  "useRuntimeRole",
  "useRuntimeConfiguration",
  "useRuntimeCapabilities",
  "useRuntimeSession",
  "useRuntimeMetadata",
] as const;

/** Advanced read surface — full frozen RuntimeInstanceContext snapshot. */
export const RUNTIME_PUBLIC_ADVANCED_READ_API = ["useRuntimeInstanceContext"] as const;

/** Preferred execution surface — sole public runtime mutation contract. */
export const RUNTIME_PUBLIC_EXECUTE_API = ["useRuntimeActions"] as const;

/** All hooks that form the official Runtime Public API contract. */
export const RUNTIME_PUBLIC_API = [
  ...RUNTIME_PUBLIC_READ_API,
  ...RUNTIME_PUBLIC_ADVANCED_READ_API,
  ...RUNTIME_PUBLIC_EXECUTE_API,
] as const;

/** Backward-compatible surfaces retained during migration; not part of the long-term contract. */
export const RUNTIME_TRANSITIONAL_COMPATIBILITY_API = [
  "OperationalScreenRuntimeProvider",
  "useScreenRuntime",
  "useRuntimeContext",
] as const;

/** Infrastructure-only; never imported by application or presentation modules. */
export const RUNTIME_INTERNAL_TEST_API = ["useRuntimeContextStore"] as const;

/** Lib modules that implement Runtime Platform internals. */
export const RUNTIME_INTERNAL_MODULES = [
  "RuntimeContextFactory",
  "runtimeContextFactory",
  "runtimeContextStore",
  "useRuntimeOrchestrator",
  "runtimeContextSelectors",
  "runtimeContextActions",
] as const;

/** Provider and orchestration layer — sole bridges from internal modules to React. */
export const RUNTIME_INTERNAL_MODULE_CONSUMERS = [
  "client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx",
  "client/src/lib/operational-screen/useRuntimeOrchestrator.ts",
  "client/src/lib/operational-screen/bootstrapLogic.ts",
  "client/src/lib/operational-screen/orchestration/runtimeBootstrapExecutor.ts",
  "client/src/lib/operational-screen/orchestration/runtimeReconciliationExecutor.ts",
  "client/src/lib/operational-screen/orchestration/runtimePublicationPolicy.ts",
] as const;

export type RuntimePublicReadApi = (typeof RUNTIME_PUBLIC_READ_API)[number];
export type RuntimePublicAdvancedReadApi = (typeof RUNTIME_PUBLIC_ADVANCED_READ_API)[number];
export type RuntimePublicExecuteApi = (typeof RUNTIME_PUBLIC_EXECUTE_API)[number];
export type RuntimePublicApi = (typeof RUNTIME_PUBLIC_API)[number];
export type RuntimeTransitionalCompatibilityApi =
  (typeof RUNTIME_TRANSITIONAL_COMPATIBILITY_API)[number];
export type RuntimeInternalTestApi = (typeof RUNTIME_INTERNAL_TEST_API)[number];

/** Public action names exposed exclusively through useRuntimeActions(). */
export const RUNTIME_PUBLIC_ACTIONS = [
  "refresh",
  "reloadConfiguration",
  "unpair",
  "retry",
] as const;

/**
 * refresh and reloadConfiguration share status refetch transport but represent
 * distinct post-refetch intentions (dynamic refresh vs configuration reload).
 */
export const RUNTIME_DISTINCT_ACTION_INTENTIONS = [
  "refresh",
  "reloadConfiguration",
] as const;
