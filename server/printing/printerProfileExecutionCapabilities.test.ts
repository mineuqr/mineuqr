import { beforeEach, describe, expect, it } from "vitest";
import { buildExecutionStrategyPrinterCharacteristics } from "../../shared/printing/executionStrategy";
import {
  DEFAULT_PRINTER_PROFILE_EXECUTION_CAPABILITIES,
  validatePrinterProfile,
  validatePrinterProfileExecutionCapabilities,
  type PrinterProfile,
} from "../../shared/printing/printerProfiles";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import { buildExecutionContext } from "./executionContextBuilder";
import { resolveExecutionStrategyFromContext } from "./executionContextQueries";
import { clearPlatformCapabilityStore, upsertAgentPlatformCapabilities } from "./platformCapabilityStore";
import { clearPrinterProfileStore, replaceAgentPrinterInventory } from "./printerProfileStore";
import { resolveExecutionStrategy } from "./executionStrategyResolver";
import { sampleProfile, TEST_PROFILE_PRINTER_ID } from "./printingTestHelpers";

const baseProfile: PrinterProfile = {
  printerId: "printer-1",
  printerName: "Test Printer",
  transport: "network",
  capabilities: {
    escpos: false,
    cutter: false,
    cashDrawer: false,
    qrCode: false,
    imagePrinting: false,
  },
  executionCapabilities: {
    airprint: false,
    vendorSdk: false,
  },
  paperWidth: 80,
};

function seedAgentWithProfile(agentId: string, profile: PrinterProfile): void {
  registerAgent({
    identity: {
      agentId,
      platform: "ios",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: "2026-06-18T10:00:00.000Z",
  });
  replaceAgentPrinterInventory({
    agentId,
    timestamp: "2026-06-18T10:00:00.000Z",
    profiles: [profile],
  });
  upsertAgentPlatformCapabilities({
    agentId,
    timestamp: "2026-06-18T10:00:00.000Z",
    capabilities: {
      platform: "ios",
      transports: { usb: false, network: true, bluetooth: false },
      execution: { localPrinting: false },
    },
  });
}

describe("printerProfileExecutionCapabilities THERMAL-PRINTING-7F.1", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPlatformCapabilityStore();
  });

  describe("Scenario A — AirPrint capability stored in Printer Profile", () => {
    it("persists airprint execution capability on the profile contract", () => {
      const profile = validatePrinterProfile({
        ...baseProfile,
        executionCapabilities: { airprint: true, vendorSdk: false },
      });

      expect(profile.executionCapabilities.airprint).toBe(true);
    });
  });

  describe("Scenario B — Vendor SDK capability stored in Printer Profile", () => {
    it("persists vendor SDK capability and identification on the profile contract", () => {
      const profile = validatePrinterProfile({
        ...baseProfile,
        executionCapabilities: {
          airprint: false,
          vendorSdk: true,
          vendorSdkId: "star-io",
        },
      });

      expect(profile.executionCapabilities).toEqual({
        airprint: false,
        vendorSdk: true,
        vendorSdkId: "star-io",
      });
    });
  });

  describe("Scenario C — Execution Context consumes profile capability data", () => {
    it("builds execution context printer fields from profile executionCapabilities", () => {
      seedAgentWithProfile("agent-ios", {
        ...baseProfile,
        executionCapabilities: { airprint: true, vendorSdk: false },
      });

      const result = buildExecutionContext({
        agentId: "agent-ios",
        printerId: "printer-1",
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(result.context.printer.airprintCapable).toBe(true);
      expect(result.context.printer.vendorSdkCapable).toBe(false);
    });
  });

  describe("Scenario D — Execution Strategy consumes profile capability data", () => {
    it("resolves iOS airprint strategy from profile executionCapabilities", () => {
      const profile = validatePrinterProfile({
        ...baseProfile,
        executionCapabilities: { airprint: true, vendorSdk: false },
      });

      const result = resolveExecutionStrategy({
        platform: "ios",
        printer: buildExecutionStrategyPrinterCharacteristics(profile),
      });

      expect(result).toMatchObject({
        resolved: true,
        method: "airprint",
      });
    });
  });

  describe("Scenario E — Legacy compatibility behavior", () => {
    it("defaults missing executionCapabilities to safe false values", () => {
      expect(validatePrinterProfileExecutionCapabilities(undefined)).toEqual(
        DEFAULT_PRINTER_PROFILE_EXECUTION_CAPABILITIES
      );

      const profile = validatePrinterProfile({
        printerId: "legacy-printer",
        printerName: "Legacy",
        transport: "usb",
        capabilities: baseProfile.capabilities,
        paperWidth: 80,
      } as PrinterProfile);

      expect(profile.executionCapabilities).toEqual(
        DEFAULT_PRINTER_PROFILE_EXECUTION_CAPABILITIES
      );
    });
  });

  describe("Scenario F — Deterministic profile mapping", () => {
    it("maps identical profiles to identical strategy characteristics", () => {
      const profile = validatePrinterProfile({
        ...baseProfile,
        executionCapabilities: {
          airprint: false,
          vendorSdk: true,
          vendorSdkId: "epson-epos",
        },
      });

      expect(buildExecutionStrategyPrinterCharacteristics(profile)).toEqual(
        buildExecutionStrategyPrinterCharacteristics(profile)
      );
    });
  });

  describe("Scenario G — No external capability flags required", () => {
    it("resolves strategy from execution context without supplemental flags", () => {
      seedAgentWithProfile("agent-ios", {
        ...baseProfile,
        executionCapabilities: {
          airprint: false,
          vendorSdk: true,
          vendorSdkId: "star-io",
        },
      });

      const built = buildExecutionContext({
        agentId: "agent-ios",
        printerId: "printer-1",
      });

      expect(built.built).toBe(true);
      if (!built.built) return;

      expect(resolveExecutionStrategyFromContext(built.context)).toMatchObject({
        resolved: true,
        method: "vendor-sdk",
      });
    });
  });

  describe("Scenario H — Immutable profile structures", () => {
    it("stores executionCapabilities independently from later source mutations", () => {
      const sourceProfile = {
        ...sampleProfile,
        executionCapabilities: { airprint: false, vendorSdk: false },
      };

      const stored = replaceAgentPrinterInventory({
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        profiles: [sourceProfile],
      });

      sourceProfile.executionCapabilities.airprint = true;

      expect(stored.record.profiles[0].executionCapabilities.airprint).toBe(false);
    });
  });
});
