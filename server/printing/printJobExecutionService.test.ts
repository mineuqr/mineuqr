import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob, SelectPrintJobAttempt } from "../../drizzle/schema";
import { PRINT_JOB_ATTEMPT_EVENT, PRINT_JOB_STATUS } from "../../shared/printing/types";

const jobRepoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  markJobPrinting: vi.fn(),
  markJobPrinted: vi.fn(),
  markJobFailed: vi.fn(),
}));

const attemptRepoMocks = vi.hoisted(() => ({
  insertPrintAttempt: vi.fn(),
  updatePrintAttemptMetadata: vi.fn(),
  findPrintAttemptById: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => jobRepoMocks.findPrintJobById(...args),
  markJobPrinting: (...args: unknown[]) => jobRepoMocks.markJobPrinting(...args),
  markJobPrinted: (...args: unknown[]) => jobRepoMocks.markJobPrinted(...args),
  markJobFailed: (...args: unknown[]) => jobRepoMocks.markJobFailed(...args),
}));

vi.mock("./printJobAttemptRepository", () => ({
  insertPrintAttempt: (...args: unknown[]) => attemptRepoMocks.insertPrintAttempt(...args),
  updatePrintAttemptMetadata: (...args: unknown[]) =>
    attemptRepoMocks.updatePrintAttemptMetadata(...args),
  findPrintAttemptById: (...args: unknown[]) =>
    attemptRepoMocks.findPrintAttemptById(...args),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
}));

import {
  completePrintExecution,
  failPrintExecution,
  startPrintExecution,
} from "./printJobExecutionService";
import {
  PrintJobExecutionError,
  PrintJobNotFoundError,
  PrintJobTransitionError,
} from "./printJobTypes";

const claimedJob: SelectPrintJob = {
  id: 100,
  restaurantId: 7,
  orderId: 42,
  printerId: null,
  status: PRINT_JOB_STATUS.CLAIMED,
  attemptCount: 0,
  idempotencyKey: "order:42:submitted",
  claimedBy: 1,
  leaseExpiresAt: "2026-06-20 10:05:00",
  createdAt: "2026-06-20 10:00:00",
  updatedAt: "2026-06-20 10:00:00",
};

const printingJob: SelectPrintJob = {
  ...claimedJob,
  status: PRINT_JOB_STATUS.PRINTING,
  attemptCount: 1,
};

const printedJob: SelectPrintJob = {
  ...printingJob,
  status: PRINT_JOB_STATUS.PRINTED,
};

const failedJob: SelectPrintJob = {
  ...printingJob,
  status: PRINT_JOB_STATUS.FAILED,
};

const openAttempt: SelectPrintJobAttempt = {
  id: 500,
  printJobId: 100,
  eventType: PRINT_JOB_ATTEMPT_EVENT.EXECUTION_ATTEMPT,
  metadataJson: {
    startedAt: "2026-06-20 10:00:00",
    status: PRINT_JOB_STATUS.PRINTING,
    attemptNumber: 1,
  },
  createdAt: "2026-06-20 10:00:00",
};

describe("printJobExecutionService THERMAL-PRINTING-3C.2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T10:00:00.000Z"));

    dbMocks.getDb.mockResolvedValue({ transaction: dbMocks.transaction });
    dbMocks.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({})
    );

    jobRepoMocks.findPrintJobById.mockResolvedValue(claimedJob);
    jobRepoMocks.markJobPrinting.mockResolvedValue(printingJob);
    jobRepoMocks.markJobPrinted.mockResolvedValue(printedJob);
    jobRepoMocks.markJobFailed.mockResolvedValue(failedJob);
    attemptRepoMocks.insertPrintAttempt.mockResolvedValue(500);
    attemptRepoMocks.findPrintAttemptById.mockResolvedValue(openAttempt);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("startPrintExecution", () => {
    it("moves claimed job to printing and records attempt", async () => {
      const result = await startPrintExecution({ jobId: 100 });

      expect(result.job).toEqual(printingJob);
      expect(result.attemptId).toBe(500);
      expect(result.attemptMetadata).toEqual({
        startedAt: "2026-06-20 10:00:00",
        status: PRINT_JOB_STATUS.PRINTING,
        attemptNumber: 1,
      });
      expect(jobRepoMocks.markJobPrinting).toHaveBeenCalledWith(100, {});
      expect(attemptRepoMocks.insertPrintAttempt).toHaveBeenCalledWith(
        {
          printJobId: 100,
          eventType: PRINT_JOB_ATTEMPT_EVENT.EXECUTION_ATTEMPT,
          metadataJson: {
            startedAt: "2026-06-20 10:00:00",
            status: PRINT_JOB_STATUS.PRINTING,
            attemptNumber: 1,
          },
        },
        {}
      );
    });

    it("rejects unclaimed queued jobs", async () => {
      jobRepoMocks.findPrintJobById.mockResolvedValue({
        ...claimedJob,
        status: PRINT_JOB_STATUS.QUEUED,
        claimedBy: null,
      });

      await expect(startPrintExecution({ jobId: 100 })).rejects.toBeInstanceOf(
        PrintJobTransitionError
      );
    });

    it("rejects jobs without claimedBy", async () => {
      jobRepoMocks.findPrintJobById.mockResolvedValue({
        ...claimedJob,
        claimedBy: null,
      });

      await expect(startPrintExecution({ jobId: 100 })).rejects.toBeInstanceOf(
        PrintJobExecutionError
      );
    });
  });

  describe("completePrintExecution", () => {
    beforeEach(() => {
      jobRepoMocks.findPrintJobById.mockResolvedValue(printingJob);
    });

    it("moves printing job to printed and completes attempt", async () => {
      const result = await completePrintExecution({ jobId: 100, attemptId: 500 });

      expect(result.job).toEqual(printedJob);
      expect(result.attemptMetadata).toMatchObject({
        completedAt: "2026-06-20 10:00:00",
        status: PRINT_JOB_STATUS.PRINTED,
        attemptNumber: 1,
      });
      expect(attemptRepoMocks.updatePrintAttemptMetadata).toHaveBeenCalledWith(
        500,
        expect.objectContaining({
          status: PRINT_JOB_STATUS.PRINTED,
          completedAt: "2026-06-20 10:00:00",
        }),
        {}
      );
    });

    it("rejects queued → printed shortcut", async () => {
      jobRepoMocks.findPrintJobById.mockResolvedValue({
        ...claimedJob,
        status: PRINT_JOB_STATUS.QUEUED,
      });

      await expect(
        completePrintExecution({ jobId: 100, attemptId: 500 })
      ).rejects.toBeInstanceOf(PrintJobTransitionError);
    });
  });

  describe("failPrintExecution", () => {
    beforeEach(() => {
      jobRepoMocks.findPrintJobById.mockResolvedValue(printingJob);
    });

    it("moves printing job to failed with attempt error", async () => {
      const result = await failPrintExecution({
        jobId: 100,
        attemptId: 500,
        reason: "simulated device fault",
      });

      expect(result.job).toEqual(failedJob);
      expect(result.attemptMetadata).toMatchObject({
        status: PRINT_JOB_STATUS.FAILED,
        error: "simulated device fault",
        completedAt: "2026-06-20 10:00:00",
      });
    });

    it("rejects failed → printing replay", async () => {
      jobRepoMocks.findPrintJobById.mockResolvedValue(failedJob);

      await expect(
        startPrintExecution({ jobId: 100 })
      ).rejects.toBeInstanceOf(PrintJobTransitionError);
    });

    it("rejects missing attempt", async () => {
      attemptRepoMocks.findPrintAttemptById.mockResolvedValue(null);

      await expect(
        failPrintExecution({ jobId: 100, attemptId: 500, reason: "x" })
      ).rejects.toBeInstanceOf(PrintJobNotFoundError);
    });
  });
});
