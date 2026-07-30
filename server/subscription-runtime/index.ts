/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Public runtime surface — Subscription owns commercial entitlement enforcement.
 */

export {
  CAPABILITY_ENTITLEMENT_MATRIX,
  resolveCapabilityEntitlement,
  assertFeatureKey,
  allFeatureCapabilityIds,
} from "./capabilityMatrix";
export type {
  CapabilityEntitlement,
  CapabilityKind,
  LimitEntitlementKey,
} from "./capabilityMatrix";

export {
  syncCommercialLifecycle,
  lifecycleEnablesEntitlements,
  COMMERCIAL_LIFECYCLE_STATES,
} from "./lifecycleSync";
export type {
  CommercialLifecycleState,
  LifecycleSignals,
  LifecycleSyncInput,
  LifecycleSyncResult,
} from "./lifecycleSync";

export {
  setLifecycleSignals,
  clearLifecycleSignals,
  getLifecycleSignals,
  clearAllLifecycleSignals,
  markGrandfathered,
  markSuspended,
  clearSuspended,
  enterGrace,
} from "./lifecycleOverlay";

export { loadBoundCommercialSnapshot } from "./snapshotLoader";
export type { LoadedSnapshot, SnapshotLoadResult } from "./snapshotLoader";

export {
  resolveEntitlementsFromSnapshot,
  denyEntitlementsFailClosed,
  hasFeatureInEntitlements,
  readLimitValue,
  lifecycleToSubscriptionStatus,
} from "./entitlementResolver";

export {
  resolveOwnerEntitlements,
  notifySubscriptionLifecycleChanged,
  subscriptionRuntimeService,
} from "./subscriptionRuntimeService";

export {
  checkEntitlement,
  hasFeature,
  requireFeature,
  checkCapability,
  checkLimit,
} from "./enforcement";
export type { EntitlementDecision, LimitDecision } from "./enforcement";

export {
  getCachedEntitlements,
  setCachedEntitlements,
  invalidateEntitlementCache,
} from "./cache";
