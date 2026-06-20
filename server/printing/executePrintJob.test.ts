import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";

const dbMocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
}));

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
}));

vi.mock("../db", () => ({
  getOrderById: (...args: unknown[]) => dbMocks.getOrderById(...args),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
}));

import { executePrintJob } from "./executePrintJob";

const job: SelectPrintJob = {
  id: 100,
  restaurantId: 7,
  orderId: 42,
  printerId: null,
  status: PRINT_JOB_STATUS.PRINTING,
  attemptCount: 1,
  idempotencyKey: "order:42:submitted",
  claimedBy: 1,
  leaseExpiresAt: "2026-06-20 10:05:00",
  createdAt: "2026-06-20 10:00:00",
  updatedAt: "2026-06-20 10:00:00",
};

describe("executePrintJob THERMAL-PRINTING-3C.3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.findPrintJobById.mockResolvedValue(job);
    dbMocks.getOrderById.mockResolvedValue({
      id: 42,
      restaurantId: 7,
    });
  });

  it("returns success when job and order exist", async () => {
    await expect(executePrintJob(job)).resolves.toEqual({ success: true });
  });

  it("returns failure when order is missing", async () => {
    dbMocks.getOrderById.mockResolvedValue(null);

    await expect(executePrintJob(job)).resolves.toEqual({
      success: false,
      error: "Order not found",
    });
  });

  it("returns failure when order restaurant mismatches", async () => {
    dbMocks.getOrderById.mockResolvedValue({ id: 42, restaurantId: 99 });

    await expect(executePrintJob(job)).resolves.toEqual({
      success: false,
      error: "Order restaurant mismatch",
    });
  });
});
