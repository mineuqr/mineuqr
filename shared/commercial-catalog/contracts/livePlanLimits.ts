/**
 * COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1
 * Canonical Live Plan limit keys and validation. Unlimited = null.
 */

export const LIVE_PLAN_LIMIT_KEYS = ["restaurants", "categories", "items"] as const;
export type LivePlanLimitKey = (typeof LIVE_PLAN_LIMIT_KEYS)[number];

/** POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 — quantity limit, not a capability. */
export const POS_TERMINALS_LIMIT_KEY = "posTerminals" as const;
export type PosTerminalsLimitKey = typeof POS_TERMINALS_LIMIT_KEY;

export type RecognizedLivePlanLimitKey = LivePlanLimitKey | PosTerminalsLimitKey;

export type LivePlanLimitInput = {
  limitKey: string;
  value: number | null;
};

export type LivePlanLimitIssue = {
  code: string;
  message: string;
  field?: string;
};

export function isLivePlanLimitKey(key: string): key is LivePlanLimitKey {
  return (LIVE_PLAN_LIMIT_KEYS as readonly string[]).includes(key);
}

export function isRecognizedLivePlanLimitKey(
  key: string
): key is RecognizedLivePlanLimitKey {
  return isLivePlanLimitKey(key) || key === POS_TERMINALS_LIMIT_KEY;
}

export function validateLivePlanLimitValues(
  values: LivePlanLimitInput[]
): { ok: boolean; issues: LivePlanLimitIssue[]; normalized: LivePlanLimitInput[] } {
  const issues: LivePlanLimitIssue[] = [];
  const byKey = new Map<string, number | null>();

  for (const row of values) {
    if (!isRecognizedLivePlanLimitKey(row.limitKey)) {
      issues.push({
        code: "unknown_limit_key",
        message: `Unknown Live Plan limit key: ${row.limitKey}`,
        field: row.limitKey,
      });
      continue;
    }
    if (row.value === null) {
      byKey.set(row.limitKey, null);
      continue;
    }
    if (
      typeof row.value !== "number" ||
      !Number.isFinite(row.value) ||
      !Number.isInteger(row.value) ||
      row.value < 0
    ) {
      issues.push({
        code: "invalid_limit_value",
        message: `Limit ${row.limitKey} must be a non-negative integer or unlimited (null)`,
        field: row.limitKey,
      });
      continue;
    }
    byKey.set(row.limitKey, row.value);
  }

  for (const key of LIVE_PLAN_LIMIT_KEYS) {
    if (!byKey.has(key)) {
      issues.push({
        code: "missing_limit_key",
        message: `Live Plan limit ${key} is required`,
        field: key,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    normalized: (
      [
        ...LIVE_PLAN_LIMIT_KEYS,
        ...(byKey.has(POS_TERMINALS_LIMIT_KEY) ? [POS_TERMINALS_LIMIT_KEY] : []),
      ] as const
    )
      .filter((k) => byKey.has(k))
      .map((limitKey) => ({
        limitKey,
        value: byKey.get(limitKey) ?? null,
      })),
  };
}
