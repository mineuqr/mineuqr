import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import {
  autoPrintJobIdempotencyKey,
  autoPrintStationJobIdempotencyKey,
  PRINT_JOB_STATUS,
} from "../../shared/printing/types";

const repoMocks = vi.hoisted(() => ({
  findPrintJobByIdempotencyKey: vi.fn(),
  findPrintJobById: vi.fn(),
  insertPrintJob: vi.fn(),
  listPrintersForRestaurant: vi.fn(),
  findPrinterById: vi.fn(),
  findRestaurantPrintSettings: vi.fn(),
}));

const stationRepoMocks = vi.hoisted(() => ({
  listPrintStationsForRestaurant: vi.fn(),
  findPrintStationById: vi.fn(),
  getCategoryStationIds: vi.fn(),
  getMenuItemsByIds: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
}));

const dispatchMocks = vi.hoisted(() => ({
  requestPrintHostDispatch: vi.fn(),
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

vi.mock("./stationRepository", () => ({
  listPrintStationsForRestaurant: (...args: unknown[]) =>
    stationRepoMocks.listPrintStationsForRestaurant(...args),
  findPrintStationById: (...args: unknown[]) => stationRepoMocks.findPrintStationById(...args),
  getCategoryStationIds: (...args: unknown[]) => stationRepoMocks.getCategoryStationIds(...args),
  getMenuItemsByIds: (...args: unknown[]) => stationRepoMocks.getMenuItemsByIds(...args),
}));

vi.mock("../db", () => ({
  getOrderById: (...args: unknown[]) => dbMocks.getOrderById(...args),
  getOrderItemsByOrderId: (...args: unknown[]) => dbMocks.getOrderItemsByOrderId(...args),
}));

vi.mock("./printHostDispatchClient", () => ({
  requestPrintHostDispatch: (...args: unknown[]) =>
    dispatchMocks.requestPrintHostDispatch(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { enqueueAutoPrintJobForOrder } from "./autoPrintOnOrderCreate";

const restaurantId = 720007;
const orderId = 3900002;

const baseOrder = {
  id: orderId,
  restaurantId,
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

const defaultOrderItem = {
  id: 501,
  orderId,
  menuItemId: 1001,
  nameAr: "برجر",
  nameEn: "Burger",
  price: "10.00",
  quantity: 1,
  notes: null,
  createdAt: "2026-06-21 21:33:59",
};

const coffeeOrderItem = {
  id: 502,
  orderId,
  menuItemId: 1002,
  nameAr: "قهوة",
  nameEn: "Coffee",
  price: "5.00",
  quantity: 1,
  notes: null,
  createdAt: "2026-06-21 21:33:59",
};

const kitchenStation = {
  id: 1,
  restaurantId,
  name: "Kitchen",
  printerId: 1,
  sortOrder: 0,
  createdAt: "2026-06-21 12:00:00",
  updatedAt: "2026-06-21 12:00:00",
};

const coffeeStation = {
  id: 2,
  restaurantId,
  name: "Coffee",
  printerId: 2,
  sortOrder: 1,
  createdAt: "2026-06-21 12:00:00",
  updatedAt: "2026-06-21 12:00:00",
};

const printerOne = {
  id: 1,
  restaurantId,
  name: "POS-80C (copy 1)",
  paperWidthMm: 80,
  profileId: "pos-80c-copy-1-usb001",
  isDefault: true,
  createdAt: "2026-06-21 12:00:00",
  updatedAt: "2026-06-21 12:00:00",
};

const printerTwo = {
  id: 2,
  restaurantId,
  name: "Bar",
  paperWidthMm: 80,
  profileId: "bar-printer",
  isDefault: false,
  createdAt: "2026-06-21 12:00:00",
  updatedAt: "2026-06-21 12:00:00",
};

function buildCreatedJob(input: {
  id: number;
  printerId: number;
  stationId?: number | null;
  idempotencyKey: string;
}): SelectPrintJob {
  return {
    id: input.id,
    restaurantId,
    orderId,
    printerId: input.printerId,
    stationId: input.stationId ?? null,
    status: PRINT_JOB_STATUS.QUEUED,
    attemptCount: 0,
    idempotencyKey: input.idempotencyKey,
    claimedBy: null,
    leaseExpiresAt: null,
    createdAt: "2026-06-21 21:33:59",
    updatedAt: "2026-06-21 21:33:59",
  };
}

function mockDefaultUnmappedRouting() {
  stationRepoMocks.listPrintStationsForRestaurant.mockResolvedValue([]);
  stationRepoMocks.getCategoryStationIds.mockResolvedValue(new Map());
  stationRepoMocks.getMenuItemsByIds.mockResolvedValue([
    { id: 1001, categoryId: 11, restaurantId },
  ]);
}

describe("auto print order flow THERMAL-PRINTING-11A/12A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getOrderById.mockResolvedValue(baseOrder);
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([defaultOrderItem]);
    repoMocks.findPrintJobByIdempotencyKey.mockResolvedValue(null);
    repoMocks.insertPrintJob.mockResolvedValue(150002);
    repoMocks.findPrintJobById.mockResolvedValue(
      buildCreatedJob({
        id: 150002,
        printerId: 1,
        stationId: null,
        idempotencyKey: autoPrintJobIdempotencyKey(orderId),
      })
    );
    repoMocks.findRestaurantPrintSettings.mockResolvedValue(null);
    repoMocks.listPrintersForRestaurant.mockResolvedValue([printerOne]);
    repoMocks.findPrinterById.mockImplementation(async (printerId: number) => {
      if (printerId === 1) return printerOne;
      if (printerId === 2) return printerTwo;
      return null;
    });
    mockDefaultUnmappedRouting();
    dispatchMocks.requestPrintHostDispatch.mockResolvedValue({
      bridgeUsed: true,
      result: {
        status: "dispatched",
        jobId: 150002,
        notified: true,
      },
    });
  });

  it("creates a legacy single-target job for unmapped categories via default printer routing", async () => {
    await enqueueAutoPrintJobForOrder({
      orderId,
      restaurantId,
      procedure: "order.create",
    });

    expect(dbMocks.getOrderItemsByOrderId).toHaveBeenCalledWith(orderId);
    expect(stationRepoMocks.listPrintStationsForRestaurant).toHaveBeenCalledWith(restaurantId);
    expect(repoMocks.insertPrintJob).toHaveBeenCalledWith({
      restaurantId,
      orderId,
      idempotencyKey: autoPrintJobIdempotencyKey(orderId),
      printerId: 1,
      stationId: null,
    });
    expect(dispatchMocks.requestPrintHostDispatch).toHaveBeenCalledWith({
      jobId: 150002,
      restaurantId,
      printerId: 1,
      procedure: "order.create",
    });
  });

  it("uses explicit default-printer settings for the default station group", async () => {
    repoMocks.findRestaurantPrintSettings.mockResolvedValue({
      restaurantId,
      autoPrintOnNewOrder: true,
      defaultPrinterId: 2,
      ticketLocale: "bilingual",
      showTotalAmount: true,
      createdAt: "2026-06-21 12:00:00",
      updatedAt: "2026-06-21 12:00:00",
    });
    repoMocks.findPrintJobById.mockResolvedValue(
      buildCreatedJob({
        id: 150003,
        printerId: 2,
        stationId: null,
        idempotencyKey: autoPrintJobIdempotencyKey(orderId),
      })
    );
    repoMocks.insertPrintJob.mockResolvedValue(150003);

    await enqueueAutoPrintJobForOrder({
      orderId,
      restaurantId,
    });

    expect(repoMocks.insertPrintJob).toHaveBeenCalledWith({
      restaurantId,
      orderId,
      idempotencyKey: autoPrintJobIdempotencyKey(orderId),
      printerId: 2,
      stationId: null,
    });
  });

  it("creates independent station jobs for multi-station orders", async () => {
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([defaultOrderItem, coffeeOrderItem]);
    stationRepoMocks.listPrintStationsForRestaurant.mockResolvedValue([
      kitchenStation,
      coffeeStation,
    ]);
    stationRepoMocks.getCategoryStationIds.mockResolvedValue(
      new Map([
        [11, 1],
        [22, 2],
      ])
    );
    stationRepoMocks.getMenuItemsByIds.mockResolvedValue([
      { id: 1001, categoryId: 11, restaurantId },
      { id: 1002, categoryId: 22, restaurantId },
    ]);
    stationRepoMocks.findPrintStationById.mockImplementation(async (stationId: number) => {
      if (stationId === 1) return kitchenStation;
      if (stationId === 2) return coffeeStation;
      return null;
    });

    repoMocks.insertPrintJob.mockResolvedValueOnce(150010).mockResolvedValueOnce(150011);
    repoMocks.findPrintJobById
      .mockResolvedValueOnce(
        buildCreatedJob({
          id: 150010,
          printerId: 1,
          stationId: 1,
          idempotencyKey: autoPrintStationJobIdempotencyKey(orderId, 1),
        })
      )
      .mockResolvedValueOnce(
        buildCreatedJob({
          id: 150011,
          printerId: 2,
          stationId: 2,
          idempotencyKey: autoPrintStationJobIdempotencyKey(orderId, 2),
        })
      );
    dispatchMocks.requestPrintHostDispatch.mockResolvedValue({
      bridgeUsed: true,
      result: { status: "dispatched", notified: true },
    });

    await enqueueAutoPrintJobForOrder({
      orderId,
      restaurantId,
      procedure: "order.create",
    });

    expect(repoMocks.insertPrintJob).toHaveBeenCalledTimes(2);
    expect(repoMocks.insertPrintJob).toHaveBeenNthCalledWith(1, {
      restaurantId,
      orderId,
      idempotencyKey: autoPrintStationJobIdempotencyKey(orderId, 1),
      printerId: 1,
      stationId: 1,
    });
    expect(repoMocks.insertPrintJob).toHaveBeenNthCalledWith(2, {
      restaurantId,
      orderId,
      idempotencyKey: autoPrintStationJobIdempotencyKey(orderId, 2),
      printerId: 2,
      stationId: 2,
    });
    expect(dispatchMocks.requestPrintHostDispatch).toHaveBeenCalledWith({
      jobId: 150010,
      restaurantId,
      printerId: 1,
      procedure: "order.create",
    });
    expect(dispatchMocks.requestPrintHostDispatch).toHaveBeenCalledWith({
      jobId: 150011,
      restaurantId,
      printerId: 2,
      procedure: "order.create",
    });
  });

  it("routes mapped categories through station printers without calling default target selection", async () => {
    stationRepoMocks.listPrintStationsForRestaurant.mockResolvedValue([kitchenStation]);
    stationRepoMocks.getCategoryStationIds.mockResolvedValue(new Map([[11, 1]]));
    stationRepoMocks.findPrintStationById.mockResolvedValue(kitchenStation);

    await enqueueAutoPrintJobForOrder({
      orderId,
      restaurantId,
    });

    expect(repoMocks.listPrintersForRestaurant).not.toHaveBeenCalled();
    expect(repoMocks.insertPrintJob).toHaveBeenCalledWith(
      expect.objectContaining({
        printerId: 1,
        stationId: 1,
        idempotencyKey: autoPrintJobIdempotencyKey(orderId),
      })
    );
  });

  it("does not create jobs when auto print is disabled", async () => {
    repoMocks.findRestaurantPrintSettings.mockResolvedValue({
      restaurantId,
      autoPrintOnNewOrder: false,
      defaultPrinterId: null,
      ticketLocale: "bilingual",
      showTotalAmount: true,
      createdAt: "2026-06-21 12:00:00",
      updatedAt: "2026-06-21 12:00:00",
    });

    await enqueueAutoPrintJobForOrder({
      orderId,
      restaurantId,
    });

    expect(dbMocks.getOrderItemsByOrderId).not.toHaveBeenCalled();
    expect(repoMocks.insertPrintJob).not.toHaveBeenCalled();
    expect(dispatchMocks.requestPrintHostDispatch).not.toHaveBeenCalled();
  });
});
