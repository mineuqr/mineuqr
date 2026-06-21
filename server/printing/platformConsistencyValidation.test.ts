import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import type { PlatformCapabilities } from "../../shared/printing/platformCapabilities";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import { validatePlatformConsistency } from "./platformConsistencyValidator";
import { getPlatformConsistency } from "./platformConsistencyQueries";
import { processAgentPlatformCapabilitiesReport } from "./platformCapabilityNegotiationFlow";
import { recordPlatformCapabilitiesReport } from "./platformCapabilityService";
import {
  clearPlatformCapabilityStore,
  getStoredAgentPlatformCapabilities,
} from "./platformCapabilityStore";

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

const windowsCapabilities: PlatformCapabilities = {
  platform: "windows",
  transports: { usb: true, network: true, bluetooth: false },
  execution: { localPrinting: true },
};

const androidCapabilities: PlatformCapabilities = {
  platform: "android",
  transports: { usb: false, network: true, bluetooth: true },
  execution: { localPrinting: true },
};

const iosCapabilities: PlatformCapabilities = {
  platform: "ios",
  transports: { usb: false, network: true, bluetooth: true },
  execution: { localPrinting: false },
};

function registerOnlineAgent(agentId: string, platform: AgentPlatform): void {
  registerAgent({
    identity: {
      agentId,
      platform,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: new Date().toISOString(),
  });
}

function reportInput(
  agentId: string,
  capabilities: PlatformCapabilities,
  timestamp: string
) {
  return {
    agentId,
    timestamp,
    platform: capabilities.platform,
    capabilities: {
      transports: capabilities.transports,
      execution: capabilities.execution,
    },
  };
}

describe("platformConsistencyValidation THERMAL-PRINTING-8D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPlatformCapabilityStore();
  });

  describe("Scenario A — windows == windows", () => {
    it("accepts matching Windows platform identity", () => {
      registerOnlineAgent("agent-windows", "windows");

      const result = processAgentPlatformCapabilitiesReport(
        reportInput("agent-windows", windowsCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result.accepted).toBe(true);
      expect(getStoredAgentPlatformCapabilities("agent-windows")).toBeDefined();
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: OPS_EVENT.print_agent_platform_match })
      );
    });
  });

  describe("Scenario B — android == android", () => {
    it("accepts matching Android platform identity", () => {
      registerOnlineAgent("agent-android", "android");

      const result = processAgentPlatformCapabilitiesReport(
        reportInput("agent-android", androidCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result.accepted).toBe(true);
    });
  });

  describe("Scenario C — ios == ios", () => {
    it("accepts matching iOS platform identity", () => {
      registerOnlineAgent("agent-ios", "ios");

      const result = processAgentPlatformCapabilitiesReport(
        reportInput("agent-ios", iosCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result.accepted).toBe(true);
    });
  });

  describe("Scenario D — windows != android", () => {
    it("rejects mismatched Android capability reports for Windows agents", () => {
      registerOnlineAgent("agent-windows", "windows");

      const result = processAgentPlatformCapabilitiesReport(
        reportInput("agent-windows", androidCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result.accepted).toBe(false);
      expect(getStoredAgentPlatformCapabilities("agent-windows")).toBeUndefined();
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.print_agent_platform_mismatch,
          metadata: {
            agentId: "agent-windows",
            helloPlatform: "windows",
            capabilityPlatform: "android",
          },
        })
      );
    });
  });

  describe("Scenario E — windows != ios", () => {
    it("rejects mismatched iOS capability reports for Windows agents", () => {
      registerOnlineAgent("agent-windows", "windows");

      const result = recordPlatformCapabilitiesReport(
        reportInput("agent-windows", iosCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result.accepted).toBe(false);
      if (!result.accepted) {
        expect(result.platformMismatch).toMatchObject({
          helloPlatform: "windows",
          capabilityPlatform: "ios",
          consistent: false,
        });
      }
      expect(getStoredAgentPlatformCapabilities("agent-windows")).toBeUndefined();
    });
  });

  describe("Scenario F — query consistency state", () => {
    it("returns correct consistency data for matching and mismatched agents", () => {
      registerOnlineAgent("agent-match", "windows");
      registerOnlineAgent("agent-pending", "android");

      processAgentPlatformCapabilitiesReport(
        reportInput("agent-match", windowsCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(getPlatformConsistency("agent-match")).toEqual({
        agentId: "agent-match",
        helloPlatform: "windows",
        capabilityPlatform: "windows",
        consistent: true,
      });
      expect(getPlatformConsistency("agent-pending")).toEqual({
        agentId: "agent-pending",
        helloPlatform: "android",
        capabilityPlatform: undefined,
        consistent: false,
      });
      expect(getPlatformConsistency("missing-agent")).toBeUndefined();
    });
  });

  it("validates platform identity deterministically", () => {
    expect(
      validatePlatformConsistency({
        agentId: "agent-1",
        helloPlatform: "windows",
        capabilityPlatform: "windows",
      })
    ).toMatchObject({ consistent: true });

    expect(
      validatePlatformConsistency({
        agentId: "agent-1",
        helloPlatform: "windows",
        capabilityPlatform: "android",
      })
    ).toMatchObject({
      consistent: false,
      reason: "Platform identity mismatch: hello=windows, capability=android",
    });
  });
});
