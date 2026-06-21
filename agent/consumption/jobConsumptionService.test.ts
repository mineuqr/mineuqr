import { describe, expect, it } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES } from "../../shared/printing/platformCapabilities";
import { AGENT_PRINTER_PROFILE_MESSAGE_TYPES } from "../../shared/printing/printerProfiles";
import { DeliveryAckTracker } from "../ack/acknowledgeDelivery";
import { DeliveryConfirmationTracker } from "../delivery/confirmDelivery";
import { JobConsumptionService } from "./jobConsumptionService";
import { MemoryAgentJobClient } from "../jobs/jobClient";
import { serializeJobAssignedNotification } from "../jobs/jobWire";
import { ExecutionPipeline } from "../execution/executionPipeline";

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

describe("jobConsumptionService THERMAL-PRINTING-6D Phase-2", () => {
  it("consumes assigned jobs through notification → fetch → prepare → ack", async () => {
    const client = new MemoryAgentJobClient();
    client.seed(sampleJob());

    const sent: string[] = [];
    const service = new JobConsumptionService({
      agentId: "agent-123",
      jobClient: client,
      ackSender: { send: (data) => sent.push(data) },
      now: () => new Date("2026-06-18T10:00:00.000Z"),
    });

    const result = await service.consumeAssignedJob({
      agentId: "agent-123",
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
      protocolVersion: "1.0",
    });

    expect(result.localState).toBe("delivered");
    expect(result.acknowledged).toBe(true);
    expect(result.confirmed).toBe(true);
    expect(JSON.parse(sent[0]!).type).toBe(AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK);
    expect(JSON.parse(sent[1]!).type).toBe(AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED);
  });

  it("processes transport notifications via authoritative fetch", async () => {
    const client = new MemoryAgentJobClient();
    client.seed(sampleJob(200));

    const sent: string[] = [];
    const service = new JobConsumptionService({
      agentId: "agent-123",
      jobClient: client,
      ackSender: { send: (data) => sent.push(data) },
      now: () => new Date("2026-06-18T10:00:00.000Z"),
    });

    service.handleTransportMessage(
      serializeJobAssignedNotification({
        agentId: "agent-123",
        jobId: 200,
        timestamp: "2026-06-18T10:00:00.000Z",
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sent).toHaveLength(2);
    expect(JSON.parse(sent[0]!).jobId).toBe(200);
  });

  it("prevents duplicate acknowledgements", async () => {
    const client = new MemoryAgentJobClient();
    client.seed(sampleJob());

    const tracker = new DeliveryAckTracker();
    const confirmationTracker = new DeliveryConfirmationTracker();
    const sent: string[] = [];
    const service = new JobConsumptionService({
      agentId: "agent-123",
      jobClient: client,
      ackSender: { send: (data) => sent.push(data) },
      ackTracker: tracker,
      confirmationTracker,
      pipeline: new ExecutionPipeline(),
    });

    await service.consumeAssignedJob({
      agentId: "agent-123",
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
      protocolVersion: "1.0",
    });

    const second = await service.consumeAssignedJob({
      agentId: "agent-123",
      jobId: 100,
      timestamp: "2026-06-18T10:00:01.000Z",
      protocolVersion: "1.0",
    });

    expect(second.acknowledged).toBe(false);
    expect(second.confirmed).toBe(false);
    expect(sent).toHaveLength(2);
  });

  it("passes through runtime execution plans from authoritative fetch", async () => {
    const client = new MemoryAgentJobClient();
    client.seed({
      ...sampleJob(),
      executionPlan: {
        platform: "windows",
        contextBuilt: true,
        strategyResolved: true,
        method: "raw-escpos",
      },
    });

    const service = new JobConsumptionService({
      agentId: "agent-123",
      jobClient: client,
      ackSender: { send: () => {} },
      now: () => new Date("2026-06-18T10:00:00.000Z"),
    });

    const result = await service.consumeAssignedJob({
      agentId: "agent-123",
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
      protocolVersion: "1.0",
    });

    expect(result.executionPlan?.method).toBe("raw-escpos");
  });
});
