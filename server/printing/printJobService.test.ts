import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";

const repoMocks = vi.hoisted(() => ({
  findPrintJobByIdempotencyKey: vi.fn(),
  findPrintJobById: vi.fn(),
  insertPrintJob: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobByIdempotencyKey: (...args: unknown[]) =>
    repoMocks.findPrintJobByIdempotencyKey(...args),
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  insertPrintJob: (...args: unknown[]) => repoMocks.insertPrintJob(...args),
}));

vi.mock("../db", () => ({
  getOrderById: (...args: unknown[]) => dbMocks.getOrderById(...args),
}));

import { createPrintJob } from "./printJobService";
import {
  PrintJobOrderNotFoundError,
  PrintJobValidationError,
} from "./printJobTypes";

const baseOrder = {
  id: 42,
  restaurantId: 7,
  tableId: 3,
  tableNumber: 3,
  sessionId: null,
  customerName: null,
  customerPhone: null,
  status: "pending" as const,
  notes: null,
  totalAmount: "10.00",
  orderNumber: "ORD-001",
  trackingToken: "tok",
  readyPushSentAt: null,
  readyAt: null,
  whatsappSent: false,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 7,
  orderId: 42,
  printerId: 10,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:42:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

describe("printJobService THERMAL-PRINTING-3B.2B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getOrderById.mockResolvedValue(baseOrder);
    repoMocks.findPrintJobByIdempotencyKey.mockResolvedValue(null);
    repoMocks.insertPrintJob.mockResolvedValue(100);
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
  });

  describe("createPrintJob auto", () => {
    it("creates a queued job with auto idempotency key", async () => {
      const result = await createPrintJob({ orderId: 42, trigger: "auto", printerId: 10 });

      expect(result.created).toBe(true);
      expect(result.job).toEqual(baseJob);
      expect(repoMocks.findPrintJobByIdempotencyKey).toHaveBeenCalledWith(
        "order:42:submitted"
      );
      expect(repoMocks.insertPrintJob).toHaveBeenCalledWith({
        restaurantId: 7,
        orderId: 42,
        idempotencyKey: "order:42:submitted",
        printerId: 10,
      });
    });

    it("returns existing job on idempotency hit", async () => {
      repoMocks.findPrintJobByIdempotencyKey.mockResolvedValue(baseJob);

      const result = await createPrintJob({ orderId: 42, trigger: "auto", printerId: 10 });

      expect(result).toEqual({ job: baseJob, created: false });
      expect(repoMocks.insertPrintJob).not.toHaveBeenCalled();
    });

    it("returns existing job on duplicate key race", async () => {
      repoMocks.insertPrintJob.mockRejectedValueOnce({ code: "ER_DUP_ENTRY", errno: 1062 });
      repoMocks.findPrintJobByIdempotencyKey
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(baseJob);

      const result = await createPrintJob({ orderId: 42, trigger: "auto", printerId: 10 });

      expect(result).toEqual({ job: baseJob, created: false });
    });

    it("requires printerId for auto jobs", async () => {
      await expect(
        createPrintJob({ orderId: 42, trigger: "auto" })
      ).rejects.toBeInstanceOf(PrintJobValidationError);
    });

    it("throws when order is missing", async () => {
      dbMocks.getOrderById.mockResolvedValue(null);

      await expect(
        createPrintJob({ orderId: 42, trigger: "auto", printerId: 10 })
      ).rejects.toBeInstanceOf(PrintJobOrderNotFoundError);
    });
  });

  describe("createPrintJob reprint", () => {
    const reprintId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

    it("creates a job with reprint idempotency key", async () => {
      const reprintJob = {
        ...baseJob,
        idempotencyKey: `order:42:reprint:${reprintId}`,
      };
      repoMocks.findPrintJobById.mockResolvedValue(reprintJob);

      const result = await createPrintJob({
        orderId: 42,
        trigger: "reprint",
        reprintId,
      });

      expect(result.created).toBe(true);
      expect(repoMocks.insertPrintJob).toHaveBeenCalledWith({
        restaurantId: 7,
        orderId: 42,
        idempotencyKey: `order:42:reprint:${reprintId}`,
      });
    });

    it("requires reprintId", async () => {
      await expect(
        createPrintJob({ orderId: 42, trigger: "reprint" })
      ).rejects.toBeInstanceOf(PrintJobValidationError);
    });

    it("rejects invalid reprintId", async () => {
      await expect(
        createPrintJob({ orderId: 42, trigger: "reprint", reprintId: "not-a-uuid" })
      ).rejects.toBeInstanceOf(PrintJobValidationError);
    });
  });

  describe("validation", () => {
    it("rejects invalid orderId", async () => {
      await expect(
        createPrintJob({ orderId: 0, trigger: "auto" })
      ).rejects.toBeInstanceOf(PrintJobValidationError);
    });

    it("rejects reprintId on auto trigger", async () => {
      await expect(
        createPrintJob({
          orderId: 42,
          trigger: "auto",
          reprintId: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
        })
      ).rejects.toBeInstanceOf(PrintJobValidationError);
    });
  });
});
