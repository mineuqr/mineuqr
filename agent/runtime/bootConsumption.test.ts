import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { MemoryIdentityStore } from "../identity/identityStore";
import { MemoryAgentJobClient } from "../jobs/jobClient";
import { MockAgentWebSocketClient } from "../transport/websocketClient";
import { bootAgent, createMockAgentRuntime } from "./boot";
import { shutdownAgent } from "./shutdown";

describe("agent boot consumption wiring THERMAL-PRINTING-10A", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("E — wires JobConsumptionService into runtime on boot", async () => {
    const store = new MemoryIdentityStore();
    const jobClient = new MemoryAgentJobClient();
    const { boot } = createMockAgentRuntime({
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows",
      identityStore: store,
      jobClient,
    });

    const runtime = await boot();

    expect(runtime.jobConsumption).toBeDefined();
    expect(runtime.jobClient).toBe(jobClient);
    expect(runtime.lifecycle.getState()).toBe("ready");
  });

  it("routes transport messages to job consumption after boot", async () => {
    const store = new MemoryIdentityStore();
    const jobClient = new MemoryAgentJobClient();
    jobClient.seed({
      jobId: 300,
      restaurantId: 1,
      printerId: 10,
      orderId: 500,
      ticket: {
        orderId: 500,
        restaurantId: 1,
        items: [{ itemName: "Burger", quantity: 1 }],
      },
      executionPlan: {
        platform: "windows",
        contextBuilt: true,
        strategyResolved: true,
        method: "raw-escpos",
      },
    });

    const client = new MockAgentWebSocketClient();
    const runtime = await bootAgent({
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows",
      identityStore: store,
      client,
      jobClient,
    });

    client.simulateIncomingMessage(
      JSON.stringify({
        type: AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED,
        protocolVersion: "1.0",
        agentId: runtime.identity.agentId,
        jobId: 300,
        timestamp: "2026-06-18T10:00:00.000Z",
      })
    );

    await vi.waitFor(() => {
      expect(
        client.sent.some((message) => {
          const parsed = JSON.parse(message) as { type?: string };
          return parsed.type === AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK;
        })
      ).toBe(true);
    });

    await shutdownAgent(runtime);
  });

  it("continues hello registration before consumption wiring", async () => {
    const store = new MemoryIdentityStore();
    const { client, boot } = createMockAgentRuntime({
      serverUrl: "ws://localhost/ws/print-agent",
      agentName: "Kitchen Printer",
      platform: "windows",
      identityStore: store,
    });

    await boot();

    expect(
      client.sent.some((message) => {
        const parsed = JSON.parse(message) as { type?: string };
        return parsed.type === AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO;
      })
    ).toBe(true);
  });
});
