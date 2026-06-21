import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { PRINT_TARGET_SELECTION_REASONS } from "./printTargetSelectionTypes";

const repoMocks = vi.hoisted(() => ({
  findPrintJobByIdempotencyKey: vi.fn(),
  findPrintJobById: vi.fn(),
  insertPrintJob: vi.fn(),
  listPrintersForRestaurant: vi.fn(),
  findPrinterById: vi.fn(),
  findRestaurantPrintSettings: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
}));

const dispatchMocks = vi.hoisted(() => ({
  dispatchAssignedPrintJob: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobByIdempotencyKey: (...args: unknown[]) =>
    repoMocks.findPrintJobByIdempotencyKey(...args),
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  insertPrintJob: (...args: unknown[]) => repoMocks.insertPrintJob(...args),
}));

vi.mock("./printerRepository", () => ({
  listPrintersForRestaurant: (...args: unknown[]) =>
    repoMocks.listPrintersForRestaurant(...args),
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
  findRestaurantPrintSettings: (...args: unknown[]) =>
    repoMocks.findRestaurantPrintSettings(...args),
}));

vi.mock("../db", () => ({
  getOrderById: (...args: unknown[]) => dbMocks.getOrderById(...args),
}));

vi.mock("./endToEndPrintFlowService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./endToEndPrintFlowService")>();
  return {
    ...actual,
    dispatchAssignedPrintJob: (...args: unknown[]) =>
      dispatchMocks.dispatchAssignedPrintJob(...args),
  };
});

vi.mock("../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { enqueueAutoPrintJobForOrder } from "./autoPrintOnOrderCreate";

const baseOrder = {
  id: 3900002,
  restaurantId: 720007,
  tableId: 3,
  tableNumber: 3,
  sessionId: null,
  customerName: null,
  customerPhone: null,
  status: "pending" as const,
  notes: null,
  totalAmount: "10.00",
  orderNumber: "ORD-0178",
  trackingToken: "tok",
  readyPushSentAt: null,
  readyAt: null,
  whatsappSent: false,
  createdAt: "2026-06-21 21:33:59",
  updatedAt: "2026-06-21 21:33:59",
};

const createdJob: SelectPrintJob = {
  id: 150002,
  restaurantId: 720007,
  orderId: 3900002,
  printerId: 1,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:3900002:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-21 21:33:59",
  updatedAt: "2026-06-21 21:33:59",
};

describe("auto print order flow THERMAL-PRINTING-11A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getOrderById.mockResolvedValue(baseOrder);
    repoMocks.findPrintJobByIdempotencyKey.mockResolvedValue(null);
    repoMocks.insertPrintJob.mockResolvedValue(150002);
    repoMocks.findPrintJobById.mockResolvedValue(createdJob);
    repoMocks.findRestaurantPrintSettings.mockResolvedValue(null);
    repoMocks.listPrintersForRestaurant.mockResolvedValue([
      {
        id: 1,
        restaurantId: 720007,
        name: "POS-80C (copy 1)",
        paperWidthMm: 80,
        profileId: "pos-80c-copy-1-usb001",
        isDefault: true,
        createdAt: "2026-06-21 12:00:00",
        updatedAt: "2026-06-21 12:00:00",
      },
    ]);
    dispatchMocks.dispatchAssignedPrintJob.mockResolvedValue({
      assignment: {
        jobId: 150002,
        agentId: "agent-alpha",
        printerId: 1,
        restaurantId: 720007,
        orderId: 3900002,
        assignedAt: "2026-06-21T21:33:59.000Z",
      },
      assignmentCreated: true,
      notified: true,
    });
  });

  it("creates auto print jobs with resolved printerId and dispatches assignment", async () => {
    await enqueueAutoPrintJobForOrder({
      orderId: 3900002,
      restaurantId: 720007,
      procedure: "order.create",
    });

    expect(repoMocks.insertPrintJob).toHaveBeenCalledWith({
      restaurantId: 720007,
      orderId: 3900002,
      idempotencyKey: "order:3900002:submitted",
      printerId: 1,
    });
    expect(dispatchMocks.dispatchAssignedPrintJob).toHaveBeenCalledWith({
      jobId: 150002,
    });
  });

  it("uses explicit default-printer settings when configured", async () => {
    repoMocks.findRestaurantPrintSettings.mockResolvedValue({
      restaurantId: 720007,
      autoPrintOnNewOrder: true,
      defaultPrinterId: 2,
      ticketLocale: "bilingual",
      showTotalAmount: true,
      createdAt: "2026-06-21 12:00:00",
      updatedAt: "2026-06-21 12:00:00",
    });
    repoMocks.findPrinterById.mockResolvedValue({
      id: 2,
      restaurantId: 720007,
      name: "Bar",
      paperWidthMm: 80,
      profileId: "bar-printer",
      isDefault: false,
      createdAt: "2026-06-21 12:00:00",
      updatedAt: "2026-06-21 12:00:00",
    });
    repoMocks.findPrintJobById.mockResolvedValue({ ...createdJob, printerId: 2 });
    repoMocks.insertPrintJob.mockResolvedValue(150003);

    await enqueueAutoPrintJobForOrder({
      orderId: 3900002,
      restaurantId: 720007,
    });

    expect(repoMocks.insertPrintJob).toHaveBeenCalledWith(
      expect.objectContaining({
        printerId: 2,
      })
    );
  });

  it("does not create jobs when auto print is disabled", async () => {
    repoMocks.findRestaurantPrintSettings.mockResolvedValue({
      restaurantId: 720007,
      autoPrintOnNewOrder: false,
      defaultPrinterId: null,
      ticketLocale: "bilingual",
      showTotalAmount: true,
      createdAt: "2026-06-21 12:00:00",
      updatedAt: "2026-06-21 12:00:00",
    });

    await enqueueAutoPrintJobForOrder({
      orderId: 3900002,
      restaurantId: 720007,
    });

    expect(repoMocks.insertPrintJob).not.toHaveBeenCalled();
    expect(dispatchMocks.dispatchAssignedPrintJob).not.toHaveBeenCalled();
  });
});
