/**
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — DRAP adoption for Financial Shift.
 * DRAP owns lifecycle policy only. Shift remains Aggregate Root.
 */

import {
  buildPlatformFallbackPolicy,
  createDataRetentionPlatform,
  type DataRetentionPlatform,
  type RetentionAdapter,
  type RetentionSubjectRef,
} from "@shared/data-retention";
import type { FinancialShiftDomainService } from "../FinancialShiftDomainService";

const GLOBAL_POLICY_ID = "drap.policy.financial_shift.global";

let platformSingleton: DataRetentionPlatform | null = null;

export function getFinancialShiftDrapPlatform(): DataRetentionPlatform {
  if (platformSingleton) return platformSingleton;
  const platform = createDataRetentionPlatform({
    flags: {
      drapEnabled: true,
      schedulerEnabled: true,
      archiveJobsEnabled: false,
      restoreJobsEnabled: false,
      purgeJobsEnabled: false,
      dryRunDefault: true,
    },
  });
  const policy = {
    ...buildPlatformFallbackPolicy(
      "financial_shift",
      new Date().toISOString()
    ),
    policyId: GLOBAL_POLICY_ID,
    defaultPolicy: true,
    displayWindowDays: 30,
    operationalRetentionDays: 365,
    archiveEnabled: true,
    restoreEnabled: true,
    purgeEnabled: false,
  };
  try {
    platform.policies.register(policy);
  } catch {
    /* already registered */
  }
  platformSingleton = platform;
  return platform;
}

export function ensureFinancialShiftRetentionAdapter(
  shifts: FinancialShiftDomainService
): void {
  const platform = getFinancialShiftDrapPlatform();
  if (platform.adapters.get("financial_shift")) return;
  platform.adapters.register(createFinancialShiftRetentionAdapter(shifts));
}

export function createFinancialShiftRetentionAdapter(
  shifts: FinancialShiftDomainService
): RetentionAdapter {
  return {
    entityType: "financial_shift",
    async resolveEntity(subject: RetentionSubjectRef) {
      const shift = await shifts.get(subject.restaurantId, subject.entityId);
      return shift != null;
    },
    async resolveTimestamps(subject) {
      const shift = await shifts.get(subject.restaurantId, subject.entityId);
      if (!shift) return null;
      return {
        referenceAt: shift.closedAt ?? shift.openedAt,
        archivedAt: shift.archivedAt,
        purgedAt: null,
      };
    },
    async resolveOwner(subject) {
      const shift = await shifts.get(subject.restaurantId, subject.entityId);
      return shift?.restaurantId ?? null;
    },
    async resolveEligibility(subject) {
      const shift = await shifts.get(subject.restaurantId, subject.entityId);
      if (!shift) {
        return { eligibleForRetentionEvaluation: false, reason: "not_found" };
      }
      const terminal = shift.status === "closed" || shift.status === "archived";
      return {
        eligibleForRetentionEvaluation: terminal,
        reason: terminal ? undefined : "shift_not_terminal",
      };
    },
  };
}

export type ShiftArchiveWindowPreset =
  | "today"
  | "last_7"
  | "last_30"
  | "last_90"
  | "custom"
  | "all";

/** Display-window bounds from DRAP policy (default 30 days). */
export function resolveFinancialShiftDisplayWindow(input: {
  restaurantId: number;
  preset: ShiftArchiveWindowPreset;
  customFromIso?: string;
  customToIso?: string;
  nowIso?: string;
}): { fromIso?: string; toIso?: string; displayWindowDays: number } {
  const platform = getFinancialShiftDrapPlatform();
  const { policy } = platform.resolvePolicy({
    entityType: "financial_shift",
    restaurantId: input.restaurantId,
  });
  const now = input.nowIso ? new Date(input.nowIso) : new Date();
  const end = now.toISOString();
  const daysBack = (n: number) => {
    const d = new Date(now.getTime());
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString();
  };

  switch (input.preset) {
    case "today": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      return {
        fromIso: start.toISOString(),
        toIso: end,
        displayWindowDays: policy.displayWindowDays,
      };
    }
    case "last_7":
      return {
        fromIso: daysBack(7),
        toIso: end,
        displayWindowDays: policy.displayWindowDays,
      };
    case "last_30":
      return {
        fromIso: daysBack(policy.displayWindowDays),
        toIso: end,
        displayWindowDays: policy.displayWindowDays,
      };
    case "last_90":
      return {
        fromIso: daysBack(90),
        toIso: end,
        displayWindowDays: policy.displayWindowDays,
      };
    case "custom":
      return {
        fromIso: input.customFromIso,
        toIso: input.customToIso ?? end,
        displayWindowDays: policy.displayWindowDays,
      };
    case "all":
      return { displayWindowDays: policy.displayWindowDays };
    default:
      return {
        fromIso: daysBack(policy.displayWindowDays),
        toIso: end,
        displayWindowDays: policy.displayWindowDays,
      };
  }
}
