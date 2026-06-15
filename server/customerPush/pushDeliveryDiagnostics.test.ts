/**
 * PUSH-DELIVERY-VALIDATION-1 — delivery trace unit tests.
 */

import { describe, expect, it } from "vitest";
import {
  classifySendFailure,
  PushDeliveryTrace,
} from "./pushDeliveryDiagnostics";

describe("pushDeliveryDiagnostics", () => {
  it("records staged delivery trace", () => {
    const trace = new PushDeliveryTrace(42);
    trace.setSubscriptionsLoaded(2);
    trace.markClaimAttempt();
    trace.markClaimAcquired("2026-06-11 12:00:00");
    trace.markSendSuccess();
    trace.markDeliveryComplete();

    const d = trace.getDiagnostics();
    expect(d.orderId).toBe(42);
    expect(d.subscriptionCount).toBe(2);
    expect(d.successfulSends).toBe(1);
    expect(d.claimResult).toBe(true);
    expect(d.readyPushSentAt).toBe("2026-06-11 12:00:00");
    expect(d.stages).toContain("delivery_started");
    expect(d.stages).toContain("subscriptions_loaded");
    expect(d.stages).toContain("claim_acquired");
    expect(d.stages).toContain("ready_push_marked");
    expect(d.lastStage).toBe("delivery_complete");
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
