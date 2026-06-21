import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import {
  assignPrintJob,
  clearPrintJobAssignments,
  getPrintJobAssignment,
  selectAgentForAssignment,
} from "./assignmentService";
import { NoEligibleAgentError, PrintJobAssignmentError } from "./assignmentTypes";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
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

describe("assignmentService THERMAL-PRINTING-7A.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrintJobAssignments();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
  });

  it("assigns queued jobs to the first online agent deterministically", async () => {
    const connectedAt = new Date().toISOString();
    registerAgent({
      identity: {
        agentId: "agent-zulu",
        platform: "windows",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      connectedAt,
    });
    registerAgent({
      identity: {
        agentId: "agent-alpha",
        platform: "android",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      connectedAt,
    });

    const result = await assignPrintJob({ jobId: 100 });

    expect(result.created).toBe(true);
    expect(result.assignment.agentId).toBe("agent-alpha");
    expect(getPrintJobAssignment(100)).toEqual(result.assignment);
  });

  it("reuses existing assignments idempotently", async () => {
    registerAgent({
      identity: {
        agentId: "agent-alpha",
        platform: "windows",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      connectedAt: new Date().toISOString(),
    });

    const first = await assignPrintJob({ jobId: 100 });
    const second = await assignPrintJob({ jobId: 100 });

    expect(second.created).toBe(false);
    expect(second.assignment).toEqual(first.assignment);
    expect(repoMocks.findPrintJobById).toHaveBeenCalledTimes(1);
  });

  it("throws when no eligible agents are registered", () => {
    expect(() => selectAgentForAssignment()).toThrow(NoEligibleAgentError);
  });

  it("rejects jobs without printerId", async () => {
    registerAgent({
      identity: {
        agentId: "agent-alpha",
        platform: "windows",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      connectedAt: new Date().toISOString(),
    });
    repoMocks.findPrintJobById.mockResolvedValue({ ...baseJob, printerId: null });

    await expect(assignPrintJob({ jobId: 100 })).rejects.toThrow(PrintJobAssignmentError);
  });
});
