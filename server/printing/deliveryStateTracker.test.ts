import { beforeEach, describe, expect, it } from "vitest";
import {
  clearJobDeliveryStates,
  getJobDeliveryState,
  markJobDeliveryAcknowledged,
  markJobDeliveryConfirmed,
} from "./deliveryStateTracker";

describe("deliveryStateTracker THERMAL-PRINTING-7B.4", () => {
  beforeEach(() => {
    clearJobDeliveryStates();
  });

  it("allows acknowledged → delivered", () => {
    markJobDeliveryAcknowledged({
      jobId: 100,
      agentId: "agent-alpha",
      timestamp: "2026-06-18T10:00:00.000Z",
    });

    const result = markJobDeliveryConfirmed({
      jobId: 100,
      agentId: "agent-alpha",
      timestamp: "2026-06-18T10:00:01.000Z",
    });

    expect(result.accepted).toBe(true);
    if (result.accepted) {
      expect(result.duplicate).toBe(false);
      expect(result.record.state).toBe("delivered");
    }
  });

  it("rejects unknown → delivered", () => {
    const result = markJobDeliveryConfirmed({
      jobId: 100,
      agentId: "agent-alpha",
      timestamp: "2026-06-18T10:00:00.000Z",
    });

    expect(result).toEqual({
      accepted: false,
      reason: "Delivery must be acknowledged before confirmation",
    });
  });

  it("handles duplicate delivery confirmation idempotently", () => {
    markJobDeliveryAcknowledged({
      jobId: 100,
      agentId: "agent-alpha",
      timestamp: "2026-06-18T10:00:00.000Z",
    });

    const first = markJobDeliveryConfirmed({
      jobId: 100,
      agentId: "agent-alpha",
      timestamp: "2026-06-18T10:00:01.000Z",
    });
    const second = markJobDeliveryConfirmed({
      jobId: 100,
      agentId: "agent-alpha",
      timestamp: "2026-06-18T10:00:02.000Z",
    });

    expect(first.accepted).toBe(true);
    expect(second).toMatchObject({ accepted: true, duplicate: true });
    expect(getJobDeliveryState("agent-alpha", 100)?.deliveredAt).toBe(
      "2026-06-18T10:00:01.000Z"
    );
  });
});
