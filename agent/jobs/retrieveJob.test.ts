import { describe, expect, it } from "vitest";
import { MemoryAgentJobClient } from "./jobClient";
import { JobRetrievalError, retrieveAuthoritativePrintJob } from "./retrieveJob";

function sampleJob(overrides: Partial<{ jobId: number; printerId: number }> = {}) {
  return {
    jobId: overrides.jobId ?? 100,
    restaurantId: 1,
    printerId: overrides.printerId ?? 10,
    orderId: 500,
    ticket: {
      orderId: 500,
      restaurantId: 1,
      items: [{ itemName: "Burger", quantity: 2 }],
    },
  };
}

describe("retrieveJob THERMAL-PRINTING-6D Phase-2", () => {
  it("retrieves authoritative jobs by jobId", async () => {
    const client = new MemoryAgentJobClient();
    client.seed(sampleJob());

    const job = await retrieveAuthoritativePrintJob(client, {
      agentId: "agent-123",
      jobId: 100,
    });

    expect(job.jobId).toBe(100);
    expect(job.ticket.items[0]?.itemName).toBe("Burger");
  });

  it("handles missing jobs", async () => {
    const client = new MemoryAgentJobClient();

    await expect(
      retrieveAuthoritativePrintJob(client, { agentId: "agent-123", jobId: 999 })
    ).rejects.toThrow(JobRetrievalError);
  });

  it("rejects malformed jobs from authoritative fetch", async () => {
    const client = new MemoryAgentJobClient();
    client.seed({
      ...sampleJob(),
      ticket: { orderId: 500, restaurantId: 1, items: [] },
    });

    await expect(
      retrieveAuthoritativePrintJob(client, { agentId: "agent-123", jobId: 100 })
    ).rejects.toThrow(JobRetrievalError);
  });

  it("rejects jobs without printerId", async () => {
    const client = new MemoryAgentJobClient();
    client.seed(sampleJob({ printerId: 0 }));

    await expect(
      retrieveAuthoritativePrintJob(client, { agentId: "agent-123", jobId: 100 })
    ).rejects.toThrow(JobRetrievalError);
  });
});
