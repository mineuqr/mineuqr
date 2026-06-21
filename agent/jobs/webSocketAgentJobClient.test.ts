import { describe, expect, it } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { serializeJobFetchResponse } from "./jobWireResponse";
import {
  MemoryAgentJobClient,
  WebSocketAgentJobClient,
} from "./jobClient";
import { MockAgentWebSocketClient } from "../transport/websocketClient";

describe("WebSocketAgentJobClient THERMAL-PRINTING-10A", () => {
  it("F — production job client parses executionPlan from fetch responses", async () => {
    const transport = new MockAgentWebSocketClient();
    await transport.connect("ws://localhost/ws/print-agent");
    const client = new WebSocketAgentJobClient({
      agentId: "agent-123",
      sender: transport,
      createRequestId: () => "req-10a",
    });

    const fetchPromise = client.fetchPrintJob({ agentId: "agent-123", jobId: 100 });

    expect(transport.sent).toHaveLength(1);
    const request = JSON.parse(transport.sent[0]!);
    expect(request.type).toBe(AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_REQUEST);
    expect(request.requestId).toBe("req-10a");

    client.handleTransportMessage(
      serializeJobFetchResponse({
        requestId: "req-10a",
        found: true,
        job: {
          jobId: 100,
          restaurantId: 7,
          printerId: 10,
          orderId: 500,
          ticket: {
            orderId: 500,
            restaurantId: 7,
            items: [{ itemName: "Burger", quantity: 1 }],
          },
        },
        executionPlan: {
          platform: "windows",
          contextBuilt: true,
          strategyResolved: true,
          method: "raw-escpos",
        },
      })
    );

    const job = await fetchPromise;
    expect(job?.executionPlan?.method).toBe("raw-escpos");
    expect(job?.jobId).toBe(100);
  });

  it("returns null when server reports job not found", async () => {
    const transport = new MockAgentWebSocketClient();
    await transport.connect("ws://localhost/ws/print-agent");
    const client = new WebSocketAgentJobClient({
      agentId: "agent-123",
      sender: transport,
      createRequestId: () => "req-missing",
    });

    const fetchPromise = client.fetchPrintJob({ agentId: "agent-123", jobId: 999 });

    client.handleTransportMessage(
      serializeJobFetchResponse({
        requestId: "req-missing",
        found: false,
        error: "Print job not found",
      })
    );

    await expect(fetchPromise).resolves.toBeNull();
  });

  it("MemoryAgentJobClient remains available for tests", async () => {
    const memory = new MemoryAgentJobClient();
    memory.seed({
      jobId: 1,
      restaurantId: 1,
      printerId: 1,
      orderId: 1,
      ticket: { orderId: 1, restaurantId: 1, items: [{ itemName: "Tea", quantity: 1 }] },
    });

    const job = await memory.fetchPrintJob({ agentId: "agent-123", jobId: 1 });
    expect(job?.jobId).toBe(1);
  });
});
