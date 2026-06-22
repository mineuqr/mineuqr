import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  autoPrintDefaultStationJobIdempotencyKey,
  autoPrintJobIdempotencyKey,
  autoPrintStationJobIdempotencyKey,
} from "../../shared/printing/types";
import { PRINT_TARGET_SELECTION_REASONS } from "./printTargetSelectionTypes";
import { STATION_ROUTING_REASONS, StationRoutingError } from "./stationRoutingTypes";

const dbMocks = vi.hoisted(() => ({
  getOrderItemsByOrderId: vi.fn(),
}));

const stationRepoMocks = vi.hoisted(() => ({
  listPrintStationsForRestaurant: vi.fn(),
  findPrintStationById: vi.fn(),
  getCategoryStationIds: vi.fn(),
  getMenuItemsByIds: vi.fn(),
}));

const printerRepoMocks = vi.hoisted(() => ({
  findPrinterById: vi.fn(),
}));

const selectionMocks = vi.hoisted(() => ({
  resolvePrintTarget: vi.fn(),
}));

vi.mock("../db", () => ({
  getOrderItemsByOrderId: (...args: unknown[]) => dbMocks.getOrderItemsByOrderId(...args),
}));

vi.mock("./stationRepository", () => ({
  listPrintStationsForRestaurant: (...args: unknown[]) =>
    stationRepoMocks.listPrintStationsForRestaurant(...args),
  findPrintStationById: (...args: unknown[]) => stationRepoMocks.findPrintStationById(...args),
  getCategoryStationIds: (...args: unknown[]) => stationRepoMocks.getCategoryStationIds(...args),
  getMenuItemsByIds: (...args: unknown[]) => stationRepoMocks.getMenuItemsByIds(...args),
}));

vi.mock("./printerRepository", () => ({
  findPrinterById: (...args: unknown[]) => printerRepoMocks.findPrinterById(...args),
}));

vi.mock("./printTargetSelectionService", () => ({
  resolvePrintTarget: (...args: unknown[]) => selectionMocks.resolvePrintTarget(...args),
}));

import {
  filterOrderItemsForStationJob,
  resolveStationItemFilterFromJob,
  resolveStationPrintTargets,
} from "./stationRoutingService";

const restaurantId = 720007;
const orderId = 5000;

const kitchenStation = {
  id: 1,
  restaurantId,
  name: "Kitchen",
  printerId: 10,
  sortOrder: 0,
  createdAt: "2026-06-22 00:00:00",
  updatedAt: "2026-06-22 00:00:00",
};

const coffeeStation = {
  id: 2,
  restaurantId,
  name: "Coffee",
  printerId: 20,
  sortOrder: 1,
  createdAt: "2026-06-22 00:00:00",
  updatedAt: "2026-06-22 00:00:00",
};

const dessertStation = {
  id: 3,
  restaurantId,
  name: "Dessert",
  printerId: 30,
  sortOrder: 2,
  createdAt: "2026-06-22 00:00:00",
  updatedAt: "2026-06-22 00:00:00",
};

const burgerItem = {
  id: 101,
  orderId,
  menuItemId: 1001,
  nameAr: "Burger",
  nameEn: "Burger",
  price: "10.00",
  quantity: 1,
  notes: null,
  createdAt: "2026-06-22 00:00:00",
};

const coffeeItem = {
  id: 102,
  orderId,
  menuItemId: 1002,
  nameAr: "Coffee",
  nameEn: "Coffee",
  price: "5.00",
  quantity: 1,
  notes: null,
  createdAt: "2026-06-22 00:00:00",
};

const cakeItem = {
  id: 103,
  orderId,
  menuItemId: 1003,
  nameAr: "Cake",
  nameEn: "Cake",
  price: "8.00",
  quantity: 1,
  notes: null,
  createdAt: "2026-06-22 00:00:00",
};

describe("stationRoutingService THERMAL-PRINTING-12A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stationRepoMocks.listPrintStationsForRestaurant.mockResolvedValue([
      kitchenStation,
      coffeeStation,
      dessertStation,
    ]);
    stationRepoMocks.getCategoryStationIds.mockResolvedValue(
      new Map([
        [11, 1],
        [22, 2],
        [33, 3],
      ])
    );
    stationRepoMocks.getMenuItemsByIds.mockImplementation(async (ids: number[]) => {
      const map: Record<number, { id: number; categoryId: number; restaurantId: number }> = {
        1001: { id: 1001, categoryId: 11, restaurantId },
        1002: { id: 1002, categoryId: 22, restaurantId },
        1003: { id: 1003, categoryId: 33, restaurantId },
        1004: { id: 1004, categoryId: 44, restaurantId },
      };
      return ids.map((id) => map[id]).filter(Boolean);
    });
    printerRepoMocks.findPrinterById.mockImplementation(async (printerId: number) => ({
      id: printerId,
      restaurantId,
      name: `Printer ${printerId}`,
      paperWidthMm: 80,
      profileId: `profile-${printerId}`,
      isDefault: false,
      createdAt: "2026-06-22 00:00:00",
      updatedAt: "2026-06-22 00:00:00",
    }));
    selectionMocks.resolvePrintTarget.mockResolvedValue({
      dbPrinterId: 99,
      reason: PRINT_TARGET_SELECTION_REASONS.SINGLE_PRINTER,
    });
  });

  it("creates one legacy target for a single-station order", async () => {
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([burgerItem]);

    const result = await resolveStationPrintTargets({ restaurantId, orderId });

    expect(result.targets).toEqual([
      expect.objectContaining({
        stationId: 1,
        stationName: "Kitchen",
        printerId: 10,
        orderItemIds: [101],
        idempotencyKey: autoPrintJobIdempotencyKey(orderId),
        selectionReason: STATION_ROUTING_REASONS.STATION_PRINTER,
      }),
    ]);
    expect(selectionMocks.resolvePrintTarget).not.toHaveBeenCalled();
  });

  it("creates three independent jobs for Burger + Coffee + Cake", async () => {
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([burgerItem, coffeeItem, cakeItem]);

    const result = await resolveStationPrintTargets({ restaurantId, orderId });

    expect(result.targets).toHaveLength(3);
    expect(result.targets).toEqual([
      expect.objectContaining({
        stationId: 1,
        printerId: 10,
        orderItemIds: [101],
        idempotencyKey: autoPrintStationJobIdempotencyKey(orderId, 1),
      }),
      expect.objectContaining({
        stationId: 2,
        printerId: 20,
        orderItemIds: [102],
        idempotencyKey: autoPrintStationJobIdempotencyKey(orderId, 2),
      }),
      expect.objectContaining({
        stationId: 3,
        printerId: 30,
        orderItemIds: [103],
        idempotencyKey: autoPrintStationJobIdempotencyKey(orderId, 3),
      }),
    ]);
  });

  it("routes unmapped categories to the default printer group", async () => {
    const unmappedItem = {
      ...burgerItem,
      id: 104,
      menuItemId: 1004,
    };
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([unmappedItem]);

    const result = await resolveStationPrintTargets({ restaurantId, orderId });

    expect(result.targets).toEqual([
      expect.objectContaining({
        stationId: null,
        printerId: 99,
        orderItemIds: [104],
        idempotencyKey: autoPrintJobIdempotencyKey(orderId),
        selectionReason: STATION_ROUTING_REASONS.LEGACY_SINGLE_TARGET,
      }),
    ]);
    expect(selectionMocks.resolvePrintTarget).toHaveBeenCalledWith({ restaurantId });
  });

  it("skips items when station printer is missing", async () => {
    stationRepoMocks.listPrintStationsForRestaurant.mockResolvedValue([
      { ...kitchenStation, printerId: 999 },
    ]);
    printerRepoMocks.findPrinterById.mockResolvedValue(null);
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([burgerItem]);

    await expect(resolveStationPrintTargets({ restaurantId, orderId })).rejects.toBeInstanceOf(
      StationRoutingError
    );
  });

  it("merges multiple items from the same station into one target", async () => {
    const secondBurger = { ...burgerItem, id: 105, menuItemId: 1001 };
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([burgerItem, secondBurger, coffeeItem]);

    const result = await resolveStationPrintTargets({ restaurantId, orderId });

    const kitchenTarget = result.targets.find((target) => target.stationId === 1);
    expect(kitchenTarget?.orderItemIds).toEqual([101, 105]);
    expect(result.targets).toHaveLength(2);
  });

  it("resolves deterministic station ordering by sortOrder", async () => {
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([cakeItem, burgerItem, coffeeItem]);

    const result = await resolveStationPrintTargets({ restaurantId, orderId });

    expect(result.targets.map((target) => target.stationId)).toEqual([1, 2, 3]);
  });

  it("filters ticket items for a station job", async () => {
    const filtered = await filterOrderItemsForStationJob({
      restaurantId,
      orderItems: [burgerItem, coffeeItem, cakeItem],
      stationId: 2,
      filterMode: "station",
    });

    expect(filtered.map((item) => item.id)).toEqual([102]);
  });

  it("filters default-group items for categories without station mapping", async () => {
    stationRepoMocks.getCategoryStationIds.mockResolvedValue(new Map([[11, 1]]));

    const filtered = await filterOrderItemsForStationJob({
      restaurantId,
      orderItems: [burgerItem, coffeeItem],
      stationId: null,
      filterMode: "default",
    });

    expect(filtered.map((item) => item.id)).toEqual([102]);
  });

  it("uses legacy all-items filter for single-target jobs", () => {
    expect(
      resolveStationItemFilterFromJob({
        orderId,
        stationId: null,
        idempotencyKey: autoPrintJobIdempotencyKey(orderId),
      })
    ).toEqual({ stationId: null, filterMode: "all" });
  });

  it("uses default filter for default multi-target jobs", () => {
    expect(
      resolveStationItemFilterFromJob({
        orderId,
        stationId: null,
        idempotencyKey: autoPrintDefaultStationJobIdempotencyKey(orderId),
      })
    ).toEqual({ stationId: null, filterMode: "default" });
  });
});
