import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAgentRegistry } from "./agentRegistry";
import { clearAgentRestaurantProjectionCache } from "./endpointRegistryCompatibility";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { getPrintDiscoveryDiagnostics } from "./printOperationsDiscoveryService";
import { registerOnlineAgent, seedPrinterProfile, seedPrinterResolution, TEST_PROFILE_PRINTER_ID } from "./printingTestHelpers";
import { resolveRestaurantIdForAgent } from "./endpointRegistryCompatibility";

vi.mock("./printerRepository", () => ({
  listPrintersForRestaurant: vi.fn(),
}));

vi.mock("./endpointOperationsService", () => ({
  getEndpointOperationsSummary: vi.fn().mockReturnValue({
    totalEndpoints: 0,
    onlineEndpoints: 0,
    offlineEndpoints: 0,
    staleEndpoints: 0,
    unknownEndpoints: 0,
    byType: {},
  }),
}));

import { listPrintersForRestaurant } from "./printerRepository";

const restaurant720007 = 720007;
const restaurant720002 = 720002;

describe("printOperationsDiscoveryService THERMAL-PRINTING-13I.1H", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentRestaurantProjectionCache();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
  });

  it("reports no_agent_connected when restaurant has printers but no online agent", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([
      {
        id: 1,
        restaurantId: restaurant720002,
        name: "POS-80C",
        paperWidthMm: 80,
        profileId: TEST_PROFILE_PRINTER_ID,
        isDefault: true,
        createdAt: "2026-06-24 00:00:00",
        updatedAt: "2026-06-24 00:00:00",
      },
    ]);

    const diagnostics = await getPrintDiscoveryDiagnostics(restaurant720002, []);

    expect(diagnostics.emptyReason).toBe("no_agent_connected");
    expect(diagnostics.counts.connectedAgentsForRestaurant).toBe(0);
    expect(diagnostics.counts.assignedDbPrinters).toBe(1);
    expect(diagnostics.provisioning.step).toBe("connect_agent");
    expect(diagnostics.provisioning.suggestedAgentId).toBe("mineuqr-agent-720002");
  });

  it("reports agent connected but printers inactive when owned agent has no matching profiles", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([
      {
        id: 1,
        restaurantId: restaurant720007,
        name: "POS-80C",
        paperWidthMm: 80,
        profileId: TEST_PROFILE_PRINTER_ID,
        isDefault: true,
        createdAt: "2026-06-24 00:00:00",
        updatedAt: "2026-06-24 00:00:00",
      },
    ]);

    registerOnlineAgent("mineuqr-agent-720007");
    seedPrinterProfile("mineuqr-agent-720007", "other-profile-id");

    const diagnostics = await getPrintDiscoveryDiagnostics(restaurant720007, []);

    expect(diagnostics.emptyReason).toBe("printers_inactive");
    expect(diagnostics.counts.connectedAgentsForRestaurant).toBe(1);
    expect(diagnostics.counts.connectedAgentsGlobal).toBe(1);
  });

  it("reports ownership_conflict when profile is owned by another restaurant agent", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([
      {
        id: 1,
        restaurantId: restaurant720002,
        name: "POS-80C",
        paperWidthMm: 80,
        profileId: TEST_PROFILE_PRINTER_ID,
        isDefault: true,
        createdAt: "2026-06-24 00:00:00",
        updatedAt: "2026-06-24 00:00:00",
      },
    ]);

    registerOnlineAgent("mineuqr-agent-720007");
    seedPrinterProfile("mineuqr-agent-720007", TEST_PROFILE_PRINTER_ID);

    expect(resolveRestaurantIdForAgent("mineuqr-agent-720007")).toBe(restaurant720007);

    const diagnostics = await getPrintDiscoveryDiagnostics(restaurant720002, []);

    expect(diagnostics.emptyReason).toBe("ownership_conflict");
    expect(diagnostics.ownershipConflicts).toHaveLength(1);
    expect(diagnostics.ownershipConflicts[0]?.owningRestaurantId).toBe(restaurant720007);
    expect(diagnostics.ownershipConflicts[0]?.currentRestaurantId).toBe(restaurant720002);
    expect(diagnostics.provisioning.step).toBe("blocked");
  });

  it("reports no_db_printers when restaurant has no configured printers", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([]);

    const diagnostics = await getPrintDiscoveryDiagnostics(restaurant720002, []);

    expect(diagnostics.emptyReason).toBe("no_db_printers");
    expect(diagnostics.counts.assignedDbPrinters).toBe(0);
    expect(diagnostics.provisioning.step).toBe("add_printer");
  });

  it("reports test_print provisioning when an active printer is available", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([
      {
        id: 10,
        restaurantId: restaurant720007,
        name: "Kitchen",
        paperWidthMm: 80,
        profileId: TEST_PROFILE_PRINTER_ID,
        isDefault: true,
        createdAt: "2026-06-24 00:00:00",
        updatedAt: "2026-06-24 00:00:00",
      },
    ]);

    seedPrinterResolution({ agentId: "mineuqr-agent-720007", dbPrinterId: 10 });
    registerOnlineAgent("mineuqr-agent-720007");

    const diagnostics = await getPrintDiscoveryDiagnostics(restaurant720007, [
      {
        id: 10,
        name: "Kitchen",
        profileId: TEST_PROFILE_PRINTER_ID,
        transport: "usb",
        isActive: true,
        isDefault: true,
        lastActivityAt: null,
      },
    ]);

    expect(diagnostics.provisioning.step).toBe("test_print");
    expect(diagnostics.provisioning.primaryPrinterId).toBe(10);
    expect(diagnostics.provisioning.connectConfig).not.toBeNull();
  });
});
