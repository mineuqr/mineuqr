import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";

const serviceMocks = vi.hoisted(() => ({
  createPrintJob: vi.fn(),
}));

const opsMocks = vi.hoisted(() => ({
  opsLog: vi.fn(),
}));

vi.mock("./printJobService", () => ({
  createPrintJob: (...args: unknown[]) => serviceMocks.createPrintJob(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsMocks.opsLog(...args),
}));

import { OPS_EVENT } from "../_core/opsTaxonomy";
import { enqueueAutoPrintJobForOrder } from "./autoPrintOnOrderCreate";

describe("autoPrintOnOrderCreate THERMAL-PRINTING-3B.3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs print_job_created when a new job is inserted", async () => {
    serviceMocks.createPrintJob.mockResolvedValue({
      created: true,
      job: {
        id: 900,
        idempotencyKey: "order:42:submitted",
        status: PRINT_JOB_STATUS.QUEUED,
      },
    });

    await enqueueAutoPrintJobForOrder({
      orderId: 42,
      restaurantId: 7,
      procedure: "order.create",
    });

    expect(serviceMocks.createPrintJob).toHaveBeenCalledWith({
      orderId: 42,
      trigger: "auto",
    });
    expect(opsMocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.print_job_created,
        category: "ORDER",
        severity: "info",
        restaurantId: 7,
        procedure: "order.create",
        metadata: expect.objectContaining({
          orderId: 42,
          printJobId: 900,
          idempotencyKey: "order:42:submitted",
          status: PRINT_JOB_STATUS.QUEUED,
        }),
      })
    );
  });

  it("logs print_job_idempotency_reused when job already exists", async () => {
    serviceMocks.createPrintJob.mockResolvedValue({
      created: false,
      job: {
        id: 900,
        idempotencyKey: "order:42:submitted",
        status: PRINT_JOB_STATUS.QUEUED,
      },
    });

    await enqueueAutoPrintJobForOrder({
      orderId: 42,
      restaurantId: 7,
    });

    expect(opsMocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.print_job_idempotency_reused,
      })
    );
  });

  it("logs print_job_creation_failed without throwing", async () => {
    serviceMocks.createPrintJob.mockRejectedValue(new Error("db unavailable"));

    await expect(
      enqueueAutoPrintJobForOrder({
        orderId: 42,
        restaurantId: 7,
        procedure: "order.create",
      })
    ).resolves.toBeUndefined();

    expect(opsMocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.print_job_creation_failed,
        category: "ORDER",
        severity: "warn",
        metadata: expect.objectContaining({
          orderId: 42,
          error: "db unavailable",
        }),
      })
    );
  });
});
