import { beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_PRINTER_BINDING_MESSAGE_TYPES } from "../../shared/printing/printerBindingReport";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { handleAgentWebSocketInboundMessage } from "./agentWebSocketInboundHandler";
import { clearAgentRegistry } from "./agentRegistry";
import { processAgentPrinterBindingStatusReport } from "./printerBindingStatusNegotiationFlow";
import { recordPrinterBindingStatusReport } from "./printerBindingStatusService";
import {
  clearPrinterBindingStatusStore,
  getStoredPrinterBindingStatus,
} from "./printerBindingStatusStore";
import { getPrintDiscoveryDiagnostics } from "./printOperationsDiscoveryService";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import {
  registerOnlineAgent,
  seedPrinterResolution,
  TEST_PROFILE_PRINTER_ID,
} from "./printingTestHelpers";

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

const boundBinding = {
  profileId: TEST_PROFILE_PRINTER_ID,
  logicalPrinterName: "Kitchen Printer",
  bindingStatus: "BOUND" as const,
  windowsPrinterName: "EPSON TM-T20III",
  portName: "USB001",
  lastValidatedAt: "2026-06-24T12:34:56.000Z",
};

describe("printerBindingStatus THERMAL-PRINTING-13I.3A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrinterBindingStatusStore();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
  });

  it("accepts binding status report for registered agent", () => {
    registerOnlineAgent("mineuqr-agent-720007");

    const result = recordPrinterBindingStatusReport({
      agentId: "mineuqr-agent-720007",
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [boundBinding],
    });

    expect(result.accepted).toBe(true);
    expect(getStoredPrinterBindingStatus("mineuqr-agent-720007", TEST_PROFILE_PRINTER_ID)).toEqual(
      boundBinding
    );
  });

  it("rejects binding report for unregistered agent", () => {
    const result = recordPrinterBindingStatusReport({
      agentId: "mineuqr-agent-720007",
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [boundBinding],
    });

    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe("Agent not registered");
    }
  });

  it("ingests binding report from websocket message", () => {
    registerOnlineAgent("mineuqr-agent-720007");

    handleAgentWebSocketInboundMessage(
      JSON.stringify({
        type: AGENT_PRINTER_BINDING_MESSAGE_TYPES.BINDING_REPORT,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: "mineuqr-agent-720007",
        timestamp: "2026-06-24T12:35:00.000Z",
        bindings: [
          {
            ...boundBinding,
            bindingStatus: "UNBOUND",
            windowsPrinterName: null,
            portName: null,
            message: "No Windows printer selected yet.",
          },
        ],
      }),
      { send: () => undefined }
    );

    expect(
      getStoredPrinterBindingStatus("mineuqr-agent-720007", TEST_PROFILE_PRINTER_ID)?.bindingStatus
    ).toBe("UNBOUND");
  });

  it("exposes binding status through discovery diagnostics", async () => {
    registerOnlineAgent("mineuqr-agent-720007");
    processAgentPrinterBindingStatusReport({
      agentId: "mineuqr-agent-720007",
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [boundBinding],
    });
    seedPrinterResolution({ agentId: "mineuqr-agent-720007" });

    vi.mocked(listPrintersForRestaurant).mockResolvedValue([
      {
        id: 10,
        restaurantId: 720007,
        name: "Kitchen Printer",
        paperWidthMm: 80,
        profileId: TEST_PROFILE_PRINTER_ID,
        isDefault: true,
        createdAt: "2026-06-24 00:00:00",
        updatedAt: "2026-06-24 00:00:00",
      },
    ]);

    const diagnostics = await getPrintDiscoveryDiagnostics(720007, [
      {
        id: 10,
        name: "Kitchen Printer",
        profileId: TEST_PROFILE_PRINTER_ID,
        transport: "usb",
        isActive: true,
        isDefault: true,
        lastActivityAt: null,
      },
    ]);

    expect(diagnostics.bindingStatus).toEqual([
      expect.objectContaining({
        printerId: 10,
        profileId: TEST_PROFILE_PRINTER_ID,
        logicalPrinterName: "Kitchen Printer",
        agentId: "mineuqr-agent-720007",
        bindingStatus: "BOUND",
        windowsPrinterName: "EPSON TM-T20III",
        portName: "USB001",
        lastValidatedAt: "2026-06-24T12:34:56.000Z",
      }),
    ]);
  });

  it("survives agent reconnect with latest report retained", () => {
    registerOnlineAgent("mineuqr-agent-720007");

    processAgentPrinterBindingStatusReport({
      agentId: "mineuqr-agent-720007",
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [boundBinding],
    });

    clearAgentRegistry();

    expect(getStoredPrinterBindingStatus("mineuqr-agent-720007", TEST_PROFILE_PRINTER_ID)).toEqual(
      boundBinding
    );
  });
});
