import { beforeEach, describe, expect, it } from "vitest";
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import {
  AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES,
  type PlatformCapabilities,
} from "../../shared/printing/platformCapabilities";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { handleAgentWebSocketInboundMessage } from "./agentWebSocketInboundHandler";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import { recordPlatformCapabilitiesReport } from "./platformCapabilityService";
import { processAgentPlatformCapabilitiesReport } from "./platformCapabilityNegotiationFlow";
import {
  clearPlatformCapabilityStore,
  getStoredAgentPlatformCapabilities,
} from "./platformCapabilityStore";
import {
  getAgentPlatformCapabilities,
  getPlatformCapabilitySummary,
} from "./platformCapabilityQueries";

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

function registerOnlineAgent(agentId: string, platform: AgentPlatform = "windows"): void {
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

describe("platformCapabilityReporting THERMAL-PRINTING-8C", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearPlatformCapabilityStore();
  });

  describe("Scenario A — Windows capabilities", () => {
    it("accepts Windows platform capability reports", () => {
      registerOnlineAgent("agent-windows");

      const result = recordPlatformCapabilitiesReport(
        reportInput("agent-windows", windowsCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result.accepted).toBe(true);
      expect(getAgentPlatformCapabilities("agent-windows")).toMatchObject({
        capabilities: windowsCapabilities,
      });
    });
  });

  describe("Scenario B — Android capabilities", () => {
    it("accepts Android platform capability reports", () => {
      registerOnlineAgent("agent-android", "android");

      const result = recordPlatformCapabilitiesReport(
        reportInput("agent-android", androidCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result.accepted).toBe(true);
      expect(getAgentPlatformCapabilities("agent-android")?.capabilities.platform).toBe(
        "android"
      );
    });
  });

  describe("Scenario C — iOS capabilities", () => {
    it("accepts iOS platform capability reports", () => {
      registerOnlineAgent("agent-ios", "ios");

      const result = recordPlatformCapabilitiesReport(
        reportInput("agent-ios", iosCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result.accepted).toBe(true);
      expect(getAgentPlatformCapabilities("agent-ios")?.capabilities.execution).toEqual({
        localPrinting: false,
      });
    });
  });

  describe("Scenario D — unknown agent", () => {
    it("rejects capability reports from unregistered agents", () => {
      const result = recordPlatformCapabilitiesReport(
        reportInput("unknown-agent", windowsCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(result).toEqual({ accepted: false, reason: "Agent not registered" });
    });
  });

  describe("Scenario E — duplicate report", () => {
    it("accepts duplicate capability reports idempotently", () => {
      registerOnlineAgent("agent-alpha");

      const first = processAgentPlatformCapabilitiesReport(
        reportInput("agent-alpha", windowsCapabilities, "2026-06-18T10:00:00.000Z")
      );
      const second = processAgentPlatformCapabilitiesReport(
        reportInput("agent-alpha", windowsCapabilities, "2026-06-18T10:00:00.000Z")
      );

      expect(first).toMatchObject({ accepted: true, duplicate: false });
      expect(second).toMatchObject({ accepted: true, duplicate: true });
    });
  });

  describe("Scenario F — capability replacement", () => {
    it("replaces stored capabilities when a newer matching report arrives", () => {
      registerOnlineAgent("agent-alpha", "windows");

      const updatedWindowsCapabilities: PlatformCapabilities = {
        platform: "windows",
        transports: { usb: true, network: true, bluetooth: true },
        execution: { localPrinting: true },
      };

      recordPlatformCapabilitiesReport(
        reportInput("agent-alpha", windowsCapabilities, "2026-06-18T10:00:00.000Z")
      );
      recordPlatformCapabilitiesReport(
        reportInput("agent-alpha", updatedWindowsCapabilities, "2026-06-18T10:00:02.000Z")
      );

      expect(getStoredAgentPlatformCapabilities("agent-alpha")).toMatchObject({
        timestamp: "2026-06-18T10:00:02.000Z",
        capabilities: updatedWindowsCapabilities,
      });
    });
  });

  it("exposes platform capability summary via read-only queries", () => {
    registerOnlineAgent("agent-windows", "windows");
    registerOnlineAgent("agent-android", "android");
    registerOnlineAgent("agent-ios", "ios");

    recordPlatformCapabilitiesReport(
      reportInput("agent-windows", windowsCapabilities, "2026-06-18T10:00:00.000Z")
    );
    recordPlatformCapabilitiesReport(
      reportInput("agent-android", androidCapabilities, "2026-06-18T10:00:00.000Z")
    );
    recordPlatformCapabilitiesReport(
      reportInput("agent-ios", iosCapabilities, "2026-06-18T10:00:00.000Z")
    );

    expect(getPlatformCapabilitySummary()).toEqual({
      agentCount: 3,
      platforms: { windows: 1, android: 1, ios: 1 },
      transports: { usb: 1, network: 3, bluetooth: 2 },
      localPrintingAgents: 2,
    });
  });

  it("routes capability reports through WebSocket inbound handler", async () => {
    registerOnlineAgent("agent-alpha");

    const connection = {
      readyState: 1,
      send() {},
      close() {},
    };

    await handleAgentWebSocketInboundMessage(
      JSON.stringify({
        type: AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: "agent-alpha",
        timestamp: "2026-06-18T10:00:00.000Z",
        platform: windowsCapabilities.platform,
        capabilities: {
          transports: windowsCapabilities.transports,
          execution: windowsCapabilities.execution,
        },
      }),
      connection
    );

    expect(getAgentPlatformCapabilities("agent-alpha")?.capabilities).toEqual(
      windowsCapabilities
    );
  });
});
