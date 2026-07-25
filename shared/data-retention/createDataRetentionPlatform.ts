/**
 * DATA-RETENTION-PLATFORM-1 — compose DRAP runtime (in-process, no persistence).
 */

import {
  createRetentionAdapterRegistry,
  type RetentionAdapterRegistry,
} from "./adapters/retentionAdapter";
import {
  advanceLifecycleTowardEligibility,
  evaluateRetentionEligibility,
  type EvaluateLifecycleInput,
} from "./engine/lifecycleEngine";
import {
  DEFAULT_RETENTION_FEATURE_FLAGS,
  mergeRetentionFeatureFlags,
} from "./featureFlags";
import { createRetentionHoldRegistry } from "./holds/retentionHolds";
import {
  createRetentionDiagnostics,
  structuredRetentionLog,
} from "./observability/retentionDiagnostics";
import {
  createRetentionPolicyRegistry,
  type RetentionPolicyRegistry,
} from "./registry/policyRegistry";
import {
  createRetentionScheduler,
  type RetentionScheduler,
} from "./scheduler/retentionScheduler";
import type {
  RetentionEligibility,
  RetentionFeatureFlags,
  RetentionHold,
  RetentionPolicy,
  RetentionSubjectRef,
  RetentionTransitionResult,
} from "./types";

export type DataRetentionPlatform = Readonly<{
  policies: RetentionPolicyRegistry;
  holds: ReturnType<typeof createRetentionHoldRegistry>;
  adapters: RetentionAdapterRegistry;
  scheduler: RetentionScheduler;
  diagnostics: ReturnType<typeof createRetentionDiagnostics>;
  flags: RetentionFeatureFlags;
  resolvePolicy: (input: {
    entityType: RetentionPolicy["entityType"];
    restaurantId?: number | null;
  }) => ReturnType<RetentionPolicyRegistry["resolve"]>;
  evaluate: (
    input: Omit<EvaluateLifecycleInput, "policy" | "holdKinds"> & {
      subject: RetentionSubjectRef;
    }
  ) => RetentionEligibility;
  advance: (
    input: Omit<EvaluateLifecycleInput, "policy" | "holdKinds"> & {
      subject: RetentionSubjectRef;
    }
  ) => RetentionTransitionResult;
  placeHold: (hold: RetentionHold) => void;
  releaseHold: (holdId: string) => void;
}>;

export function createDataRetentionPlatform(options?: {
  flags?: Partial<RetentionFeatureFlags>;
  seedPlatformFallbacks?: boolean;
  nowIso?: string;
}): DataRetentionPlatform {
  const flags = mergeRetentionFeatureFlags(
    options?.flags ?? DEFAULT_RETENTION_FEATURE_FLAGS
  );
  const policies = createRetentionPolicyRegistry({
    seedPlatformFallbacks: options?.seedPlatformFallbacks,
    nowIso: options?.nowIso,
  });
  const holds = createRetentionHoldRegistry();
  const adapters = createRetentionAdapterRegistry();
  const diagnostics = createRetentionDiagnostics();
  const scheduler = createRetentionScheduler({ flags });

  function resolvePolicy(input: {
    entityType: RetentionPolicy["entityType"];
    restaurantId?: number | null;
  }) {
    const resolved = policies.resolve(input);
    structuredRetentionLog(diagnostics, {
      eventType: "policy_resolved",
      at: options?.nowIso ?? new Date().toISOString(),
      restaurantId: input.restaurantId ?? undefined,
      entityType: input.entityType,
      detail: { source: resolved.source, policyId: resolved.policy.policyId },
    });
    return resolved;
  }

  function evaluate(
    input: Omit<EvaluateLifecycleInput, "policy" | "holdKinds"> & {
      subject: RetentionSubjectRef;
    }
  ): RetentionEligibility {
    if (!flags.drapEnabled) {
      return {
        state: input.currentState,
        inDisplayWindow: true,
        archiveEligible: false,
        restoreEligible: false,
        purgeEligible: false,
        holdActive: false,
        holdKinds: [],
        reasons: ["drap_disabled"],
      };
    }
    const { policy } = resolvePolicy({
      entityType: input.subject.entityType,
      restaurantId: input.subject.restaurantId,
    });
    const holdKinds = holds.activeKinds(input.subject);
    const eligibility = evaluateRetentionEligibility({
      ...input,
      policy,
      holdKinds,
    });
    structuredRetentionLog(diagnostics, {
      eventType: "lifecycle_evaluated",
      at: input.nowIso,
      restaurantId: input.subject.restaurantId,
      entityType: input.subject.entityType,
      entityId: input.subject.entityId,
      detail: { state: eligibility.state, reasons: eligibility.reasons },
    });
    return eligibility;
  }

  function advance(
    input: Omit<EvaluateLifecycleInput, "policy" | "holdKinds"> & {
      subject: RetentionSubjectRef;
    }
  ): RetentionTransitionResult {
    const { policy } = resolvePolicy({
      entityType: input.subject.entityType,
      restaurantId: input.subject.restaurantId,
    });
    const holdKinds = holds.activeKinds(input.subject);
    const result = advanceLifecycleTowardEligibility({
      ...input,
      policy,
      holdKinds,
    });
    structuredRetentionLog(diagnostics, {
      eventType: "lifecycle_transition",
      at: input.nowIso,
      restaurantId: input.subject.restaurantId,
      entityType: input.subject.entityType,
      entityId: input.subject.entityId,
      detail: {
        from: result.from,
        to: result.to,
        applied: result.applied,
        idempotent: result.idempotent,
        reasons: result.reasons,
      },
    });
    return result;
  }

  return {
    policies,
    holds,
    adapters,
    scheduler,
    diagnostics,
    flags,
    resolvePolicy,
    evaluate,
    advance,
    placeHold(hold) {
      holds.place(hold);
      structuredRetentionLog(diagnostics, {
        eventType: "hold_placed",
        at: hold.placedAt,
        restaurantId: hold.restaurantId,
        entityType: hold.entityType,
        entityId: hold.entityId,
        detail: { holdId: hold.holdId, kind: hold.kind },
      });
    },
    releaseHold(holdId) {
      holds.release(holdId);
      structuredRetentionLog(diagnostics, {
        eventType: "hold_released",
        at: new Date().toISOString(),
        detail: { holdId },
      });
    },
  };
}
