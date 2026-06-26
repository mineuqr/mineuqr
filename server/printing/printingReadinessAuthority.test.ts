import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAgentRegistry } from "./agentRegistry";
import { recordAgentHeartbeat } from "./agentLifecycleService";
import { DEFAULT_AGENT_STALE_THRESHOLD_MS } from "../../shared/printing/agentHeartbeat";
import { clearPrinterBindingStatusStore } from "./printerBindingStatusStore";
import { recordPrinterBindingStatusReport } from "./printerBindingStatusService";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { getPrintDiscoveryDiagnostics } from "./printOperationsDiscoveryService";
import {
  getPrintingReadinessAuthority,
  legacyProvisioningStepConflictsWithAuthority,
} from "./printingReadinessAuthority";
import {
  registerOnlineAgent,
  seedPrinterResolution,
  TEST_PROFILE_PRINTER_ID,
} from "./printingTestHelpers";

vi.mock("./printerRepository", () => ({
  listPrintersForRestaurant: vi.fn(),
}));

vi.mock("./diagnosticPrintRepository", () => ({
  listPrintDiagnosticRunsForRestaurant: vi.fn().mockResolvedValue([]),
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

const restaurantId = 720007;
const agentId = "mineuqr-agent-720007";

const samplePrinter = {
  id: 10,
  restaurantId,
  name: "Kitchen",
  paperWidthMm: 80 as const,
  profileId: TEST_PROFILE_PRINTER_ID,
  isDefault: true,
  createdAt: "2026-06-24 00:00:00",
  updatedAt: "2026-06-24 00:00:00",
};

describe("printingReadinessAuthority THERMAL-PRINTING-13I.3B.5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearPrinterBindingStatusStore();
  });

  it("does not emit READY from legacy activePrinters alone", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    registerOnlineAgent(agentId);

    const discovery = await getPrintDiscoveryDiagnostics(restaurantId, [
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
    const authority = await getPrintingReadinessAuthority(restaurantId);

    expect(discovery.counts.activePrinters).toBe(1);
    expect(discovery.provisioning.step).toBe("test_print");
    expect(authority.setupState).not.toBe("READY");
    expect(legacyProvisioningStepConflictsWithAuthority({
      legacyStep: discovery.provisioning.step,
      setupState: authority.setupState,
    })).toBe(true);
  });

  it("requires binding BOUND before authority reaches READY_FOR_TEST", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    registerOnlineAgent(agentId);
    recordPrinterBindingStatusReport({
      agentId,
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [
        {
          profileId: TEST_PROFILE_PRINTER_ID,
          logicalPrinterName: "Kitchen",
          bindingStatus: "UNBOUND",
          windowsPrinterName: null,
          portName: null,
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
        },
      ],
    });

    const authority = await getPrintingReadinessAuthority(restaurantId);

    expect(authority.setupState).toBe("BINDING_REQUIRED");
    expect(authority.nextAction).toBe("BIND_PRINTER");
  });

  it("keeps setupState READY while operationalState is DEGRADED", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    registerOnlineAgent(agentId);
    recordPrinterBindingStatusReport({
      agentId,
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [
        {
          profileId: TEST_PROFILE_PRINTER_ID,
          logicalPrinterName: "Kitchen",
          bindingStatus: "BOUND",
          windowsPrinterName: "EPSON",
          portName: "USB001",
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
        },
      ],
    });

    const { listPrintDiagnosticRunsForRestaurant } = await import("./diagnosticPrintRepository");
    vi.mocked(listPrintDiagnosticRunsForRestaurant).mockResolvedValue([
      {
        id: 1,
        diagnosticId: "diag_ready",
        restaurantId,
        printerId: 10,
        agentId,
        triggeredByUserId: 1,
        triggeredByLabel: "tester",
        status: "completed",
        error: null,
        createdAt: "2026-06-24T13:00:00.000Z",
        completedAt: "2026-06-24T14:00:00.000Z",
      },
    ]);

    const readyAuthority = await getPrintingReadinessAuthority(restaurantId);
    expect(readyAuthority.setupState).toBe("READY");
    expect(readyAuthority.operationalState).toBe("HEALTHY");

    const staleAt = new Date(Date.now() - DEFAULT_AGENT_STALE_THRESHOLD_MS - 5_000).toISOString();
    recordAgentHeartbeat({ agentId, timestamp: staleAt });

    const degradedAuthority = await getPrintingReadinessAuthority(restaurantId);
    expect(degradedAuthority.setupState).toBe("READY");
    expect(degradedAuthority.operationalState).toBe("DEGRADED");
  });
});
