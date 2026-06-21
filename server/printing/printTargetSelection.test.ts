import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrinter } from "../../drizzle/schema";
import {
  PRINT_TARGET_SELECTION_FAILURE_CODES,
  PRINT_TARGET_SELECTION_REASONS,
  PrintTargetSelectionError,
} from "./printTargetSelectionTypes";

const repoMocks = vi.hoisted(() => ({
  listPrintersForRestaurant: vi.fn(),
  findPrinterById: vi.fn(),
  findRestaurantPrintSettings: vi.fn(),
}));

vi.mock("./printerRepository", () => ({
  listPrintersForRestaurant: (...args: unknown[]) =>
    repoMocks.listPrintersForRestaurant(...args),
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
  findRestaurantPrintSettings: (...args: unknown[]) =>
    repoMocks.findRestaurantPrintSettings(...args),
}));

import {
  isAutoPrintEnabledForRestaurant,
  resolvePrintTarget,
} from "./printTargetSelectionService";

const restaurantId = 720007;

function makePrinter(overrides: Partial<SelectPrinter> = {}): SelectPrinter {
  return {
    id: 1,
    restaurantId,
    name: "Kitchen",
    paperWidthMm: 80,
    profileId: "kitchen-1",
    isDefault: false,
    createdAt: "2026-06-21 12:00:00",
    updatedAt: "2026-06-21 12:00:00",
    ...overrides,
  };
}

describe("printTargetSelectionService THERMAL-PRINTING-11A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.findRestaurantPrintSettings.mockResolvedValue(null);
    repoMocks.listPrintersForRestaurant.mockResolvedValue([]);
    repoMocks.findPrinterById.mockResolvedValue(null);
  });

  describe("isAutoPrintEnabledForRestaurant", () => {
    it("treats missing settings as enabled", async () => {
      await expect(isAutoPrintEnabledForRestaurant(restaurantId)).resolves.toBe(true);
    });

    it("returns false when autoPrintOnNewOrder is disabled", async () => {
      repoMocks.findRestaurantPrintSettings.mockResolvedValue({
        restaurantId,
        autoPrintOnNewOrder: false,
        defaultPrinterId: null,
        ticketLocale: "bilingual",
        showTotalAmount: true,
        createdAt: "2026-06-21 12:00:00",
        updatedAt: "2026-06-21 12:00:00",
      });

      await expect(isAutoPrintEnabledForRestaurant(restaurantId)).resolves.toBe(false);
    });
  });

  describe("resolvePrintTarget", () => {
    it("selects explicit printer when it belongs to the restaurant", async () => {
      repoMocks.findPrinterById.mockResolvedValue(makePrinter({ id: 9 }));

      await expect(
        resolvePrintTarget({ restaurantId, explicitPrinterId: 9 })
      ).resolves.toEqual({
        dbPrinterId: 9,
        reason: PRINT_TARGET_SELECTION_REASONS.EXPLICIT,
      });
    });

    it("rejects explicit printer from another restaurant", async () => {
      repoMocks.findPrinterById.mockResolvedValue(makePrinter({ id: 9, restaurantId: 999 }));

      await expect(
        resolvePrintTarget({ restaurantId, explicitPrinterId: 9 })
      ).rejects.toMatchObject({
        code: PRINT_TARGET_SELECTION_FAILURE_CODES.EXPLICIT_PRINTER_WRONG_RESTAURANT,
      });
    });

    it("rejects missing explicit printer", async () => {
      await expect(
        resolvePrintTarget({ restaurantId, explicitPrinterId: 9 })
      ).rejects.toMatchObject({
        code: PRINT_TARGET_SELECTION_FAILURE_CODES.EXPLICIT_PRINTER_NOT_FOUND,
      });
    });

    it("selects restaurantPrintSettings.defaultPrinterId", async () => {
      repoMocks.findRestaurantPrintSettings.mockResolvedValue({
        restaurantId,
        autoPrintOnNewOrder: true,
        defaultPrinterId: 2,
        ticketLocale: "bilingual",
        showTotalAmount: true,
        createdAt: "2026-06-21 12:00:00",
        updatedAt: "2026-06-21 12:00:00",
      });
      repoMocks.findPrinterById.mockResolvedValue(makePrinter({ id: 2 }));

      await expect(resolvePrintTarget({ restaurantId })).resolves.toEqual({
        dbPrinterId: 2,
        reason: PRINT_TARGET_SELECTION_REASONS.SETTINGS_DEFAULT,
      });
    });

    it("rejects invalid defaultPrinterId from settings", async () => {
      repoMocks.findRestaurantPrintSettings.mockResolvedValue({
        restaurantId,
        autoPrintOnNewOrder: true,
        defaultPrinterId: 2,
        ticketLocale: "bilingual",
        showTotalAmount: true,
        createdAt: "2026-06-21 12:00:00",
        updatedAt: "2026-06-21 12:00:00",
      });

      await expect(resolvePrintTarget({ restaurantId })).rejects.toMatchObject({
        code: PRINT_TARGET_SELECTION_FAILURE_CODES.DEFAULT_PRINTER_NOT_FOUND,
      });
    });

    it("rejects cross-restaurant defaultPrinterId", async () => {
      repoMocks.findRestaurantPrintSettings.mockResolvedValue({
        restaurantId,
        autoPrintOnNewOrder: true,
        defaultPrinterId: 2,
        ticketLocale: "bilingual",
        showTotalAmount: true,
        createdAt: "2026-06-21 12:00:00",
        updatedAt: "2026-06-21 12:00:00",
      });
      repoMocks.findPrinterById.mockResolvedValue(makePrinter({ id: 2, restaurantId: 999 }));

      await expect(resolvePrintTarget({ restaurantId })).rejects.toMatchObject({
        code: PRINT_TARGET_SELECTION_FAILURE_CODES.DEFAULT_PRINTER_WRONG_RESTAURANT,
      });
    });

    it("selects the sole isDefault printer", async () => {
      repoMocks.listPrintersForRestaurant.mockResolvedValue([
        makePrinter({ id: 3, isDefault: true }),
        makePrinter({ id: 4, isDefault: false }),
      ]);

      await expect(resolvePrintTarget({ restaurantId })).resolves.toEqual({
        dbPrinterId: 3,
        reason: PRINT_TARGET_SELECTION_REASONS.PRINTER_IS_DEFAULT,
      });
    });

    it("rejects multiple isDefault printers", async () => {
      repoMocks.listPrintersForRestaurant.mockResolvedValue([
        makePrinter({ id: 3, isDefault: true }),
        makePrinter({ id: 4, isDefault: true }),
      ]);

      await expect(resolvePrintTarget({ restaurantId })).rejects.toMatchObject({
        code: PRINT_TARGET_SELECTION_FAILURE_CODES.AMBIGUOUS_DEFAULT_FLAG,
      });
    });

    it("selects the only printer in the restaurant", async () => {
      repoMocks.listPrintersForRestaurant.mockResolvedValue([makePrinter({ id: 5 })]);

      await expect(resolvePrintTarget({ restaurantId })).resolves.toEqual({
        dbPrinterId: 5,
        reason: PRINT_TARGET_SELECTION_REASONS.SINGLE_PRINTER,
      });
    });

    it("rejects when no printers are configured", async () => {
      await expect(resolvePrintTarget({ restaurantId })).rejects.toMatchObject({
        code: PRINT_TARGET_SELECTION_FAILURE_CODES.NO_PRINTERS_CONFIGURED,
      });
    });

    it("rejects ambiguous multi-printer restaurants without a default", async () => {
      repoMocks.listPrintersForRestaurant.mockResolvedValue([
        makePrinter({ id: 6 }),
        makePrinter({ id: 7 }),
      ]);

      await expect(resolvePrintTarget({ restaurantId })).rejects.toMatchObject({
        code: PRINT_TARGET_SELECTION_FAILURE_CODES.AMBIGUOUS_PRINTERS,
      });
    });

    it("throws PrintTargetSelectionError instances", async () => {
      await expect(resolvePrintTarget({ restaurantId })).rejects.toBeInstanceOf(
        PrintTargetSelectionError
      );
    });
  });
});
