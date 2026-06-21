import { beforeEach, describe, expect, it } from "vitest";
import { AGENT_PRINTER_PROFILE_MESSAGE_TYPES } from "../../shared/printing/printerProfiles";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { handleAgentWebSocketInboundMessage } from "./agentWebSocketInboundHandler";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import { recordPrinterProfilesReport } from "./printerProfileService";
import { processAgentPrinterProfilesReport } from "./printerProfileNegotiationFlow";
import {
  clearPrinterProfileStore,
  getStoredAgentPrinterInventory,
} from "./printerProfileStore";
import {
  getAgentPrinterProfiles,
  getPrinterProfile,
} from "./printerProfileQueries";

const usbProfile = {
  printerId: "printer-usb-1",
  printerName: "Kitchen USB",
  transport: "usb" as const,
  capabilities: {
    escpos: true,
    cutter: false,
    cashDrawer: false,
    qrCode: true,
    imagePrinting: false,
  },
  executionCapabilities: {
    airprint: false,
    vendorSdk: false,
  },
  paperWidth: 80 as const,
};

const networkProfile = {
  printerId: "printer-net-1",
  printerName: "Receipt Network",
  transport: "network" as const,
  capabilities: {
    escpos: true,
    cutter: true,
    cashDrawer: true,
    qrCode: false,
    imagePrinting: true,
  },
  executionCapabilities: {
    airprint: false,
    vendorSdk: false,
  },
  paperWidth: 58 as const,
};

function registerOnlineAgent(agentId: string): void {
  registerAgent({
    identity: {
      agentId,
      platform: "windows",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: new Date().toISOString(),
  });
}

describe("printerProfileNegotiation THERMAL-PRINTING-7F", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearPrinterProfileStore();
  });

  describe("Scenario A — single printer", () => {
    it("accepts a single-printer inventory report", () => {
      registerOnlineAgent("agent-alpha");

      const result = recordPrinterProfilesReport({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [usbProfile],
      });

      expect(result.accepted).toBe(true);
      if (result.accepted) {
        expect(result.record.profiles).toHaveLength(1);
      }
      expect(getPrinterProfile("agent-alpha", "printer-usb-1")?.printerName).toBe(
        "Kitchen USB"
      );
    });
  });

  describe("Scenario B — multiple printers", () => {
    it("accepts multi-printer inventory reports", () => {
      registerOnlineAgent("agent-alpha");

      const result = recordPrinterProfilesReport({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [usbProfile, networkProfile],
      });

      expect(result.accepted).toBe(true);
      expect(getAgentPrinterProfiles("agent-alpha")?.profiles).toHaveLength(2);
    });
  });

  describe("Scenario C — unknown agent", () => {
    it("rejects inventory reports from unregistered agents", () => {
      const result = recordPrinterProfilesReport({
        agentId: "unknown-agent",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [usbProfile],
      });

      expect(result).toEqual({ accepted: false, reason: "Agent not registered" });
    });
  });

  describe("Scenario D — duplicate inventory", () => {
    it("accepts duplicate inventory reports idempotently", () => {
      registerOnlineAgent("agent-alpha");

      const first = processAgentPrinterProfilesReport({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [usbProfile],
      });
      const second = processAgentPrinterProfilesReport({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [usbProfile],
      });

      expect(first).toMatchObject({ accepted: true, duplicate: false });
      expect(second).toMatchObject({ accepted: true, duplicate: true });
    });
  });

  describe("Scenario E — inventory replacement", () => {
    it("replaces stored inventory when a newer report arrives", () => {
      registerOnlineAgent("agent-alpha");

      recordPrinterProfilesReport({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [usbProfile],
      });
      recordPrinterProfilesReport({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:02.000Z",
        printers: [networkProfile],
      });

      expect(getStoredAgentPrinterInventory("agent-alpha")).toMatchObject({
        timestamp: "2026-06-18T10:00:02.000Z",
        profiles: [networkProfile],
      });
      expect(getPrinterProfile("agent-alpha", "printer-usb-1")).toBeUndefined();
    });
  });

  describe("Scenario F — invalid profile", () => {
    it("rejects malformed profiles and duplicate printer IDs", () => {
      registerOnlineAgent("agent-alpha");

      const invalidTransport = recordPrinterProfilesReport({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [{ ...usbProfile, transport: "serial" as "usb" }],
      });
      const duplicateIds = recordPrinterProfilesReport({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:01.000Z",
        printers: [usbProfile, { ...usbProfile, printerName: "Duplicate" }],
      });

      expect(invalidTransport.accepted).toBe(false);
      expect(duplicateIds.accepted).toBe(false);
    });
  });

  it("routes inventory reports through WebSocket inbound handler", async () => {
    registerOnlineAgent("agent-alpha");

    const connection = {
      readyState: 1,
      send() {},
      close() {},
    };

    await handleAgentWebSocketInboundMessage(
      JSON.stringify({
        type: AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        printers: [usbProfile],
      }),
      connection
    );

    expect(getAgentPrinterProfiles("agent-alpha")?.profiles).toEqual([usbProfile]);
  });
});
