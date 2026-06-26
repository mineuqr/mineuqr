import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import {
  assignPrintJob,
  clearPrintJobAssignments,
  getPrintJobAssignment,
} from "./assignmentService";
import { NoEligibleAgentError, PrintJobAssignmentError } from "./assignmentTypes";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState } from "./routingEngine";
import {
  registerOnlineAgent,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
} from "./printingTestHelpers";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
}));

const executionStateMocks = vi.hoisted(() => ({
  transitionPrintJobExecutionState: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
}));

vi.mock("./printJobExecutionState", () => ({
  PRINT_JOB_EXECUTION_TRANSITION: {
    ASSIGN: "assign",
    START_EXECUTION: "start_execution",
    COMPLETE_SUCCESS: "complete_success",
    COMPLETE_FAILURE: "complete_failure",
  },
  transitionPrintJobExecutionState: (...args: unknown[]) =>
    executionStateMocks.transitionPrintJobExecutionState(...args),
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

describe("assignmentService THERMAL-PRINTING-7A.1 / 8A.4 / 8B.4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrintJobAssignments();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
    executionStateMocks.transitionPrintJobExecutionState.mockImplementation(
      async ({ jobId, agentId }: { jobId: number; agentId?: string }) => ({
        applied: true,
        duplicate: false,
        job: {
          ...baseJob,
          status: PRINT_JOB_STATUS.ASSIGNED,
          assignedAgentId: agentId ?? "agent-alpha",
          assignedAt: "2026-06-18 12:01:00",
        },
        fromStatus: PRINT_JOB_STATUS.QUEUED,
        toStatus: PRINT_JOB_STATUS.ASSIGNED,
      })
    );
  });

  it("assigns queued jobs via routing to the resolved printer owner", async () => {
    registerOnlineAgent("agent-alpha");
    registerOnlineAgent("agent-zulu");
    seedPrinterResolution({ agentId: "agent-alpha" });

    const result = await assignPrintJob({ jobId: 100 });

    expect(result.created).toBe(true);
    expect(result.assignment.agentId).toBe("agent-alpha");
    expect(getPrintJobAssignment(100)).toEqual(result.assignment);
  });

  it("reuses existing assignments idempotently", async () => {
    registerOnlineAgent("agent-alpha");
    seedPrinterResolution({ agentId: "agent-alpha" });

    const first = await assignPrintJob({ jobId: 100 });
    const second = await assignPrintJob({ jobId: 100 });

    expect(second.created).toBe(false);
    expect(second.assignment).toEqual(first.assignment);
    expect(repoMocks.findPrintJobById).toHaveBeenCalledTimes(1);
    expect(executionStateMocks.transitionPrintJobExecutionState).toHaveBeenCalledTimes(1);
  });

  it("throws when routing cannot select an agent", async () => {
    registerAgent({
      identity: {
        agentId: "agent-alpha",
        platform: "windows",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      connectedAt: new Date().toISOString(),
    });
    registerAgent({
      identity: {
        agentId: "agent-beta",
        platform: "android",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      connectedAt: new Date().toISOString(),
    });

    await expect(assignPrintJob({ jobId: 100 })).rejects.toThrow(NoEligibleAgentError);
  });

  it("rejects jobs without printerId", async () => {
    registerOnlineAgent("agent-alpha");
    seedPrinterResolution({ agentId: "agent-alpha" });
    repoMocks.findPrintJobById.mockResolvedValue({ ...baseJob, printerId: null });

    await expect(assignPrintJob({ jobId: 100 })).rejects.toThrow(PrintJobAssignmentError);
  });
});
