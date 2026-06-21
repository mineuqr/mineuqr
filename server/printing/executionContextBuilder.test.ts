import { beforeEach, describe, expect, it } from "vitest";
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import type { PlatformCapabilities } from "../../shared/printing/platformCapabilities";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { executionContextToStrategyInput } from "../../shared/printing/executionContext";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import { buildExecutionContext } from "./executionContextBuilder";
import {
  getExecutionContextAvailability,
  getExecutionContextCapabilities,
  isExecutionTransportAvailable,
  resolveExecutionStrategyFromContext,
  supportsExecutionMethod,
  supportsExecutionTransport,
} from "./executionContextQueries";
import {
  clearPlatformCapabilityStore,
  upsertAgentPlatformCapabilities,
} from "./platformCapabilityStore";
import { clearPrinterProfileStore, replaceAgentPrinterInventory } from "./printerProfileStore";
import { resolveExecutionStrategy } from "./executionStrategyResolver";
import { sampleProfile, TEST_PROFILE_PRINTER_ID } from "./printingTestHelpers";

const windowsPlatformReport: PlatformCapabilities = {
  platform: "windows",
  transports: { usb: true, network: true, bluetooth: false },
  execution: { localPrinting: true },
};

const androidPlatformReport: PlatformCapabilities = {
  platform: "android",
  transports: { usb: true, network: true, bluetooth: true },
  execution: { localPrinting: true },
};

const iosPlatformReport: PlatformCapabilities = {
  platform: "ios",
  transports: { usb: false, network: true, bluetooth: true },
  execution: { localPrinting: false },
};

function seedExecutionContextSources(input: {
  agentId: string;
  platform: AgentPlatform;
  platformReport: PlatformCapabilities;
  profile?: typeof sampleProfile;
}): void {
  registerAgent({
    identity: {
      agentId: input.agentId,
      platform: input.platform,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: "2026-06-18T10:00:00.000Z",
  });
  replaceAgentPrinterInventory({
    agentId: input.agentId,
    timestamp: "2026-06-18T10:00:00.000Z",
    profiles: [input.profile ?? sampleProfile],
  });
  upsertAgentPlatformCapabilities({
    agentId: input.agentId,
    timestamp: "2026-06-18T10:00:00.000Z",
    capabilities: input.platformReport,
  });
}

describe("executionContextBuilder THERMAL-PRINTING-9C", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPlatformCapabilityStore();
  });

  describe("Scenario A — Windows context creation", () => {
    it("builds a normalized Windows execution context", () => {
      seedExecutionContextSources({
        agentId: "agent-windows",
        platform: "windows",
        platformReport: windowsPlatformReport,
      });

      const result = buildExecutionContext({
        agentId: "agent-windows",
        printerId: TEST_PROFILE_PRINTER_ID,
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(result.context.platform.identity).toBe("windows");
      expect(result.context.agent.platform).toBe("windows");
      expect(result.context.printer.printerId).toBe(TEST_PROFILE_PRINTER_ID);
    });
  });

  describe("Scenario B — Android context creation", () => {
    it("builds a normalized Android execution context", () => {
      seedExecutionContextSources({
        agentId: "agent-android",
        platform: "android",
        platformReport: androidPlatformReport,
        profile: { ...sampleProfile, transport: "bluetooth" },
      });

      const result = buildExecutionContext({
        agentId: "agent-android",
        printerId: TEST_PROFILE_PRINTER_ID,
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(result.context.platform.identity).toBe("android");
      expect(result.context.printer.transport).toBe("bluetooth");
    });
  });

  describe("Scenario C — iOS context creation", () => {
    it("builds a normalized iOS execution context", () => {
      seedExecutionContextSources({
        agentId: "agent-ios",
        platform: "ios",
        platformReport: iosPlatformReport,
        profile: { ...sampleProfile, transport: "network", capabilities: { ...sampleProfile.capabilities, escpos: false } },
      });

      const result = buildExecutionContext({
        agentId: "agent-ios",
        printerId: TEST_PROFILE_PRINTER_ID,
        printerOptions: { airprintCapable: true },
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(result.context.platform.identity).toBe("ios");
      expect(result.context.printer.airprintCapable).toBe(true);
    });
  });

  describe("Scenario D — capability matrix integration", () => {
    it("derives canonical capabilities from the 9A matrix", () => {
      seedExecutionContextSources({
        agentId: "agent-windows",
        platform: "windows",
        platformReport: windowsPlatformReport,
      });

      const result = buildExecutionContext({
        agentId: "agent-windows",
        printerId: TEST_PROFILE_PRINTER_ID,
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(getExecutionContextCapabilities(result.context)).toEqual({
        supportedMethods: ["raw-escpos", "spooler"],
        supportedTransports: ["usb", "network"],
        supportsEscPos: true,
        supportsLocalExecution: true,
      });
    });
  });

  describe("Scenario E — availability normalization", () => {
    it("derives runtime availability separately from platform capability reports", () => {
      seedExecutionContextSources({
        agentId: "agent-android",
        platform: "android",
        platformReport: androidPlatformReport,
        profile: { ...sampleProfile, transport: "bluetooth" },
      });

      const result = buildExecutionContext({
        agentId: "agent-android",
        printerId: TEST_PROFILE_PRINTER_ID,
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(getExecutionContextAvailability(result.context)).toEqual({
        availableTransports: ["usb", "bluetooth", "network"],
        hasPlatformCapabilityReport: true,
        printerTransportAvailable: true,
      });
    });
  });

  describe("Scenario F — immutable contexts", () => {
    it("returns deeply frozen execution contexts", () => {
      seedExecutionContextSources({
        agentId: "agent-windows",
        platform: "windows",
        platformReport: windowsPlatformReport,
      });

      const result = buildExecutionContext({
        agentId: "agent-windows",
        printerId: TEST_PROFILE_PRINTER_ID,
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(Object.isFrozen(result.context)).toBe(true);
      expect(Object.isFrozen(result.context.capabilities)).toBe(true);
      expect(Object.isFrozen(result.context.availability)).toBe(true);
      expect(Object.isFrozen(result.context.capabilities.supportedMethods)).toBe(true);
    });
  });

  describe("Scenario G — query helper behavior", () => {
    it("answers capability and availability queries from the context", () => {
      seedExecutionContextSources({
        agentId: "agent-windows",
        platform: "windows",
        platformReport: windowsPlatformReport,
      });

      const result = buildExecutionContext({
        agentId: "agent-windows",
        printerId: TEST_PROFILE_PRINTER_ID,
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(supportsExecutionMethod(result.context, "raw-escpos")).toBe(true);
      expect(supportsExecutionMethod(result.context, "airprint")).toBe(false);
      expect(supportsExecutionTransport(result.context, "usb")).toBe(true);
      expect(isExecutionTransportAvailable(result.context, "usb")).toBe(true);
      expect(isExecutionTransportAvailable(result.context, "bluetooth")).toBe(false);
    });
  });

  describe("Scenario H — deterministic context generation", () => {
    it("produces identical contexts for identical inputs", () => {
      seedExecutionContextSources({
        agentId: "agent-windows",
        platform: "windows",
        platformReport: windowsPlatformReport,
      });

      const first = buildExecutionContext({
        agentId: "agent-windows",
        printerId: TEST_PROFILE_PRINTER_ID,
      });
      const second = buildExecutionContext({
        agentId: "agent-windows",
        printerId: TEST_PROFILE_PRINTER_ID,
      });

      expect(first).toEqual(second);
    });
  });

  describe("Scenario I — capability vs availability separation", () => {
    it("keeps matrix capabilities distinct from runtime availability", () => {
      seedExecutionContextSources({
        agentId: "agent-ios",
        platform: "ios",
        platformReport: {
          platform: "ios",
          transports: { usb: false, network: true, bluetooth: false },
          execution: { localPrinting: false },
        },
        profile: { ...sampleProfile, transport: "network" },
      });

      const result = buildExecutionContext({
        agentId: "agent-ios",
        printerId: TEST_PROFILE_PRINTER_ID,
      });

      expect(result.built).toBe(true);
      if (!result.built) return;

      expect(result.context.capabilities.supportedTransports).toEqual(["network"]);
      expect(result.context.availability.availableTransports).toEqual(["network"]);
      expect(supportsExecutionTransport(result.context, "bluetooth")).toBe(false);
      expect(isExecutionTransportAvailable(result.context, "bluetooth")).toBe(false);
      expect(result.context.capabilities.supportedMethods).toEqual([
        "airprint",
        "vendor-sdk",
        "bridge-agent",
      ]);
    });
  });

  it("rejects context building for unknown agents and printers", () => {
    expect(
      buildExecutionContext({
        agentId: "missing-agent",
        printerId: TEST_PROFILE_PRINTER_ID,
      })
    ).toEqual({ built: false, reason: "Agent not registered" });

    seedExecutionContextSources({
      agentId: "agent-windows",
      platform: "windows",
      platformReport: windowsPlatformReport,
    });

    expect(
      buildExecutionContext({
        agentId: "agent-windows",
        printerId: "missing-printer",
      })
    ).toEqual({ built: false, reason: "Printer profile not found" });
  });

  it("provides a 9B migration adapter without changing strategy behavior", () => {
    seedExecutionContextSources({
      agentId: "agent-windows",
      platform: "windows",
      platformReport: windowsPlatformReport,
    });

    const built = buildExecutionContext({
      agentId: "agent-windows",
      printerId: TEST_PROFILE_PRINTER_ID,
    });

    expect(built.built).toBe(true);
    if (!built.built) return;

    const legacy = resolveExecutionStrategy({
      platform: "windows",
      printer: {
        escposCapable: true,
        airprintCapable: false,
        vendorSdkCapable: false,
        transport: "usb",
      },
    });
    const fromContext = resolveExecutionStrategyFromContext(built.context);
    const adapted = resolveExecutionStrategy(executionContextToStrategyInput(built.context));

    expect(fromContext).toEqual(legacy);
    expect(adapted).toEqual(legacy);
  });
});
