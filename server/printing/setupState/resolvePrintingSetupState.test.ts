import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AGENT_STALE_THRESHOLD_MS } from "../../../shared/printing/agentHeartbeat";
import { clearAgentRegistry } from "../agentRegistry";
import { clearAgentRestaurantProjectionCache } from "../endpointRegistryCompatibility";
import { recordAgentHeartbeat } from "../agentLifecycleService";
import { clearPrinterBindingStatusStore } from "../printerBindingStatusStore";
import { recordPrinterBindingStatusReport } from "../printerBindingStatusService";
import { clearPrinterProfileStore } from "../printerProfileStore";
import { clearPrinterResolutionRegistry } from "../printerResolutionRegistry";
import {
  registerOfflineAgent,
  registerOnlineAgent,
  seedPrinterProfile,
  seedPrinterResolution,
  TEST_PROFILE_PRINTER_ID,
} from "../printingTestHelpers";
import { resolvePrintingSetupState } from "./resolvePrintingSetupState";
import { computeConfigurationRevision } from "./configurationRevision";
import { buildConfigurationRevisionFactor } from "./resolvePrinterSetupState";

vi.mock("../printerRepository", () => ({
  listPrintersForRestaurant: vi.fn(),
}));

vi.mock("../diagnosticPrintRepository", () => ({
  listPrintDiagnosticRunsForRestaurant: vi.fn(),
}));

import { listPrintersForRestaurant } from "../printerRepository";
import { listPrintDiagnosticRunsForRestaurant } from "../diagnosticPrintRepository";

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

const secondPrinter = {
  id: 11,
  restaurantId,
  name: "Bar",
  paperWidthMm: 80 as const,
  profileId: "bar-printer-11",
  isDefault: false,
  createdAt: "2026-06-24 00:00:00",
  updatedAt: "2026-06-24 00:00:00",
};

function seedBoundBinding(profileId = TEST_PROFILE_PRINTER_ID, logicalName = "Kitchen Printer") {
  recordPrinterBindingStatusReport({
    agentId,
    timestamp: "2026-06-24T12:34:56.000Z",
    bindings: [
      {
        profileId,
        logicalPrinterName: logicalName,
        bindingStatus: "BOUND",
        windowsPrinterName: "EPSON TM-T20III",
        portName: "USB001",
        lastValidatedAt: "2026-06-24T12:34:56.000Z",
      },
    ],
  });
}

function mockDiagnostics(
  rows: Array<{
    diagnosticId: string;
    printerId: number;
    status: "pending" | "accepted" | "completed" | "failed";
    completedAt?: string | null;
    agentId?: string | null;
    createdAt?: string;
  }> = []
) {
  vi.mocked(listPrintDiagnosticRunsForRestaurant).mockResolvedValue(
    rows.map((row, index) => ({
      id: index + 1,
      diagnosticId: row.diagnosticId,
      restaurantId,
      printerId: row.printerId,
      agentId: row.agentId ?? agentId,
      triggeredByUserId: 1,
      triggeredByLabel: "tester",
      status: row.status,
      error: null,
      createdAt: row.createdAt ?? "2026-06-24T13:00:00.000Z",
      completedAt: row.completedAt ?? null,
    }))
  );
}

describe("resolvePrintingSetupState THERMAL-PRINTING-13I.3B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentRestaurantProjectionCache();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearPrinterBindingStatusStore();
    mockDiagnostics();
  });

  it("returns NO_PRINTERS when restaurant has no printers", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([]);

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("NO_PRINTERS");
    expect(status.operationalState).toBe("HEALTHY");
    expect(status.nextAction).toBe("CREATE_PRINTER");
    expect(status.checklist.printerCreated).toBe(false);
  });

  it("returns AWAITING_AGENT when printers exist but no relevant online agent", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("AWAITING_AGENT");
    expect(status.nextAction).toBe("INSTALL_AGENT");
    expect(status.checklist.printerCreated).toBe(true);
    expect(status.checklist.agentConnected).toBe(false);
  });

  it("returns CONNECT_AGENT when relevant agent is registered but offline", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOfflineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("AWAITING_AGENT");
    expect(status.nextAction).toBe("CONNECT_AGENT");
  });

  it("returns AGENT_CONNECTED when agent is online but binding report is pending", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("AGENT_CONNECTED");
    expect(status.nextAction).toBe("BIND_PRINTER");
    expect(status.printers[0]?.setupState).toBe("BINDING_UNKNOWN");
  });

  it("returns BINDING_REQUIRED when agent reports UNBOUND", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
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
          message: "No Windows printer selected yet.",
        },
      ],
    });

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("BINDING_REQUIRED");
    expect(status.nextAction).toBe("BIND_PRINTER");
    expect(status.severity).toBe("warning");
  });

  it("returns BINDING_INVALID when agent reports MISSING_PRINTER", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    recordPrinterBindingStatusReport({
      agentId,
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [
        {
          profileId: TEST_PROFILE_PRINTER_ID,
          logicalPrinterName: "Kitchen",
          bindingStatus: "MISSING_PRINTER",
          windowsPrinterName: "EPSON TM-T20III",
          portName: "USB001",
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
        },
      ],
    });

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("BINDING_INVALID");
    expect(status.nextAction).toBe("FIX_BINDING");
    expect(status.severity).toBe("error");
  });

  it("returns READY_FOR_TEST when all printers are bound but diagnostic is missing", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    seedBoundBinding();

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("READY_FOR_TEST");
    expect(status.nextAction).toBe("RUN_TEST_PRINT");
    expect(status.checklist.printerBound).toBe(true);
    expect(status.checklist.testPrintPassed).toBe(false);
  });

  it("returns READY when bound and diagnostic is valid for current configuration", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    seedBoundBinding();
    mockDiagnostics([
      {
        diagnosticId: "diag_ready",
        printerId: 10,
        status: "completed",
        completedAt: "2026-06-24T14:00:00.000Z",
        agentId,
      },
    ]);

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("READY");
    expect(status.operationalState).toBe("HEALTHY");
    expect(status.nextAction).toBe("NONE");
    expect(status.checklist.testPrintPassed).toBe(true);
    expect(status.diagnosticValidation.validForCurrentConfiguration).toBe(true);
  });

  it("keeps setupState READY but marks operationalState DEGRADED when agent goes offline", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    seedBoundBinding();
    mockDiagnostics([
      {
        diagnosticId: "diag_ready",
        printerId: 10,
        status: "completed",
        completedAt: "2026-06-24T14:00:00.000Z",
        agentId,
      },
    ]);

    const staleAt = new Date(Date.now() - DEFAULT_AGENT_STALE_THRESHOLD_MS - 5_000).toISOString();
    recordAgentHeartbeat({ agentId, timestamp: staleAt });

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("READY");
    expect(status.operationalState).toBe("DEGRADED");
    expect(status.severity).toBe("warning");
  });

  it("returns operationalState BLOCKED for ownership conflicts without emitting READY", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([
      {
        ...samplePrinter,
        restaurantId: 720002,
      },
    ]);
    registerOnlineAgent("mineuqr-agent-720007");
    seedPrinterProfile("mineuqr-agent-720007", TEST_PROFILE_PRINTER_ID);

    const status = await resolvePrintingSetupState(720002);

    expect(status.operationalState).toBe("BLOCKED");
    expect(status.setupState).not.toBe("READY");
    expect(status.nextAction).toBe("RESOLVE_CONFLICT");
    expect(status.severity).toBe("error");
  });

  it("invalidates READY after binding changes via configuration revision", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    seedBoundBinding();
    mockDiagnostics([
      {
        diagnosticId: "diag_stale",
        printerId: 10,
        status: "completed",
        completedAt: "2026-06-24T11:00:00.000Z",
        agentId,
      },
    ]);

    const beforeRebind = await resolvePrintingSetupState(restaurantId);
    expect(beforeRebind.setupState).toBe("READY_FOR_TEST");

    recordPrinterBindingStatusReport({
      agentId,
      timestamp: "2026-06-24T15:00:00.000Z",
      bindings: [
        {
          profileId: TEST_PROFILE_PRINTER_ID,
          logicalPrinterName: "Kitchen",
          bindingStatus: "BOUND",
          windowsPrinterName: "EPSON TM-T88VI",
          portName: "USB002",
          lastValidatedAt: "2026-06-24T15:00:00.000Z",
        },
      ],
    });

    const afterRebind = await resolvePrintingSetupState(restaurantId);
    expect(afterRebind.setupState).toBe("READY_FOR_TEST");
    expect(afterRebind.diagnosticValidation.validForCurrentConfiguration).toBe(false);
  });

  it("invalidates diagnostic when assigned agent changes", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    seedBoundBinding();
    mockDiagnostics([
      {
        diagnosticId: "diag_other_agent",
        printerId: 10,
        status: "completed",
        completedAt: "2026-06-24T14:00:00.000Z",
        agentId: "mineuqr-agent-999999",
      },
    ]);

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("READY_FOR_TEST");
    expect(status.diagnosticValidation.validForCurrentConfiguration).toBe(false);
  });

  it("uses worst-case printer state for multi-printer restaurants", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter, secondPrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    seedPrinterResolution({ agentId, dbPrinterId: 11, profilePrinterId: "bar-printer-11" });
    seedBoundBinding(TEST_PROFILE_PRINTER_ID, "Kitchen");
    recordPrinterBindingStatusReport({
      agentId,
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [
        {
          profileId: TEST_PROFILE_PRINTER_ID,
          logicalPrinterName: "Kitchen",
          bindingStatus: "BOUND",
          windowsPrinterName: "EPSON TM-T20III",
          portName: "USB001",
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
        },
        {
          profileId: "bar-printer-11",
          logicalPrinterName: "Bar",
          bindingStatus: "UNBOUND",
          windowsPrinterName: null,
          portName: null,
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
        },
      ],
    });

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).toBe("BINDING_REQUIRED");
    expect(status.printers).toHaveLength(2);
    expect(status.printers.find((printer) => printer.printerId === 11)?.setupState).toBe(
      "BINDING_REQUIRED"
    );
  });

  it("coerces impossible READY without bound printers to BINDING_REQUIRED", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
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
    mockDiagnostics([
      {
        diagnosticId: "diag_impossible",
        printerId: 10,
        status: "completed",
        completedAt: "2026-06-24T14:00:00.000Z",
        agentId,
      },
    ]);

    const status = await resolvePrintingSetupState(restaurantId);

    expect(status.setupState).not.toBe("READY");
    expect(status.setupState).toBe("BINDING_REQUIRED");
  });

  it("recovers to READY after binding fix and new diagnostic", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });
    recordPrinterBindingStatusReport({
      agentId,
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [
        {
          profileId: TEST_PROFILE_PRINTER_ID,
          logicalPrinterName: "Kitchen",
          bindingStatus: "INVALID_BINDING",
          windowsPrinterName: "Wrong Printer",
          portName: "USB001",
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
        },
      ],
    });

    const broken = await resolvePrintingSetupState(restaurantId);
    expect(broken.setupState).toBe("BINDING_INVALID");

    seedBoundBinding();
    mockDiagnostics([
      {
        diagnosticId: "diag_recovered",
        printerId: 10,
        status: "completed",
        completedAt: "2026-06-24T16:00:00.000Z",
        agentId,
      },
    ]);

    const recovered = await resolvePrintingSetupState(restaurantId);
    expect(recovered.setupState).toBe("READY");
    expect(recovered.operationalState).toBe("HEALTHY");
  });

  it("changes configuration revision when primary printer assignment changes", () => {
    const before = computeConfigurationRevision([
      buildConfigurationRevisionFactor({
        printer: samplePrinter,
        binding: {
          printerId: 10,
          profileId: TEST_PROFILE_PRINTER_ID,
          logicalPrinterName: "Kitchen",
          agentId,
          bindingStatus: "BOUND",
          windowsPrinterName: "EPSON",
          portName: "USB001",
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
          message: null,
        },
      }),
    ]);

    const after = computeConfigurationRevision([
      buildConfigurationRevisionFactor({
        printer: { ...samplePrinter, isDefault: false },
        binding: {
          printerId: 10,
          profileId: TEST_PROFILE_PRINTER_ID,
          logicalPrinterName: "Kitchen",
          agentId: "mineuqr-agent-999999",
          bindingStatus: "BOUND",
          windowsPrinterName: "EPSON",
          portName: "USB001",
          lastValidatedAt: "2026-06-24T15:00:00.000Z",
          message: null,
        },
      }),
    ]);

    expect(before.revision).not.toBe(after.revision);
    expect(after.invalidationEpoch).toBe("2026-06-24T15:00:00.000Z");
  });

  it("includes support details when requested", async () => {
    vi.mocked(listPrintersForRestaurant).mockResolvedValue([samplePrinter]);
    registerOnlineAgent(agentId);
    seedPrinterResolution({ agentId, dbPrinterId: 10 });

    const status = await resolvePrintingSetupState(restaurantId, { includeSupport: true });

    expect(status.support?.legacyProvisioningStep).toBeDefined();
    expect(status.support?.discoveryCounts).toBeDefined();
    expect(status.support?.bindingStatus).toBeDefined();
  });
});
