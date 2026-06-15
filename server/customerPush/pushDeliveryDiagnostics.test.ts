/**
 * DELIVERY-HARDENING-1 — delivery trace unit tests.
 */

import { describe, expect, it } from "vitest";
import {
  classifySendFailure,
  formatDeliveryTimeline,
  PushDeliveryTrace,
} from "./pushDeliveryDiagnostics";

describe("pushDeliveryDiagnostics DELIVERY-HARDENING-1", () => {
  it("records staged delivery trace with timeline", () => {
    const trace = new PushDeliveryTrace(42, "tok123456789012345");
    trace.setSubscriptionsLoaded(2, 1);
    trace.markClaimAttempt();
    trace.markClaimAcquired("2026-06-11 12:00:00");
    trace.markSendSuccess("2026-06-11 12:00:01");
    trace.markDeliveryComplete();

    const d = trace.getDiagnostics();
    expect(d.orderId).toBe(42);
    expect(d.trackingToken).toBe("tok123456789012345");
    expect(d.subscriptionCount).toBe(2);
    expect(d.expiredSubscriptionCount).toBe(1);
    expect(d.successCount).toBe(1);
    expect(d.failureCount).toBe(0);
    expect(d.lastUsedAt).toBe("2026-06-11 12:00:01");
    expect(d.claimResult).toBe(true);
    expect(d.readyPushSentAt).toBe("2026-06-11 12:00:00");
    expect(d.deliveryTimeline).toContain("delivery_started");
    expect(d.deliveryTimeline).toContain("delivery_complete");
    expect(formatDeliveryTimeline(d.stages)).toBe(d.deliveryTimeline);
  });

  it("marks duplicate send prevention on claim failure", () => {
    const trace = new PushDeliveryTrace(1);
    trace.markClaimAttempt();
    trace.markClaimFailedDuplicate();

    const d = trace.getDiagnostics();
    expect(d.duplicateSendPrevented).toBe(true);
    expect(d.stages).toContain("duplicate_send_prevented");
    expect(d.failureReason).toBe("claim_failed");
  });

  it("classifies endpoint_gone for 404/410", () => {
    expect(classifySendFailure(404)).toBe("endpoint_gone");
    expect(classifySendFailure(410)).toBe("endpoint_gone");
  });

  it("classifies send_rejected for other errors", () => {
    expect(classifySendFailure(500)).toBe("send_rejected");
    expect(classifySendFailure(undefined)).toBe("send_rejected");
  });
});
