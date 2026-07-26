/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — Business Financial Refund Policy.
 *
 * Configurable restaurant policy (defaults until settings UI / persistence).
 * Presentation and transport evaluate this document — Check Aggregate unchanged.
 */

export const BUSINESS_REFUND_POLICY_VERSION = 1 as const;

export type BusinessRefundPolicy = Readonly<{
  version: typeof BUSINESS_REFUND_POLICY_VERSION;
  /** Master switch — when false, refund lookup/apply are rejected. */
  refundEnabled: boolean;
  /** Hours after settlement settledAt during which refund is allowed. */
  windowHours: number;
  partialRefundAllowed: boolean;
  requireReason: boolean;
  requireManagerApproval: boolean;
}>;

export const DEFAULT_BUSINESS_REFUND_POLICY: BusinessRefundPolicy = Object.freeze({
  version: BUSINESS_REFUND_POLICY_VERSION,
  refundEnabled: true,
  windowHours: 24,
  partialRefundAllowed: true,
  requireReason: false,
  requireManagerApproval: false,
});

export function parseBusinessRefundPolicyJson(
  raw: string | null | undefined
): BusinessRefundPolicy {
  if (raw == null || String(raw).trim() === "") {
    return DEFAULT_BUSINESS_REFUND_POLICY;
  }
  try {
    const parsed = JSON.parse(String(raw)) as Record<string, unknown>;
    const windowHoursRaw = parsed.windowHours;
    const windowHours =
      typeof windowHoursRaw === "number" &&
      Number.isFinite(windowHoursRaw) &&
      windowHoursRaw > 0
        ? Math.min(24 * 365, Math.trunc(windowHoursRaw))
        : DEFAULT_BUSINESS_REFUND_POLICY.windowHours;
    return {
      version: BUSINESS_REFUND_POLICY_VERSION,
      refundEnabled:
        typeof parsed.refundEnabled === "boolean"
          ? parsed.refundEnabled
          : DEFAULT_BUSINESS_REFUND_POLICY.refundEnabled,
      windowHours,
      partialRefundAllowed:
        typeof parsed.partialRefundAllowed === "boolean"
          ? parsed.partialRefundAllowed
          : DEFAULT_BUSINESS_REFUND_POLICY.partialRefundAllowed,
      requireReason:
        typeof parsed.requireReason === "boolean"
          ? parsed.requireReason
          : DEFAULT_BUSINESS_REFUND_POLICY.requireReason,
      requireManagerApproval:
        typeof parsed.requireManagerApproval === "boolean"
          ? parsed.requireManagerApproval
          : DEFAULT_BUSINESS_REFUND_POLICY.requireManagerApproval,
    };
  } catch {
    return DEFAULT_BUSINESS_REFUND_POLICY;
  }
}

export function serializeBusinessRefundPolicyJson(
  policy: BusinessRefundPolicy
): string {
  return JSON.stringify({
    version: BUSINESS_REFUND_POLICY_VERSION,
    refundEnabled: policy.refundEnabled,
    windowHours: policy.windowHours,
    partialRefundAllowed: policy.partialRefundAllowed,
    requireReason: policy.requireReason,
    requireManagerApproval: policy.requireManagerApproval,
  });
}

export type RefundWindowEvaluation = Readonly<{
  windowHours: number;
  settlementAt: string;
  now: string;
  elapsedMs: number;
  windowMs: number;
  expired: boolean;
  remainingMs: number;
}>;

/**
 * Evaluate refund window against settlement timestamp (RFC3339 / ISO).
 */
export function evaluateRefundWindow(input: {
  settlementAt: string | null | undefined;
  windowHours: number;
  now?: Date;
}): RefundWindowEvaluation {
  const now = input.now ?? new Date();
  const windowHours =
    Number.isFinite(input.windowHours) && input.windowHours > 0
      ? input.windowHours
      : DEFAULT_BUSINESS_REFUND_POLICY.windowHours;
  const windowMs = windowHours * 60 * 60 * 1000;
  const settled = input.settlementAt
    ? new Date(input.settlementAt)
    : new Date(NaN);
  const settlementMs = settled.getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(settlementMs)) {
    return {
      windowHours,
      settlementAt: input.settlementAt ?? "",
      now: now.toISOString(),
      elapsedMs: Number.POSITIVE_INFINITY,
      windowMs,
      expired: true,
      remainingMs: 0,
    };
  }
  const elapsedMs = Math.max(0, nowMs - settlementMs);
  const remainingMs = Math.max(0, windowMs - elapsedMs);
  return {
    windowHours,
    settlementAt: settled.toISOString(),
    now: now.toISOString(),
    elapsedMs,
    windowMs,
    expired: elapsedMs > windowMs,
    remainingMs,
  };
}

export const REFUND_WINDOW_EXPIRED_CODE = "REFUND_WINDOW_EXPIRED" as const;
export const REFUND_POLICY_DISABLED_CODE = "REFUND_POLICY_DISABLED" as const;
