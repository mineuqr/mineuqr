import type { RuntimeContextChangeReason } from "../runtimeContextStore";
import type { RuntimeContextStore } from "../runtimeContextStore";
import type { OperationalScreenRuntimeContext } from "../runtimeTypes";
import type { FrozenRuntimeInstanceContext } from "../runtimeInstanceContext";
import {
  runtimeContextReconciliationChanged,
  snapshotReconciliationChanged,
} from "./runtimeReconciliationPolicy";

export type SnapshotPublicationResult = {
  published: boolean;
  snapshot: FrozenRuntimeInstanceContext | null;
};

export type ContextPublicationResult = {
  published: boolean;
  context: OperationalScreenRuntimeContext | null;
};

/**
 * RUNTIME-RECONCILIATION-ARCHITECTURE-1 — conditional publication.
 *
 * replaceSnapshot and setContext are forbidden unless reconciliation keys differ.
 */
export function publishSnapshotIfChanged(
  store: RuntimeContextStore,
  previous: FrozenRuntimeInstanceContext | null,
  next: FrozenRuntimeInstanceContext,
  reason: RuntimeContextChangeReason
): SnapshotPublicationResult {
  if (!snapshotReconciliationChanged(previous, next)) {
    return { published: false, snapshot: previous };
  }
  store.replaceSnapshot(next, reason);
  return { published: true, snapshot: next };
}

export function publishContextIfChanged(
  previous: OperationalScreenRuntimeContext | null,
  next: OperationalScreenRuntimeContext
): ContextPublicationResult {
  if (!runtimeContextReconciliationChanged(previous, next)) {
    return { published: false, context: previous };
  }
  return { published: true, context: next };
}
