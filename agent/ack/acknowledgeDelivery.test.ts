import { describe, expect, it } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import {
  acknowledgeDelivery,
  buildDeliveryAckMessage,
  DeliveryAckError,
  DeliveryAckTracker,
} from "./acknowledgeDelivery";

describe("acknowledgeDelivery THERMAL-PRINTING-6D Phase-2", () => {
  it("builds delivery acknowledgement payload", () => {
    expect(
      buildDeliveryAckMessage({
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
      })
    ).toMatchObject({
      type: AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK,
      agentId: "agent-123",
      jobId: 100,
    });
  });

  it("sends acknowledgement once", () => {
    const sent: string[] = [];
    const tracker = new DeliveryAckTracker();

    const first = acknowledgeDelivery({
      payload: {
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });
    const second = acknowledgeDelivery({
      payload: {
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(sent).toHaveLength(1);
  });

  it("acknowledgement means received only (delivery ack message type)", () => {
    const message = buildDeliveryAckMessage({
      agentId: "agent-123",
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
    });

    expect(message.type).toBe(AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK);
    expect(message.type).not.toBe("agent.print.complete");
  });

  it("rejects invalid acknowledgement payloads", () => {
    expect(() =>
      buildDeliveryAckMessage({
        agentId: "",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
      })
    ).toThrow(DeliveryAckError);
  });
});
