import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { AGENT_PROTOCOL_STATUS_MESSAGE_TYPES } from "../../shared/printing/agentProtocolStatusMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { recordAgentStatusReport } from "./agentStatusService";
import { handleAgentWebSocketInboundMessage } from "./agentWebSocketInboundHandler";
import { assignPrintJob, clearPrintJobAssignments } from "./assignmentService";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import { recordJobStatusReport } from "./jobStatusService";
import {
  clearProtocolStatusStore,
  getStoredAgentProtocolStatus,
  getStoredJobProtocolStatus,
} from "./protocolStatusStore";
import {
  getAgentProtocolStatus,
  getJobProtocolStatus,
} from "./protocolStatusQueries";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  markJobPrinted: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  markJobPrinted: (...args: unknown[]) => repoMocks.markJobPrinted(...args),
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

describe("protocolStatusReporting THERMAL-PRINTING-7E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrintJobAssignments();
    clearProtocolStatusStore();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
    repoMocks.markJobPrinted.mockResolvedValue(null);
  });

  describe("Scenario A — agent ready", () => {
    it("accepts agent status reports and exposes latest status via query", () => {
      registerOnlineAgent("agent-alpha");

      const result = recordAgentStatusReport({
        agentId: "agent-alpha",
        state: "ready",
        timestamp: "2026-06-18T10:00:00.000Z",
      });

      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.record.state).toBe("ready");
      }
      expect(getAgentProtocolStatus("agent-alpha")?.state).toBe("ready");
    });
  });

  describe("Scenario B — job delivered", () => {
    it("accepts job status reports for assigned jobs", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });

      const result = await recordJobStatusReport({
        agentId: "agent-alpha",
        jobId: 100,
        state: "delivered",
        timestamp: "2026-06-18T10:00:01.000Z",
      });

      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.record.state).toBe("delivered");
      }
      expect(getJobProtocolStatus(100)?.state).toBe("delivered");
      expect(repoMocks.markJobPrinted).not.toHaveBeenCalled();
    });
  });

  describe("Scenario C — unknown agent", () => {
    it("rejects agent and job status reports from unregistered agents", async () => {
      const agentResult = recordAgentStatusReport({
        agentId: "unknown-agent",
        state: "ready",
        timestamp: "2026-06-18T10:00:00.000Z",
      });
      const jobResult = await recordJobStatusReport({
        agentId: "unknown-agent",
        jobId: 100,
        state: "prepared",
        timestamp: "2026-06-18T10:00:00.000Z",
      });

      expect(agentResult).toEqual({ accepted: false, reason: "Agent not registered" });
      expect(jobResult).toEqual({ accepted: false, reason: "Agent not registered" });
    });
  });

  describe("Scenario D — unknown job", () => {
    it("rejects job status reports for missing jobs", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });
      repoMocks.findPrintJobById.mockResolvedValue(null);

      const result = await recordJobStatusReport({
        agentId: "agent-alpha",
        jobId: 100,
        state: "prepared",
        timestamp: "2026-06-18T10:00:00.000Z",
      });

      expect(result).toEqual({ accepted: false, reason: "Print job not found" });
    });
  });

  describe("Scenario E — latest status wins", () => {
    it("updates stored agent status to the latest report", () => {
      registerOnlineAgent("agent-alpha");

      recordAgentStatusReport({
        agentId: "agent-alpha",
        state: "ready",
        timestamp: "2026-06-18T10:00:00.000Z",
      });
      recordAgentStatusReport({
        agentId: "agent-alpha",
        state: "offline",
        timestamp: "2026-06-18T10:00:02.000Z",
      });

      expect(getStoredAgentProtocolStatus("agent-alpha")).toMatchObject({
        state: "offline",
        timestamp: "2026-06-18T10:00:02.000Z",
      });
    });
  });

  describe("Scenario F — duplicate report", () => {
    it("accepts duplicate reports idempotently without changing stored state", () => {
      registerOnlineAgent("agent-alpha");

      const first = recordAgentStatusReport({
        agentId: "agent-alpha",
        state: "ready",
        timestamp: "2026-06-18T10:00:00.000Z",
      });
      const second = recordAgentStatusReport({
        agentId: "agent-alpha",
        state: "ready",
        timestamp: "2026-06-18T10:00:00.000Z",
      });

      expect(first.accepted).toBe(true);
      expect(second).toMatchObject({ accepted: true, duplicate: true });
      expect(getAgentProtocolStatus("agent-alpha")?.timestamp).toBe(
        "2026-06-18T10:00:00.000Z"
      );
    });
  });

  it("routes status reports through WebSocket inbound handler", async () => {
    registerOnlineAgent("agent-alpha");
    await assignPrintJob({ jobId: 100 });

    const connection = {
      readyState: 1,
      send() {},
      close() {},
    };

    await handleAgentWebSocketInboundMessage(
      JSON.stringify({
        type: AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.AGENT_STATUS_REPORT,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        state: "ready",
      }),
      connection
    );

    await handleAgentWebSocketInboundMessage(
      JSON.stringify({
        type: AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.JOB_STATUS_REPORT,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: "agent-alpha",
        jobId: "100",
        timestamp: "2026-06-18T10:00:01.000Z",
        state: "delivered",
      }),
      connection
    );

    expect(getStoredAgentProtocolStatus("agent-alpha")?.state).toBe("ready");
    expect(getStoredJobProtocolStatus(100)?.state).toBe("delivered");
  });
});
