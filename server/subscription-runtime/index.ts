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

export { loadBoundLivePlan } from "./snapshotLoader";
export type { LoadedLivePlan, LivePlanLoadResult } from "./snapshotLoader";

export {
  resolveEntitlementsFromLivePlan,
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
  deriveCommercialAccountState,
  isFrozenCommercialAccountState,
  COMMERCIAL_ACCOUNT_STATES,
} from "./commercialAccountState";
export type {
  CommercialAccountState,
  CommercialAccountStateDecision,
} from "./commercialAccountState";

export {
  checkEntitlement,
  hasFeature,
  requireFeature,
  checkCapability,
  checkLimit,
} from "./enforcement";
export type { EntitlementDecision, LimitDecision } from "./enforcement";

export { requireRestaurantPlanFeature } from "./requireRestaurantPlanFeature";

export {
  withCommercialLimitOccupancy,
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
} from "./commercialLimitOccupancy";
export {
  throwCommercialOccupancyTrpcError,
  COMMERCIAL_LIMIT_EXCEEDED_CLIENT_CODE,
  COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_CODE,
  COMMERCIAL_OCCUPANCY_UNAVAILABLE_CLIENT_MESSAGE,
} from "./commercialOccupancyTrpc";
export type {
  CommercialOccupancyScope,
  CommercialOccupancyTx,
  WithCommercialLimitOccupancyInput,
} from "./commercialLimitOccupancy";

export {
  assertOnboardingFirstRestaurantPermitted,
  decideOnboardingRestaurantCapacity,
  resolveOnboardingRestaurantCapacity,
  ONBOARDING_FIRST_RESTAURANT_PROPOSED_TOTAL,
  ONBOARDING_RESTAURANT_LIMIT_KEY,
} from "./onboardingRestaurantCapacity";

export {
  getCachedEntitlements,
  setCachedEntitlements,
  invalidateEntitlementCache,
  entitlementCacheKey,
} from "./cache";
export type { EntitlementCacheScope } from "./cache";
