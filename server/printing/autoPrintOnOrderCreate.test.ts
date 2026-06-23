import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { STATION_ROUTING_REASONS } from "./stationRoutingTypes";

const selectionMocks = vi.hoisted(() => ({
  isAutoPrintEnabledForRestaurant: vi.fn(),
}));

const routingMocks = vi.hoisted(() => ({
  resolveStationPrintTargets: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  createPrintJob: vi.fn(),
  requestPrintHostDispatch: vi.fn(),
}));

const opsMocks = vi.hoisted(() => ({
  opsLog: vi.fn(),
}));

vi.mock("./printTargetSelectionService", () => ({
  isAutoPrintEnabledForRestaurant: (...args: unknown[]) =>
    selectionMocks.isAutoPrintEnabledForRestaurant(...args),
}));

vi.mock("./stationRoutingService", () => ({
  resolveStationPrintTargets: (...args: unknown[]) =>
    routingMocks.resolveStationPrintTargets(...args),
}));

vi.mock("./printJobService", () => ({
  createPrintJob: (...args: unknown[]) => serviceMocks.createPrintJob(...args),
}));

vi.mock("./printHostDispatchClient", () => ({
  requestPrintHostDispatch: (...args: unknown[]) =>
    serviceMocks.requestPrintHostDispatch(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsMocks.opsLog(...args),
}));

import { OPS_EVENT } from "../_core/opsTaxonomy";
import { enqueueAutoPrintJobForOrder } from "./autoPrintOnOrderCreate";

describe("autoPrintOnOrderCreate THERMAL-PRINTING-11A/12A/13H", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectionMocks.isAutoPrintEnabledForRestaurant.mockResolvedValue(true);
    routingMocks.resolveStationPrintTargets.mockResolvedValue({
      targets: [
        {
          stationId: null,
          stationName: null,
          printerId: 1,
          orderItemIds: [101],
          idempotencyKey: "order:42:submitted",
          selectionReason: STATION_ROUTING_REASONS.LEGACY_SINGLE_TARGET,
        },
      ],
      skipped: [],
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
    serviceMocks.requestPrintHostDispatch.mockResolvedValue({
      bridgeUsed: true,
      result: {
        status: "dispatched",
        jobId: 900,
        notified: true,
      },
    });
  });

  it("resolves station targets before creating the auto print job", async () => {
    await enqueueAutoPrintJobForOrder({
      orderId: 42,
      restaurantId: 7,
      procedure: "order.create",
    });

    expect(routingMocks.resolveStationPrintTargets).toHaveBeenCalledWith({
      restaurantId: 7,
      orderId: 42,
    });
    expect(serviceMocks.createPrintJob).toHaveBeenCalledWith({
      orderId: 42,
      trigger: "auto",
      printerId: 1,
      stationId: null,
      idempotencyKey: "order:42:submitted",
    });
    expect(serviceMocks.requestPrintHostDispatch).toHaveBeenCalledWith({
      jobId: 900,
      restaurantId: 7,
      printerId: 1,
      procedure: "order.create",
    });
  });

  it("skips auto print when disabled in restaurant settings", async () => {
    selectionMocks.isAutoPrintEnabledForRestaurant.mockResolvedValue(false);

    await enqueueAutoPrintJobForOrder({
      orderId: 42,
      restaurantId: 7,
      procedure: "order.create",
    });

    expect(routingMocks.resolveStationPrintTargets).not.toHaveBeenCalled();
    expect(serviceMocks.createPrintJob).not.toHaveBeenCalled();
    expect(serviceMocks.requestPrintHostDispatch).not.toHaveBeenCalled();
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
          selectionReason: STATION_ROUTING_REASONS.LEGACY_SINGLE_TARGET,
        }),
      })
    );
  });

  it("requests Print Host dispatch after idempotent job reuse", async () => {
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

    expect(serviceMocks.requestPrintHostDispatch).toHaveBeenCalledWith({
      jobId: 900,
      restaurantId: 7,
      printerId: 1,
      procedure: undefined,
    });
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

    expect(serviceMocks.requestPrintHostDispatch).not.toHaveBeenCalled();
    expect(opsMocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.print_job_creation_failed,
        metadata: expect.objectContaining({
          error: "db unavailable",
        }),
      })
    );
  });

  it("logs print_job_creation_failed when station routing fails", async () => {
    routingMocks.resolveStationPrintTargets.mockRejectedValue(
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

  it("creates and dispatches one job per station target", async () => {
    routingMocks.resolveStationPrintTargets.mockResolvedValue({
      targets: [
        {
          stationId: 1,
          stationName: "Kitchen",
          printerId: 10,
          orderItemIds: [101],
          idempotencyKey: "order:42:submitted:station:1",
          selectionReason: STATION_ROUTING_REASONS.STATION_PRINTER,
        },
        {
          stationId: 2,
          stationName: "Coffee",
          printerId: 20,
          orderItemIds: [102],
          idempotencyKey: "order:42:submitted:station:2",
          selectionReason: STATION_ROUTING_REASONS.STATION_PRINTER,
        },
      ],
      skipped: [],
    });
    serviceMocks.createPrintJob
      .mockResolvedValueOnce({
        created: true,
        job: { id: 901, printerId: 10, status: PRINT_JOB_STATUS.QUEUED },
      })
      .mockResolvedValueOnce({
        created: true,
        job: { id: 902, printerId: 20, status: PRINT_JOB_STATUS.QUEUED },
      });

    await enqueueAutoPrintJobForOrder({ orderId: 42, restaurantId: 7 });

    expect(serviceMocks.createPrintJob).toHaveBeenCalledTimes(2);
    expect(serviceMocks.requestPrintHostDispatch).toHaveBeenCalledWith({
      jobId: 901,
      restaurantId: 7,
      printerId: 10,
      procedure: undefined,
    });
    expect(serviceMocks.requestPrintHostDispatch).toHaveBeenCalledWith({
      jobId: 902,
      restaurantId: 7,
      printerId: 20,
      procedure: undefined,
    });
  });
});
