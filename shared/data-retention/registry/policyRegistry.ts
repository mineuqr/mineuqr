/**
 * DATA-RETENTION-PLATFORM-1 — centralized policy registry.
 * No persistence assumptions. In-memory authority for process lifetime.
 */

import {
  buildPlatformFallbackPolicy,
  buildSettlementRecordSafePolicy,
} from "../policy/defaults";
import { assertValidRetentionPolicy } from "../policy/validateRetentionPolicy";
import type {
  PolicyResolutionSource,
  ResolvedRetentionPolicy,
  RetentionEntityType,
  RetentionPolicy,
} from "../types";

export type RetentionPolicyRegistry = {
  register(policy: RetentionPolicy): void;
  update(policy: RetentionPolicy): void;
  get(policyId: string): RetentionPolicy | undefined;
  list(entityType?: RetentionEntityType): readonly RetentionPolicy[];
  resolve(input: {
    entityType: RetentionEntityType;
    restaurantId?: number | null;
  }): ResolvedRetentionPolicy;
  clear(): void;
  size(): number;
};

function policyKey(policy: RetentionPolicy): string {
  return policy.policyId;
}

function isOverrideFor(
  policy: RetentionPolicy,
  entityType: RetentionEntityType,
  restaurantId: number
): boolean {
  return (
    policy.entityType === entityType &&
    policy.restaurantId === restaurantId &&
    policy.enabled
  );
}

function isGlobalDefault(
  policy: RetentionPolicy,
  entityType: RetentionEntityType
): boolean {
  return (
    policy.entityType === entityType &&
    policy.defaultPolicy === true &&
    (policy.restaurantId == null || policy.restaurantId === undefined) &&
    policy.enabled
  );
}

export function createRetentionPolicyRegistry(options?: {
  seedPlatformFallbacks?: boolean;
  nowIso?: string;
}): RetentionPolicyRegistry {
  const store = new Map<string, RetentionPolicy>();
  const nowIso = options?.nowIso ?? new Date().toISOString();

  if (options?.seedPlatformFallbacks !== false) {
    // Seed settlement permanent + generic platform fallbacks on demand in resolve.
    store.set(
      "drap.policy.settlement_record.permanent",
      buildSettlementRecordSafePolicy(nowIso)
    );
  }

  function register(policy: RetentionPolicy): void {
    assertValidRetentionPolicy(policy);
    if (store.has(policy.policyId)) {
      throw new Error(`Policy already registered: ${policy.policyId}`);
    }
    store.set(policyKey(policy), Object.freeze({ ...policy }));
  }

  function update(policy: RetentionPolicy): void {
    assertValidRetentionPolicy(policy);
    if (!store.has(policy.policyId)) {
      throw new Error(`Policy not found: ${policy.policyId}`);
    }
    store.set(policyKey(policy), Object.freeze({ ...policy }));
  }

  function get(policyId: string): RetentionPolicy | undefined {
    return store.get(policyId);
  }

  function list(entityType?: RetentionEntityType): readonly RetentionPolicy[] {
    const all = [...store.values()];
    if (!entityType) return all;
    return all.filter((p) => p.entityType === entityType);
  }

  function resolve(input: {
    entityType: RetentionEntityType;
    restaurantId?: number | null;
  }): ResolvedRetentionPolicy {
    const { entityType, restaurantId } = input;

    if (restaurantId != null && restaurantId > 0) {
      const override = [...store.values()].find((p) =>
        isOverrideFor(p, entityType, restaurantId)
      );
      if (override) {
        if (!override.restaurantOverrideAllowed && override.defaultPolicy) {
          // Should not happen for overrides; continue.
        }
        return { policy: override, source: "restaurant_override" };
      }
    }

    const global = [...store.values()].find((p) =>
      isGlobalDefault(p, entityType)
    );
    if (global) {
      return { policy: global, source: "global_default" };
    }

    const fallback =
      entityType === "settlement_record"
        ? buildSettlementRecordSafePolicy(nowIso)
        : buildPlatformFallbackPolicy(entityType, nowIso);
    return { policy: fallback, source: "platform_fallback" };
  }

  return {
    register,
    update,
    get,
    list,
    resolve,
    clear: () => store.clear(),
    size: () => store.size,
  };
}

export type { PolicyResolutionSource };
