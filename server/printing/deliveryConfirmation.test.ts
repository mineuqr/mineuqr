import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { handleAgentWebSocketInboundMessage } from "./agentWebSocketInboundHandler";
import {
  assignPrintJob,
  clearPrintJobAssignments,
} from "./assignmentService";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import {
  clearDeliveryAcks,
  recordDeliveryAcknowledgement,
} from "./deliveryAckService";
import { recordDeliveryConfirmation } from "./deliveryConfirmationService";
import { processAgentDeliveryConfirmation } from "./deliveryConfirmationFlow";
import {
  clearJobDeliveryStates,
  getJobDeliveryState,
} from "./deliveryStateTracker";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  markJobPrinted: vi.fn(),
}));

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  markJobPrinted: (...args: unknown[]) => repoMocks.markJobPrinted(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 7,
  orderId: 500,
  printerId: 10,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:500:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function registerOnlineAgent(agentId: string): void {
  registerAgent({
    identity: {
      agentId,
      platform: "windows",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: new Date().toISOString(),
  });
}

async function acknowledgeJob(agentId: string, jobId = 100): Promise<void> {
  await recordDeliveryAcknowledgement({
    agentId,
    jobId,
    timestamp: "2026-06-18T10:00:00.000Z",
  });
}

describe("deliveryConfirmation THERMAL-PRINTING-7B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrintJobAssignments();
    clearDeliveryAcks();
    clearJobDeliveryStates();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
    repoMocks.markJobPrinted.mockResolvedValue(null);
  });

  describe("Scenario A — prepared → confirmed → delivered", () => {
    it("records delivered state after acknowledged delivery confirmation", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });
      await acknowledgeJob("agent-alpha");

      const result = await processAgentDeliveryConfirmation({
        agentId: "agent-alpha",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      });

      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.duplicate).toBe(false);
        expect(result.record.state).toBe("delivered");
      }
      expect(getJobDeliveryState("agent-alpha", 100)?.state).toBe("delivered");
      expect(repoMocks.markJobPrinted).not.toHaveBeenCalled();
      expect(baseJob.status).toBe(PRINT_JOB_STATUS.QUEUED);
    });
  });

  describe("Scenario B — duplicate confirmation", () => {
    it("accepts duplicate confirmations idempotently", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });
      await acknowledgeJob("agent-alpha");

      const first = await recordDeliveryConfirmation({
        agentId: "agent-alpha",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      });
      const second = await recordDeliveryConfirmation({
        agentId: "agent-alpha",
        jobId: 100,
        timestamp: "2026-06-18T10:00:02.000Z",
      });

      expect(first).toMatchObject({ accepted: true, duplicate: false });
      expect(second).toMatchObject({ accepted: true, duplicate: true });
    });
  });

  describe("Scenario C — unknown agent", () => {
    it("rejects confirmation from unregistered agents", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });
      await acknowledgeJob("agent-alpha");

      const result = await recordDeliveryConfirmation({
        agentId: "unknown-agent",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      });

      expect(result).toEqual({ accepted: false, reason: "Agent not registered" });
    });
  });

  describe("Scenario D — unknown job", () => {
    it("rejects confirmation for missing jobs", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });
      await acknowledgeJob("agent-alpha");
      repoMocks.findPrintJobById.mockResolvedValue(null);

      const result = await recordDeliveryConfirmation({
        agentId: "agent-alpha",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      });

      expect(result).toEqual({ accepted: false, reason: "Print job not found" });
    });
  });

  describe("Scenario E — invalid state transition", () => {
    it("rejects confirmation before delivery acknowledgement", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });

      const result = await recordDeliveryConfirmation({
        agentId: "agent-alpha",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      });

      expect(result).toEqual({
        accepted: false,
        reason: "Delivery must be acknowledged before confirmation",
      });
    });
  });

  describe("Scenario F — confirmation must not mark printed", () => {
    it("updates delivery state only and leaves queue status unchanged", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });
      await acknowledgeJob("agent-alpha");

      await processAgentDeliveryConfirmation({
        agentId: "agent-alpha",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      });

      expect(repoMocks.markJobPrinted).not.toHaveBeenCalled();
      expect(baseJob.status).toBe(PRINT_JOB_STATUS.QUEUED);
      expect(getJobDeliveryState("agent-alpha", 100)?.state).toBe("delivered");
    });
  });

  it("routes delivery.confirmed WebSocket messages through confirmation flow", async () => {
    registerOnlineAgent("agent-alpha");
    await assignPrintJob({ jobId: 100 });
    await acknowledgeJob("agent-alpha");

    const sent: string[] = [];
    const connection = {
      sent,
      readyState: 1,
      send(data: string) {
        sent.push(data);
      },
      close() {},
    };

    await handleAgentWebSocketInboundMessage(
      JSON.stringify({
        type: AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: "agent-alpha",
        jobId: "100",
        timestamp: "2026-06-18T10:00:01.000Z",
      }),
      connection
    );

    expect(getJobDeliveryState("agent-alpha", 100)?.state).toBe("delivered");
  });
});
