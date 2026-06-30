import { describe, expect, it, vi } from "vitest";
import { LegacyPrinterSelectionMigrator } from "../infrastructure/LegacyPrinterSelectionMigrator";
import type { RestaurantPrinterRepository } from "../contracts/RestaurantPrinterRepository";

describe("LegacyPrinterSelectionMigrator", () => {
  it("skips migration when active default already exists", async () => {
    const catalog: RestaurantPrinterRepository = {
      listByRestaurant: vi.fn(),
      findByPrinterId: vi.fn(),
      getDefault: vi.fn(async () => ({
        id: 1,
        restaurantId: 5,
        printerId: "win-1",
        displayName: "Existing",
        platform: "windows",
        transport: "usb",
        isDefault: true,
        isActive: true,
        lastValidatedAt: null,
        capabilities: null,
      })),
      save: vi.fn(),
      rename: vi.fn(),
      remove: vi.fn(),
      setDefault: vi.fn(),
      markValidated: vi.fn(),
    };

    const migrator = new LegacyPrinterSelectionMigrator(catalog);
    const result = await migrator.migrate();

    expect(result.scanned).toBe(0);
    expect(result.migrated).toBe(0);
    expect(catalog.save).not.toHaveBeenCalled();
  });
});
