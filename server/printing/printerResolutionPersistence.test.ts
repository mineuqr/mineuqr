import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrinter } from "../../drizzle/schema";
import {
  clearPrinterResolutionRegistry,
  getDbPrinterProfileMapping,
  listDbPrinterProfileMappings,
} from "./printerResolutionRegistry";
import { resolvePrinter } from "./printerResolutionService";
import { RESOLUTION_FAILURE_CODES } from "./resolutionTypes";
import { clearAgentRegistry } from "./agentRegistry";
import { clearPrinterProfileStore } from "./printerProfileStore";
import {
  registerOnlineAgent,
  seedPrinterProfile,
  TEST_DB_PRINTER_ID,
  TEST_PROFILE_PRINTER_ID,
} from "./printingTestHelpers";

const repoMocks = vi.hoisted(() => ({
  listAllPrinters: vi.fn(),
  findPrinterById: vi.fn(),
}));

vi.mock("./printerRepository", () => ({
  listAllPrinters: (...args: unknown[]) => repoMocks.listAllPrinters(...args),
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
}));

import {
  rebuildPrinterResolutionRegistryFromDb,
  syncDbPrinterProfileMappingFromDb,
} from "./printerResolutionPersistenceService";

function makePrinter(overrides: Partial<SelectPrinter> = {}): SelectPrinter {
  return {
    id: TEST_DB_PRINTER_ID,
    restaurantId: 720007,
    name: "Kitchen",
    paperWidthMm: 80,
    profileId: TEST_PROFILE_PRINTER_ID,
    isDefault: true,
    createdAt: "2026-06-21 12:00:00",
    updatedAt: "2026-06-21 12:00:00",
    ...overrides,
  };
}

describe("printerResolutionPersistence THERMAL-PRINTING-11B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
  });

  describe("rebuildPrinterResolutionRegistryFromDb", () => {
    it("rebuilds dbPrinterId → profileId mappings from printers table rows", async () => {
      repoMocks.listAllPrinters.mockResolvedValue([
        makePrinter({ id: 1, profileId: "kitchen-a" }),
        makePrinter({ id: 2, profileId: "bar-b" }),
      ]);

      const result = await rebuildPrinterResolutionRegistryFromDb();

      expect(result.rebuilt).toBe(2);
      expect(getDbPrinterProfileMapping(1)).toEqual({
        dbPrinterId: 1,
        profilePrinterId: "kitchen-a",
      });
      expect(getDbPrinterProfileMapping(2)).toEqual({
        dbPrinterId: 2,
        profilePrinterId: "bar-b",
      });
    });

    it("clears stale in-memory mappings on rebuild", async () => {
      repoMocks.listAllPrinters.mockResolvedValueOnce([
        makePrinter({ id: 1, profileId: "old-profile" }),
      ]);
      await rebuildPrinterResolutionRegistryFromDb();

      repoMocks.listAllPrinters.mockResolvedValueOnce([
        makePrinter({ id: 1, profileId: "new-profile" }),
      ]);
      await rebuildPrinterResolutionRegistryFromDb();

      expect(getDbPrinterProfileMapping(1)?.profilePrinterId).toBe("new-profile");
      expect(listDbPrinterProfileMappings()).toHaveLength(1);
    });

    it("skips printers with blank profileId", async () => {
      repoMocks.listAllPrinters.mockResolvedValue([
        makePrinter({ id: 1, profileId: "valid-profile" }),
        makePrinter({ id: 2, profileId: "   " }),
      ]);

      const result = await rebuildPrinterResolutionRegistryFromDb();

      expect(result.rebuilt).toBe(1);
      expect(getDbPrinterProfileMapping(2)).toBeUndefined();
    });
  });

  describe("syncDbPrinterProfileMappingFromDb", () => {
    it("registers a single printer mapping from DB", async () => {
      repoMocks.findPrinterById.mockResolvedValue(
        makePrinter({ id: 9, profileId: "sync-profile" })
      );

      const mapping = await syncDbPrinterProfileMappingFromDb(9);

      expect(mapping).toEqual({
        dbPrinterId: 9,
        profilePrinterId: "sync-profile",
      });
    });

    it("returns null when printer row is missing", async () => {
      repoMocks.findPrinterById.mockResolvedValue(null);

      await expect(syncDbPrinterProfileMappingFromDb(999)).resolves.toBeNull();
    });
  });

  describe("restart simulation", () => {
    it("restores resolution after registry clear and rebuild", async () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterProfile("agent-alpha", TEST_PROFILE_PRINTER_ID);

      repoMocks.listAllPrinters.mockResolvedValue([makePrinter()]);
      await rebuildPrinterResolutionRegistryFromDb();

      expect(resolvePrinter(TEST_DB_PRINTER_ID)).toEqual({
        dbPrinterId: TEST_DB_PRINTER_ID,
        profilePrinterId: TEST_PROFILE_PRINTER_ID,
        agentId: "agent-alpha",
      });

      clearPrinterResolutionRegistry();
      expect(getDbPrinterProfileMapping(TEST_DB_PRINTER_ID)).toBeUndefined();

      await rebuildPrinterResolutionRegistryFromDb();
      expect(resolvePrinter(TEST_DB_PRINTER_ID)).toEqual({
        dbPrinterId: TEST_DB_PRINTER_ID,
        profilePrinterId: TEST_PROFILE_PRINTER_ID,
        agentId: "agent-alpha",
      });
    });

    it("fails resolution when rebuilt mapping exists but agent profile is not rediscovered", async () => {
      repoMocks.listAllPrinters.mockResolvedValue([makePrinter()]);
      await rebuildPrinterResolutionRegistryFromDb();

      expect(() => resolvePrinter(TEST_DB_PRINTER_ID)).toThrow(
        expect.objectContaining({ code: RESOLUTION_FAILURE_CODES.UNKNOWN_PROFILE })
      );
    });
  });
});
