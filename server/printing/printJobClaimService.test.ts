import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";

const repoMocks = vi.hoisted(() => ({
  findNextQueuedJob: vi.fn(),
  claimJob: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findNextQueuedJob: (...args: unknown[]) => repoMocks.findNextQueuedJob(...args),
  claimJob: (...args: unknown[]) => repoMocks.claimJob(...args),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
}));

import { claimNextPrintJob } from "./printJobClaimService";
import { PrintJobValidationError } from "./printJobTypes";

const jobA: SelectPrintJob = {
  id: 1,
  restaurantId: 7,
  orderId: 100,
  printerId: null,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:100:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-20 10:00:00",
  updatedAt: "2026-06-20 10:00:00",
};

const claimedJobA: SelectPrintJob = {
  ...jobA,
  status: PRINT_JOB_STATUS.CLAIMED,
  claimedBy: 1,
  leaseExpiresAt: "2026-06-20 10:05:00",
};

describe("printJobClaimService THERMAL-PRINTING-3C.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T10:00:00.000Z"));

    dbMocks.getDb.mockResolvedValue({ transaction: dbMocks.transaction });
    dbMocks.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<SelectPrintJob | null>) => fn({})
    );
    repoMocks.findNextQueuedJob.mockResolvedValue(jobA);
    repoMocks.claimJob.mockResolvedValue(claimedJobA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("claims the oldest queued job for a worker", async () => {
    const result = await claimNextPrintJob({ workerId: 1 });

    expect(result).toEqual(claimedJobA);
    expect(repoMocks.findNextQueuedJob).toHaveBeenCalledWith({ printerId: undefined }, {});
    expect(repoMocks.claimJob).toHaveBeenCalledWith(
      {
        jobId: 1,
        workerId: 1,
        leaseExpiresAt: "2026-06-20 10:05:00",
      },
      {}
    );
  });

  it("returns null when the queue is empty", async () => {
    repoMocks.findNextQueuedJob.mockResolvedValue(null);

    await expect(claimNextPrintJob({ workerId: 1 })).resolves.toBeNull();
    expect(repoMocks.claimJob).not.toHaveBeenCalled();
  });

  it("passes printerId filter to repository lookup", async () => {
    await claimNextPrintJob({ workerId: 1, printerId: 9 });

    expect(repoMocks.findNextQueuedJob).toHaveBeenCalledWith({ printerId: 9 }, {});
  });

  it("returns null when claim update loses the queued race", async () => {
    repoMocks.claimJob.mockResolvedValue(null);

    await expect(claimNextPrintJob({ workerId: 1 })).resolves.toBeNull();
  });

  it("runs find and claim inside one transaction", async () => {
    await claimNextPrintJob({ workerId: 1 });

    expect(dbMocks.transaction).toHaveBeenCalledTimes(1);
    expect(repoMocks.findNextQueuedJob.mock.invocationCallOrder[0]).toBeLessThan(
      repoMocks.claimJob.mock.invocationCallOrder[0]!
    );
  });

  it("rejects invalid workerId", async () => {
    await expect(claimNextPrintJob({ workerId: 0 })).rejects.toBeInstanceOf(
      PrintJobValidationError
    );
  });

  it("creates a five-minute lease timestamp", async () => {
    await claimNextPrintJob({ workerId: 1 });

    expect(repoMocks.claimJob.mock.calls[0]?.[0]).toMatchObject({
      leaseExpiresAt: "2026-06-20 10:05:00",
    });
  });
});
