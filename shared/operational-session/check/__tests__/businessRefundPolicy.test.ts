/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — refund policy tests.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUSINESS_REFUND_POLICY,
  evaluateRefundWindow,
  parseBusinessRefundPolicyJson,
  serializeBusinessRefundPolicyJson,
} from "../businessRefundPolicy";

describe("businessRefundPolicy", () => {
  it("defaults to 24h window with refunds enabled", () => {
    expect(DEFAULT_BUSINESS_REFUND_POLICY.windowHours).toBe(24);
    expect(DEFAULT_BUSINESS_REFUND_POLICY.refundEnabled).toBe(true);
    expect(DEFAULT_BUSINESS_REFUND_POLICY.partialRefundAllowed).toBe(true);
  });

  it("parses overrides and serializes round-trip", () => {
    const json = serializeBusinessRefundPolicyJson({
      ...DEFAULT_BUSINESS_REFUND_POLICY,
      windowHours: 12,
      requireReason: true,
    });
    const parsed = parseBusinessRefundPolicyJson(json);
    expect(parsed.windowHours).toBe(12);
    expect(parsed.requireReason).toBe(true);
  });

  it("marks window expired after configured hours", () => {
    const settledAt = "2026-07-25T12:00:00.000Z";
    const now = new Date("2026-07-26T13:00:00.000Z");
    const evaled = evaluateRefundWindow({
      settlementAt: settledAt,
      windowHours: 24,
      now,
    });
    expect(evaled.expired).toBe(true);
    expect(evaled.elapsedMs).toBeGreaterThan(24 * 60 * 60 * 1000);
  });

  it("allows refund inside window", () => {
    const settledAt = "2026-07-26T10:00:00.000Z";
    const now = new Date("2026-07-26T12:00:00.000Z");
    const evaled = evaluateRefundWindow({
      settlementAt: settledAt,
      windowHours: 24,
      now,
    });
    expect(evaled.expired).toBe(false);
    expect(evaled.remainingMs).toBeGreaterThan(0);
  });
});
