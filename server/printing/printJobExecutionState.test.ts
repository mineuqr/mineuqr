import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  markJobAssigned: vi.fn(),
  markJobPrinting: vi.fn(),
  markJobPrinted: vi.fn(),
  markJobFailed: vi.fn(),
}));

const attemptMocks = vi.hoisted(() => ({
  insertPrintAttempt: vi.fn(),
}));

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

import {
  PRINT_JOB_EXECUTION_TRANSITION,
  transitionPrintJobExecutionState,
} from "./printJobExecutionState";

function buildJob(overrides: Partial<SelectPrintJob> = {}): SelectPrintJob {
  return {
    id: 100,
    restaurantId: 7,
    orderId: 500,
    printerId: 10,
    stationId: null,
    assignedAgentId: null,
    assignedAt: null,
    status: PRINT_JOB_STATUS.QUEUED,
    attemptCount: 0,
    idempotencyKey: "order:500:submitted",
    claimedBy: null,
    leaseExpiresAt: null,
    createdAt: "2026-06-22 12:00:00",
    updatedAt: "2026-06-22 12:00:00",
    ...overrides,
  };
}

describe("printJobExecutionState THERMAL-PRINTING-13I.3C.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    attemptMocks.insertPrintAttempt.mockResolvedValue(1);
  });

  it("transitions queued → assigned on assign", async () => {
    const queued = buildJob();
    const assigned = buildJob({
      status: PRINT_JOB_STATUS.ASSIGNED,
      assignedAgentId: "agent-alpha",
      assignedAt: "2026-06-22 12:01:00",
    });
    repoMocks.findPrintJobById.mockResolvedValueOnce(queued);
    repoMocks.markJobAssigned.mockResolvedValue(assigned);

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.ASSIGN,
      agentId: "agent-alpha",
    });

    expect(result).toMatchObject({
      applied: true,
      duplicate: false,
      fromStatus: PRINT_JOB_STATUS.QUEUED,
      toStatus: PRINT_JOB_STATUS.ASSIGNED,
    });
    expect(repoMocks.markJobAssigned).toHaveBeenCalledWith(100, "agent-alpha");
    expect(attemptMocks.insertPrintAttempt).toHaveBeenCalled();
  });

  it("returns duplicate when job is already assigned to the same agent", async () => {
    repoMocks.findPrintJobById.mockResolvedValue(
      buildJob({
        status: PRINT_JOB_STATUS.ASSIGNED,
        assignedAgentId: "agent-alpha",
      })
    );

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.ASSIGN,
      agentId: "agent-alpha",
    });

    expect(result).toEqual({
      applied: false,
      duplicate: true,
      job: expect.objectContaining({ status: PRINT_JOB_STATUS.ASSIGNED }),
      currentStatus: PRINT_JOB_STATUS.ASSIGNED,
    });
    expect(repoMocks.markJobAssigned).not.toHaveBeenCalled();
  });

  it("rejects assign when job is already assigned to another agent", async () => {
    repoMocks.findPrintJobById.mockResolvedValue(
      buildJob({
        status: PRINT_JOB_STATUS.ASSIGNED,
        assignedAgentId: "agent-beta",
      })
    );

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.ASSIGN,
      agentId: "agent-alpha",
    });

    expect(result).toEqual({
      rejected: true,
      reason: "Print job is already assigned to another agent",
    });
  });

  it("transitions assigned → printing on start_execution", async () => {
    const assigned = buildJob({
      status: PRINT_JOB_STATUS.ASSIGNED,
      assignedAgentId: "agent-alpha",
    });
    const printing = buildJob({ status: PRINT_JOB_STATUS.PRINTING, attemptCount: 1 });
    repoMocks.findPrintJobById.mockResolvedValueOnce(assigned);
    repoMocks.markJobPrinting.mockResolvedValue(printing);

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.START_EXECUTION,
      agentId: "agent-alpha",
    });

    expect(result).toMatchObject({
      applied: true,
      toStatus: PRINT_JOB_STATUS.PRINTING,
    });
  });

  it("returns duplicate when execution already started", async () => {
    repoMocks.findPrintJobById.mockResolvedValue(
      buildJob({ status: PRINT_JOB_STATUS.PRINTING })
    );

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.START_EXECUTION,
    });

    expect(result).toMatchObject({
      applied: false,
      duplicate: true,
      currentStatus: PRINT_JOB_STATUS.PRINTING,
    });
    expect(repoMocks.markJobPrinting).not.toHaveBeenCalled();
  });

  it("transitions printing → printed on complete_success", async () => {
    const printing = buildJob({ status: PRINT_JOB_STATUS.PRINTING });
    const printed = buildJob({ status: PRINT_JOB_STATUS.PRINTED });
    repoMocks.findPrintJobById.mockResolvedValueOnce(printing);
    repoMocks.markJobPrinted.mockResolvedValue(printed);

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.COMPLETE_SUCCESS,
    });

    expect(result).toMatchObject({
      applied: true,
      toStatus: PRINT_JOB_STATUS.PRINTED,
    });
  });

  it("transitions printing → failed on complete_failure", async () => {
    const printing = buildJob({ status: PRINT_JOB_STATUS.PRINTING });
    const failed = buildJob({ status: PRINT_JOB_STATUS.FAILED });
    repoMocks.findPrintJobById.mockResolvedValueOnce(printing);
    repoMocks.markJobFailed.mockResolvedValue(failed);

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.COMPLETE_FAILURE,
      failureMessage: "printer unreachable",
    });

    expect(result).toMatchObject({
      applied: true,
      toStatus: PRINT_JOB_STATUS.FAILED,
    });
  });

  it("rejects illegal transition queued → printed", async () => {
    repoMocks.findPrintJobById.mockResolvedValue(buildJob());

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.COMPLETE_SUCCESS,
    });

    expect(result).toEqual({
      rejected: true,
      reason: "Cannot complete success from status queued",
    });
  });

  it("rejects skipped transition assigned → printed", async () => {
    repoMocks.findPrintJobById.mockResolvedValue(
      buildJob({ status: PRINT_JOB_STATUS.ASSIGNED, assignedAgentId: "agent-alpha" })
    );

    const result = await transitionPrintJobExecutionState({
      jobId: 100,
      transition: PRINT_JOB_EXECUTION_TRANSITION.COMPLETE_SUCCESS,
    });

    expect(result).toEqual({
      rejected: true,
      reason: "Cannot complete success from status assigned",
    });
  });
});
