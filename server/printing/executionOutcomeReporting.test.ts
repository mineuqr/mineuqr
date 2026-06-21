import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import {
  AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES,
} from "../../shared/printing/executionOutcomeMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { handleAgentWebSocketInboundMessage } from "./agentWebSocketInboundHandler";
import { assignPrintJob, clearPrintJobAssignments } from "./assignmentService";
import { clearAgentRegistry } from "./agentRegistry";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState } from "./routingEngine";
import {
  registerOnlineAgent as registerOnlineAgentWithResolution,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
} from "./printingTestHelpers";
import {
  clearExecutionOutcomeStore,
  getStoredJobExecutionOutcome,
} from "./executionOutcomeStore";
import { recordExecutionOutcomeReport } from "./executionOutcomeService";

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
  printerId: TEST_DB_PRINTER_ID,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:500:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function registerOnlineAgent(agentId: string): void {
  registerOnlineAgentWithResolution(agentId);
  seedPrinterResolution({ agentId });
}

describe("executionOutcomeReporting THERMAL-PRINTING-10C", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrintJobAssignments();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearExecutionOutcomeStore();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
  });

  it("K — server records execution success reports from agent WebSocket", async () => {
    registerOnlineAgent("agent-alpha");
    await assignPrintJob({ jobId: 100 });

    const message = JSON.stringify({
      type: AGENT_EXECUTION_OUTCOME_MESSAGE_TYPES.EXECUTION_OUTCOME_REPORT,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      agentId: "agent-alpha",
      jobId: "100",
      timestamp: "2026-06-18T10:00:00.000Z",
      outcomeStatus: "executed",
      category: "execution-success",
      transport: "network",
    });

    await handleAgentWebSocketInboundMessage(message, {
      send: () => {},
    });

    const stored = getStoredJobExecutionOutcome(100);
    expect(stored).toMatchObject({
      jobId: 100,
      agentId: "agent-alpha",
      outcomeStatus: "executed",
      category: "execution-success",
      transport: "network",
    });
  });

  it("records transport failure and printer unreachable categories", async () => {
    registerOnlineAgent("agent-alpha");
    await assignPrintJob({ jobId: 100 });

    const unreachable = await recordExecutionOutcomeReport({
      agentId: "agent-alpha",
      jobId: 100,
      timestamp: "2026-06-18T10:00:01.000Z",
      outcomeStatus: "failed",
      category: "printer-unreachable",
      transport: "network",
      message: "TCP connection timed out after 5000ms",
    });
    expect(unreachable.accepted).toBe(true);

    const transportFailure = await recordExecutionOutcomeReport({
      agentId: "agent-alpha",
      jobId: 100,
      timestamp: "2026-06-18T10:00:02.000Z",
      outcomeStatus: "failed",
      category: "transport-failure",
      transport: "usb",
      message: "USB transport endpoint is required",
    });
    expect(transportFailure.accepted).toBe(true);
    expect(getStoredJobExecutionOutcome(100)?.category).toBe("transport-failure");
  });

  it("rejects execution outcome reports for unassigned jobs", async () => {
    registerOnlineAgent("agent-alpha");

    const result = await recordExecutionOutcomeReport({
      agentId: "agent-alpha",
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
      outcomeStatus: "failed",
      category: "execution-failure",
    });

    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe("Print job assignment not found");
    }
  });
});
