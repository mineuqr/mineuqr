import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { PRINT_TARGET_SELECTION_REASONS } from "./printTargetSelectionTypes";

const selectionMocks = vi.hoisted(() => ({
  isAutoPrintEnabledForRestaurant: vi.fn(),
  resolvePrintTarget: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  createPrintJob: vi.fn(),
  dispatchAssignedPrintJob: vi.fn(),
}));

const opsMocks = vi.hoisted(() => ({
  opsLog: vi.fn(),
}));

vi.mock("./printTargetSelectionService", () => ({
  isAutoPrintEnabledForRestaurant: (...args: unknown[]) =>
    selectionMocks.isAutoPrintEnabledForRestaurant(...args),
  resolvePrintTarget: (...args: unknown[]) => selectionMocks.resolvePrintTarget(...args),
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

describe("autoPrintOnOrderCreate THERMAL-PRINTING-11A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectionMocks.isAutoPrintEnabledForRestaurant.mockResolvedValue(true);
    selectionMocks.resolvePrintTarget.mockResolvedValue({
      dbPrinterId: 1,
      reason: PRINT_TARGET_SELECTION_REASONS.SINGLE_PRINTER,
    });
    serviceMocks.createPrintJob.mockResolvedValue({
      created: true,
      job: {
        id: 900,
        printerId: 1,
        idempotencyKey: "order:42:submitted",
        status: PRINT_JOB_STATUS.QUEUED,
      },
    });
    serviceMocks.dispatchAssignedPrintJob.mockResolvedValue({
      assignment: { jobId: 900, agentId: "agent-1", printerId: 1, restaurantId: 7 },
      assignmentCreated: true,
      notified: true,
    });
  });

  it("resolves printer target before creating the auto print job", async () => {
    await enqueueAutoPrintJobForOrder({
      orderId: 42,
      restaurantId: 7,
      procedure: "order.create",
    });

    expect(selectionMocks.resolvePrintTarget).toHaveBeenCalledWith({
      restaurantId: 7,
    });
    expect(serviceMocks.createPrintJob).toHaveBeenCalledWith({
      orderId: 42,
      trigger: "auto",
      printerId: 1,
    });
    expect(serviceMocks.dispatchAssignedPrintJob).toHaveBeenCalledWith({ jobId: 900 });
  });

  it("skips auto print when disabled in restaurant settings", async () => {
    selectionMocks.isAutoPrintEnabledForRestaurant.mockResolvedValue(false);

    await enqueueAutoPrintJobForOrder({
      orderId: 42,
      restaurantId: 7,
      procedure: "order.create",
    });

    expect(selectionMocks.resolvePrintTarget).not.toHaveBeenCalled();
    expect(serviceMocks.createPrintJob).not.toHaveBeenCalled();
    expect(serviceMocks.dispatchAssignedPrintJob).not.toHaveBeenCalled();
    expect(opsMocks.opsLog).not.toHaveBeenCalled();
  });

  it("logs print_job_created when a new job is inserted", async () => {
    await enqueueAutoPrintJobForOrder({
      orderId: 42,
      restaurantId: 7,
      procedure: "order.create",
    });

    expect(opsMocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.print_job_created,
        metadata: expect.objectContaining({
          orderId: 42,
          printJobId: 900,
          printerId: 1,
          selectionReason: PRINT_TARGET_SELECTION_REASONS.SINGLE_PRINTER,
        }),
      })
    );
  });

  it("dispatches assignment after idempotent job reuse", async () => {
    serviceMocks.createPrintJob.mockResolvedValue({
      created: false,
      job: {
        id: 900,
        printerId: 1,
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

  it("logs print_job_creation_failed when createPrintJob fails", async () => {
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
        metadata: expect.objectContaining({
          error: "db unavailable",
        }),
      })
    );
  });

  it("logs print_job_creation_failed when target selection fails", async () => {
    selectionMocks.resolvePrintTarget.mockRejectedValue(
      new Error("No printers configured for this restaurant")
    );

    await enqueueAutoPrintJobForOrder({
      orderId: 42,
      restaurantId: 7,
      procedure: "order.create",
    });

    expect(serviceMocks.createPrintJob).not.toHaveBeenCalled();
    expect(opsMocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.print_job_creation_failed,
        metadata: expect.objectContaining({
          orderId: 42,
          error: "No printers configured for this restaurant",
        }),
      })
    );
  });
});
