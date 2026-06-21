import { describe, expect, it } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { ExecutionPipeline } from "../execution/executionPipeline";
import {
  buildDeliveryConfirmedMessage,
  confirmDelivery,
  DeliveryConfirmationError,
  DeliveryConfirmationTracker,
} from "./confirmDelivery";

function sampleJob(jobId = 100) {
  return {
    jobId,
    restaurantId: 1,
    printerId: 10,
    orderId: 500,
    ticket: {
      orderId: 500,
      restaurantId: 1,
      items: [{ itemName: "Burger", quantity: 1 }],
    },
  };
}

describe("confirmDelivery THERMAL-PRINTING-7B.2", () => {
  it("builds delivery confirmation payload with string jobId", () => {
    expect(
      buildDeliveryConfirmedMessage({
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
      })
    ).toMatchObject({
      type: AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED,
      agentId: "agent-123",
      jobId: "100",
    });
  });

  it("confirms delivery once from prepared state", () => {
    const pipeline = new ExecutionPipeline({
      now: () => new Date("2026-06-18T10:00:00.000Z"),
    });
    pipeline.receive(sampleJob());
    pipeline.validate(100);
    pipeline.prepare(100);

    const sent: string[] = [];
    const tracker = new DeliveryConfirmationTracker();
    const first = confirmDelivery({
      payload: {
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
      pipeline,
    });
    const second = confirmDelivery({
      payload: {
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
      pipeline,
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(sent).toHaveLength(1);
    expect(pipeline.getStore().get(100)?.state).toBe("delivered");
    expect(JSON.parse(sent[0]!).type).toBe(AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED);
  });

  it("does not use print-completion semantics", () => {
    const message = buildDeliveryConfirmedMessage({
      agentId: "agent-123",
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
    });

    expect(message.type).toBe(AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED);
    expect(message.type).not.toBe("agent.print.complete");
  });

  it("rejects confirmation before preparation", () => {
    const pipeline = new ExecutionPipeline();
    pipeline.receive(sampleJob());

    expect(() =>
      confirmDelivery({
        payload: {
          agentId: "agent-123",
          jobId: 100,
          timestamp: "2026-06-18T10:00:00.000Z",
        },
        sender: { send: () => {} },
        tracker: new DeliveryConfirmationTracker(),
        pipeline,
      })
    ).toThrow(DeliveryConfirmationError);
  });
});
