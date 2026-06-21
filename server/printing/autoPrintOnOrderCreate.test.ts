import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";

const serviceMocks = vi.hoisted(() => ({
  createPrintJob: vi.fn(),
  dispatchAssignedPrintJob: vi.fn(),
}));

const opsMocks = vi.hoisted(() => ({
  opsLog: vi.fn(),
}));

vi.mock("./printJobService", () => ({
  createPrintJob: (...args: unknown[]) => serviceMocks.createPrintJob(...args),
}));

vi.mock("./endToEndPrintFlowService", () => ({
  dispatchAssignedPrintJob: (...args: unknown[]) =>
    serviceMocks.dispatchAssignedPrintJob(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsMocks.opsLog(...args),
}));

import { OPS_EVENT } from "../_core/opsTaxonomy";
import { enqueueAutoPrintJobForOrder } from "./autoPrintOnOrderCreate";

describe("autoPrintOnOrderCreate THERMAL-PRINTING-3B.3 / 10A.8", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.dispatchAssignedPrintJob.mockResolvedValue({
      assignment: { jobId: 900, agentId: "agent-1", printerId: 1, restaurantId: 7 },
      assignmentCreated: true,
      notified: true,
    });
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
    expect(serviceMocks.dispatchAssignedPrintJob).toHaveBeenCalledWith({ jobId: 900 });
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

  it("dispatches assignment after idempotent job reuse", async () => {
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

    expect(serviceMocks.dispatchAssignedPrintJob).toHaveBeenCalledWith({ jobId: 900 });
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

    expect(serviceMocks.dispatchAssignedPrintJob).not.toHaveBeenCalled();
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
