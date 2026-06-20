import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { OPS_EVENT } from "../_core/opsTaxonomy";

const claimMocks = vi.hoisted(() => ({
  claimNextPrintJob: vi.fn(),
}));

const executionMocks = vi.hoisted(() => ({
  startPrintExecution: vi.fn(),
  completePrintExecution: vi.fn(),
  failPrintExecution: vi.fn(),
}));

const processorMocks = vi.hoisted(() => ({
  executePrintJob: vi.fn(),
}));

const opsMocks = vi.hoisted(() => ({
  opsLog: vi.fn(),
}));

vi.mock("./printJobClaimService", () => ({
  claimNextPrintJob: (...args: unknown[]) => claimMocks.claimNextPrintJob(...args),
}));

vi.mock("./printJobExecutionService", () => ({
  startPrintExecution: (...args: unknown[]) => executionMocks.startPrintExecution(...args),
  completePrintExecution: (...args: unknown[]) =>
    executionMocks.completePrintExecution(...args),
  failPrintExecution: (...args: unknown[]) => executionMocks.failPrintExecution(...args),
}));

vi.mock("./executePrintJob", () => ({
  executePrintJob: (...args: unknown[]) => processorMocks.executePrintJob(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsMocks.opsLog(...args),
}));

import { processNextPrintJob } from "./printProcessorWorker";

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

describe("printProcessorWorker THERMAL-PRINTING-3C.3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimMocks.claimNextPrintJob.mockResolvedValue(claimedJob);
    executionMocks.startPrintExecution.mockResolvedValue({
      job: printingJob,
      attemptId: 500,
      attemptMetadata: {
        startedAt: "2026-06-20 10:00:00",
        status: PRINT_JOB_STATUS.PRINTING,
        attemptNumber: 1,
      },
    });
    executionMocks.completePrintExecution.mockResolvedValue({
      job: { ...printingJob, status: PRINT_JOB_STATUS.PRINTED },
      attemptId: 500,
    });
    executionMocks.failPrintExecution.mockResolvedValue({
      job: { ...printingJob, status: PRINT_JOB_STATUS.FAILED },
      attemptId: 500,
    });
    processorMocks.executePrintJob.mockResolvedValue({ success: true });
  });

  it("returns processed false when queue is empty", async () => {
    claimMocks.claimNextPrintJob.mockResolvedValue(null);

    await expect(processNextPrintJob({ workerId: 1 })).resolves.toEqual({
      processed: false,
    });
    expect(executionMocks.startPrintExecution).not.toHaveBeenCalled();
  });

  it("runs claim → start → processor → complete on success", async () => {
    const result = await processNextPrintJob({ workerId: 1 });

    expect(result).toEqual({
      processed: true,
      jobId: 100,
      result: "printed",
    });
    expect(claimMocks.claimNextPrintJob).toHaveBeenCalledWith({ workerId: 1, printerId: undefined });
    expect(executionMocks.startPrintExecution).toHaveBeenCalledWith({ jobId: 100 });
    expect(processorMocks.executePrintJob).toHaveBeenCalledWith(printingJob);
    expect(executionMocks.completePrintExecution).toHaveBeenCalledWith({
      jobId: 100,
      attemptId: 500,
    });
    expect(executionMocks.failPrintExecution).not.toHaveBeenCalled();
  });

  it("fails execution when processor returns failure", async () => {
    processorMocks.executePrintJob.mockResolvedValue({
      success: false,
      error: "Order not found",
    });

    const result = await processNextPrintJob({ workerId: 1 });

    expect(result).toEqual({
      processed: true,
      jobId: 100,
      result: "failed",
    });
    expect(executionMocks.failPrintExecution).toHaveBeenCalledWith({
      jobId: 100,
      attemptId: 500,
      reason: "Order not found",
    });
  });

  it("fails execution when processor throws", async () => {
    processorMocks.executePrintJob.mockRejectedValue(new Error("processor crash"));

    const result = await processNextPrintJob({ workerId: 1 });

    expect(result).toEqual({
      processed: true,
      jobId: 100,
      result: "failed",
    });
    expect(executionMocks.failPrintExecution).toHaveBeenCalledWith({
      jobId: 100,
      attemptId: 500,
      reason: "processor crash",
    });
  });

  it("fails execution when completePrintExecution throws", async () => {
    executionMocks.completePrintExecution.mockRejectedValue(new Error("complete failed"));

    const result = await processNextPrintJob({ workerId: 1 });

    expect(result).toEqual({
      processed: true,
      jobId: 100,
      result: "failed",
    });
    expect(executionMocks.failPrintExecution).toHaveBeenCalledWith({
      jobId: 100,
      attemptId: 500,
      reason: "complete failed",
    });
  });

  it("logs claim, start, and complete events", async () => {
    await processNextPrintJob({ workerId: 1 });

    expect(opsMocks.opsLog.mock.calls.map((call) => call[0]?.type)).toEqual([
      OPS_EVENT.print_processor_job_claimed,
      OPS_EVENT.print_processor_execution_started,
      OPS_EVENT.print_processor_execution_completed,
    ]);
  });

  it("logs failure event when processor fails", async () => {
    processorMocks.executePrintJob.mockResolvedValue({ success: false, error: "bad data" });

    await processNextPrintJob({ workerId: 1 });

    expect(opsMocks.opsLog.mock.calls.at(-1)?.[0]).toMatchObject({
      type: OPS_EVENT.print_processor_execution_failed,
      severity: "warn",
      metadata: expect.objectContaining({
        jobId: 100,
        attemptId: 500,
        lifecycleResolved: true,
      }),
    });
  });
});
