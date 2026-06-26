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
  TEST_RESTAURANT_ID,
} from "./printingTestHelpers";
import { clearAgentRestaurantProjectionCache } from "./endpointRegistryCompatibility";
import {
  clearExecutionOutcomeStore,
  getStoredJobExecutionOutcome,
} from "./executionOutcomeStore";
import { recordExecutionOutcomeReport } from "./executionOutcomeService";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  findPrinterById: vi.fn(),
  markJobAssigned: vi.fn(),
  markJobPrinting: vi.fn(),
  markJobPrinted: vi.fn(),
  markJobFailed: vi.fn(),
}));

const attemptMocks = vi.hoisted(() => ({
  insertPrintAttempt: vi.fn(),
}));

let mutableJobState: SelectPrintJob;

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  markJobAssigned: (...args: unknown[]) => repoMocks.markJobAssigned(...args),
  markJobPrinting: (...args: unknown[]) => repoMocks.markJobPrinting(...args),
  markJobPrinted: (...args: unknown[]) => repoMocks.markJobPrinted(...args),
  markJobFailed: (...args: unknown[]) => repoMocks.markJobFailed(...args),
}));

vi.mock("./printJobAttemptRepository", () => ({
  insertPrintAttempt: (...args: unknown[]) => attemptMocks.insertPrintAttempt(...args),
}));

vi.mock("./printerRepository", () => ({
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
}));

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 7,
  orderId: 500,
  printerId: TEST_DB_PRINTER_ID,
  stationId: null,
  assignedAgentId: null,
  assignedAt: null,
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

function setupMutableJobRepository(): void {
  repoMocks.findPrintJobById.mockImplementation(async () => mutableJobState);
  repoMocks.markJobAssigned.mockImplementation(async (_jobId, agentId) => {
    mutableJobState = {
      ...mutableJobState,
      status: PRINT_JOB_STATUS.ASSIGNED,
      assignedAgentId: agentId,
      assignedAt: "2026-06-18T12:01:00.000Z",
    };
    return mutableJobState;
  });
  repoMocks.markJobPrinting.mockImplementation(async () => {
    mutableJobState = {
      ...mutableJobState,
      status: PRINT_JOB_STATUS.PRINTING,
      attemptCount: mutableJobState.attemptCount + 1,
    };
    return mutableJobState;
  });
  repoMocks.markJobPrinted.mockImplementation(async () => {
    mutableJobState = { ...mutableJobState, status: PRINT_JOB_STATUS.PRINTED };
    return mutableJobState;
  });
  repoMocks.markJobFailed.mockImplementation(async () => {
    mutableJobState = { ...mutableJobState, status: PRINT_JOB_STATUS.FAILED };
    return mutableJobState;
  });
  attemptMocks.insertPrintAttempt.mockResolvedValue(1);
  mutableJobState = { ...baseJob };
}

describe("executionOutcomeReporting THERMAL-PRINTING-10C / 13I.3C.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentRestaurantProjectionCache();
    clearPrintJobAssignments();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearExecutionOutcomeStore();
    setupMutableJobRepository();
    repoMocks.findPrinterById.mockResolvedValue({
      id: TEST_DB_PRINTER_ID,
      restaurantId: TEST_RESTAURANT_ID,
      name: "Kitchen",
      paperWidthMm: 80,
      profileId: "kitchen-printer-10",
      isDefault: true,
      createdAt: "2026-06-18 12:00:00",
      updatedAt: "2026-06-18 12:00:00",
    });
  });

  it("K — server records execution success reports and marks job printed", async () => {
    registerOnlineAgent("agent-alpha");
    await assignPrintJob({ jobId: 100 });
    mutableJobState = { ...mutableJobState, status: PRINT_JOB_STATUS.PRINTING };

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
    expect(mutableJobState.status).toBe(PRINT_JOB_STATUS.PRINTED);
  });

  it("records transport failure and marks job failed", async () => {
    registerOnlineAgent("agent-alpha");
    await assignPrintJob({ jobId: 100 });
    mutableJobState = { ...mutableJobState, status: PRINT_JOB_STATUS.PRINTING };

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
    expect(mutableJobState.status).toBe(PRINT_JOB_STATUS.FAILED);

    mutableJobState = { ...mutableJobState, status: PRINT_JOB_STATUS.PRINTING };

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
    expect(mutableJobState.status).toBe(PRINT_JOB_STATUS.FAILED);
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
