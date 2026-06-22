import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_AGENT_STALE_THRESHOLD_MS } from "../../shared/printing/agentHeartbeat";
import type { PlatformCapabilities } from "../../shared/printing/platformCapabilities";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { clearAgentRegistry, getAgent } from "./agentRegistry";
import {
  registerPrintAgent,
  recordAgentHeartbeat,
  unregisterPrintAgent,
} from "./agentLifecycleService";
import {
  clearAgentRestaurantProjectionCache,
  inferRestaurantIdFromAgentId,
  rememberAgentRestaurantProjection,
} from "./endpointRegistryCompatibility";
import { clearEndpointRegistry, getEndpoint, listEndpoints } from "./endpointRegistry";
import { processAgentPlatformCapabilitiesReport } from "./platformCapabilityNegotiationFlow";
import { clearPlatformCapabilityStore } from "./platformCapabilityStore";
import { processAgentPrinterProfilesReport } from "./printerProfileNegotiationFlow";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { sampleProfile } from "./printingTestHelpers";

const restaurantId = 720007;
const agentId = "mineuqr-agent-720007";

const windowsCapabilities: PlatformCapabilities = {
  platform: "windows",
  transports: { usb: true, network: false, bluetooth: false },
  execution: { localPrinting: true },
};

function registerWindowsAgent(id = agentId): void {
  registerPrintAgent({
    identity: {
      agentId: id,
      platform: "windows",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: new Date().toISOString(),
  });
}

describe("endpointRegistryProjection THERMAL-PRINTING-12E.2B", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearEndpointRegistry();
    clearPrinterProfileStore();
    clearPlatformCapabilityStore();
    clearAgentRestaurantProjectionCache();
  });

  it("infers restaurant ownership from deterministic agent id suffix", () => {
    expect(inferRestaurantIdFromAgentId(agentId)).toBe(restaurantId);
  });

  describe("Scenario A — Agent Connect → Endpoint Created", () => {
    it("projects a Windows agent into endpoint registry on registration", () => {
      registerWindowsAgent();

      const endpoint = getEndpoint(agentId);
      expect(endpoint).toBeDefined();
      expect(endpoint?.endpointId).toBe(agentId);
      expect(endpoint?.endpointType).toBe("WINDOWS_AGENT");
      expect(endpoint?.restaurantId).toBe(restaurantId);
      expect(endpoint?.connectivityState).toBe("ONLINE");
    });
  });

  describe("Scenario B — Heartbeat → Endpoint ONLINE", () => {
    it("keeps endpoint ONLINE after heartbeat refresh", () => {
      registerWindowsAgent();
      const staleAt = new Date(Date.now() - DEFAULT_AGENT_STALE_THRESHOLD_MS - 1_000).toISOString();

      recordAgentHeartbeat({
        agentId,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        timestamp: staleAt,
      });

      expect(getEndpoint(agentId)?.connectivityState).toBe("STALE");

      const freshAt = new Date().toISOString();
      recordAgentHeartbeat({
        agentId,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        timestamp: freshAt,
      });

      const endpoint = getEndpoint(agentId);
      expect(endpoint?.connectivityState).toBe("ONLINE");
      expect(endpoint?.lastSeenAt?.toISOString()).toBe(freshAt);
    });
  });

  describe("Scenario C — Disconnect → Endpoint OFFLINE", () => {
    it("marks projected endpoint OFFLINE when agent unregisters", () => {
      registerWindowsAgent();
      expect(getEndpoint(agentId)?.connectivityState).toBe("ONLINE");

      unregisterPrintAgent(agentId);

      expect(getAgent(agentId)).toBeUndefined();
      const endpoint = getEndpoint(agentId);
      expect(endpoint).toBeDefined();
      expect(endpoint?.connectivityState).toBe("OFFLINE");
    });
  });

  describe("Scenario D — Capabilities Reported → EndpointCapabilities Updated", () => {
    it("projects platform and printer inventory capabilities into endpoint record", () => {
      registerWindowsAgent();

      processAgentPlatformCapabilitiesReport({
        agentId,
        timestamp: "2026-06-22T10:00:00.000Z",
        platform: windowsCapabilities.platform,
        capabilities: {
          transports: windowsCapabilities.transports,
          execution: windowsCapabilities.execution,
        },
      });

      processAgentPrinterProfilesReport({
        agentId,
        timestamp: "2026-06-22T10:01:00.000Z",
        printers: [sampleProfile],
      });

      const endpoint = getEndpoint(agentId);
      expect(endpoint?.capabilities.transports.usb).toBe(true);
      expect(endpoint?.capabilities.execution.localPrinting).toBe(true);
      expect(endpoint?.capabilities.execution.methods).toEqual(
        expect.arrayContaining(["raw-escpos", "spooler"])
      );
      expect(endpoint?.metadata?.printerInventory).toEqual(
        expect.objectContaining({ profileCount: 1 })
      );
    });
  });

  describe("Scenario E — listEndpoints() → Returns active Windows endpoint", () => {
    it("lists hydrated Windows endpoints filtered by restaurant", () => {
      rememberAgentRestaurantProjection("agent-other", 999);
      registerWindowsAgent("agent-other");
      registerWindowsAgent(agentId);

      const all = listEndpoints();
      expect(all).toHaveLength(2);

      const scoped = listEndpoints({ restaurantId });
      expect(scoped).toHaveLength(1);
      expect(scoped[0]?.endpointId).toBe(agentId);
      expect(scoped[0]?.endpointType).toBe("WINDOWS_AGENT");
      expect(scoped[0]?.connectivityState).toBe("ONLINE");
    });

    it("does not project non-Windows runtime agents in this phase", () => {
      registerPrintAgent({
        identity: {
          agentId: "agent-android-720007",
          platform: "android",
          protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        },
      });

      expect(listEndpoints()).toHaveLength(0);
    });
  });
});
