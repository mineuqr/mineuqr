/**
 * RUNTIME-PUBLIC-API-CONSOLIDATION-1 — canonical Runtime Public API entry.
 *
 * Application and presentation code should depend on selectors and actions from
 * this module (or OperationalScreenRuntimeProvider, which remains equivalent).
 *
 * Internal Runtime Platform modules (factory, store, orchestrator) must not be
 * imported outside Runtime infrastructure.
 */

export {
  OperationalScreenRuntimeProvider,
  useRuntimeIdentity,
  useRuntimeBusiness,
  useRuntimeDevice,
  useRuntimeRole,
  useRuntimeConfiguration,
  useRuntimeCapabilities,
  useRuntimeSession,
  useRuntimeMetadata,
  useRuntimeInstanceContext,
  useRuntimeActions,
} from "@/components/operational-screen/OperationalScreenRuntimeProvider";

export type { RuntimeActions } from "@/lib/operational-screen/runtimeContextActions";

/** Transitional compatibility — prefer slice selectors and useRuntimeActions. */
export {
  useScreenRuntime,
  useRuntimeContext,
} from "@/components/operational-screen/OperationalScreenRuntimeProvider";

export type {
  RuntimeOrchestratorValue,
} from "@/components/operational-screen/OperationalScreenRuntimeProvider";

export type { OperationalScreenRuntimeContext } from "@/lib/operational-screen/runtimeTypes";
export type { FrozenRuntimeInstanceContext } from "@/lib/operational-screen/runtimeInstanceContext";
