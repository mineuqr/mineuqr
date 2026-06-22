import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_AGENT_STALE_THRESHOLD_MS } from "../../shared/printing/agentHeartbeat";
import type { PlatformCapabilities } from "../../shared/printing/platformCapabilities";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { clearAgentRegistry } from "./agentRegistry";
import {
  registerPrintAgent,
  recordAgentHeartbeat,
} from "./agentLifecycleService";
import {
  clearAgentRestaurantProjectionCache,
  rememberAgentRestaurantProjection,
} from "./endpointRegistryCompatibility";
import { clearEndpointRegistry } from "./endpointRegistry";
import {
  getEndpointOperationsItem,
  getEndpointOperationsSummary,
  listEndpointOperations,
} from "./endpointOperationsService";
import { getEndpoint, listEndpoints } from "./endpointQueryService";
import { processAgentPlatformCapabilitiesReport } from "./platformCapabilityNegotiationFlow";
import { clearPlatformCapabilityStore } from "./platformCapabilityStore";
import { processAgentPrinterProfilesReport } from "./printerProfileNegotiationFlow";
import { clearPrinterProfileStore } from "./printerProfileStore";
import {
  listAgentOverviewFromEndpointOperations,
  mapEndpointConnectivityToAgentStatus,
  mapEndpointOperationsItemToAgentOverviewItem,
} from "./printOperationsEndpointCompatibility";
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

describe("endpointQueryService THERMAL-PRINTING-12E.3A", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearEndpointRegistry();
    clearPrinterProfileStore();
    clearPlatformCapabilityStore();
    clearAgentRestaurantProjectionCache();
  });

  it("returns hydrated endpoint records from the official query API", () => {
    registerWindowsAgent();

    const endpoint = getEndpoint(agentId);
    expect(endpoint).toMatchObject({
      endpointId: agentId,
      endpointType: "WINDOWS_AGENT",
      restaurantId,
      connectivityState: "ONLINE",
    });
    expect(endpoint?.capabilities).toBeDefined();
    expect(listEndpoints({ restaurantId })).toHaveLength(1);
  });

  it("filters hydrated endpoints by connectivity state", () => {
    registerWindowsAgent();
    const staleAt = new Date(Date.now() - DEFAULT_AGENT_STALE_THRESHOLD_MS - 1_000).toISOString();

    recordAgentHeartbeat({
      agentId,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      timestamp: staleAt,
    });

    expect(listEndpoints({ connectivityState: "STALE" })).toHaveLength(1);
    expect(listEndpoints({ connectivityState: "ONLINE" })).toHaveLength(0);
  });
});

describe("endpointOperationsService THERMAL-PRINTING-12E.3B/12E.3C", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearEndpointRegistry();
    clearPrinterProfileStore();
    clearPlatformCapabilityStore();
    clearAgentRestaurantProjectionCache();
  });

  describe("Scenario A — Connected Windows Agent appears in listEndpointOperations()", () => {
    it("maps registry records into EndpointOperationsItem views", () => {
      registerWindowsAgent();

      const items = listEndpointOperations({ restaurantId });
      expect(items).toEqual([
        {
          endpointId: agentId,
          endpointType: "WINDOWS_AGENT",
          displayName: expect.any(String),
          restaurantId,
          connectivityState: "ONLINE",
          lastSeenAt: expect.any(Date),
          capabilities: expect.objectContaining({
            transports: expect.any(Object),
            execution: expect.any(Object),
          }),
        },
      ]);
      expect(getEndpointOperationsItem(agentId)?.endpointType).toBe("WINDOWS_AGENT");
    });
  });

  describe("Scenario B — Heartbeat updates connectivity state", () => {
    it("reflects ONLINE and STALE in operations items", () => {
      registerWindowsAgent();
      const staleAt = new Date(Date.now() - DEFAULT_AGENT_STALE_THRESHOLD_MS - 1_000).toISOString();

      recordAgentHeartbeat({
        agentId,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        timestamp: staleAt,
      });

      expect(getEndpointOperationsItem(agentId)?.connectivityState).toBe("STALE");

      recordAgentHeartbeat({
        agentId,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        timestamp: new Date().toISOString(),
      });

      expect(getEndpointOperationsItem(agentId)?.connectivityState).toBe("ONLINE");
    });
  });

  describe("Scenario C — Capabilities reported update operations view", () => {
    it("includes projected platform and inventory capabilities", () => {
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

      const item = getEndpointOperationsItem(agentId);
      expect(item?.capabilities.transports.usb).toBe(true);
      expect(item?.capabilities.execution.methods).toEqual(
        expect.arrayContaining(["raw-escpos", "spooler"])
      );
    });
  });

  describe("Scenario D — Endpoint summary counts by status and type", () => {
    it("aggregates connectivity and endpoint type totals", () => {
      rememberAgentRestaurantProjection("agent-beta", restaurantId);
      registerWindowsAgent("agent-beta");
      registerWindowsAgent(agentId);

      recordAgentHeartbeat({
        agentId: "agent-beta",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        timestamp: new Date(Date.now() - DEFAULT_AGENT_STALE_THRESHOLD_MS - 1_000).toISOString(),
      });

      const summary = getEndpointOperationsSummary({ restaurantId });

      expect(summary).toEqual({
        totalEndpoints: 2,
        onlineEndpoints: 1,
        offlineEndpoints: 0,
        staleEndpoints: 1,
        unknownEndpoints: 0,
        byType: {
          WINDOWS_AGENT: 2,
          ANDROID_RUNTIME: 0,
          IOS_RUNTIME: 0,
          LAN_PRINTER: 0,
          VENDOR_CONNECTOR: 0,
        },
      });
    });
  });
});

describe("printOperationsEndpointCompatibility THERMAL-PRINTING-12E.3D", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearEndpointRegistry();
    clearPrinterProfileStore();
    clearPlatformCapabilityStore();
    clearAgentRestaurantProjectionCache();
  });

  it("maps endpoint connectivity states to legacy agent status values", () => {
    expect(mapEndpointConnectivityToAgentStatus("ONLINE")).toBe("online");
    expect(mapEndpointConnectivityToAgentStatus("STALE")).toBe("stale");
    expect(mapEndpointConnectivityToAgentStatus("OFFLINE")).toBe("offline");
    expect(mapEndpointConnectivityToAgentStatus("UNKNOWN")).toBe("offline");
  });

  it("maps runtime endpoint operations items to AgentOverviewItem shape", () => {
    registerWindowsAgent();

    const item = listEndpointOperations({ restaurantId })[0]!;
    const overview = mapEndpointOperationsItemToAgentOverviewItem(item, {
      connectedAt: "2026-06-22T10:00:00.000Z",
      reportedProfileCount: 2,
    });

    expect(overview).toEqual({
      agentId,
      status: "online",
      platform: "windows",
      connectedAt: "2026-06-22T10:00:00.000Z",
      lastHeartbeatAt: expect.any(String),
      reportedProfileCount: 2,
    });
  });

  it("lists agent-compatible overview rows from endpoint operations", () => {
    registerWindowsAgent();

    const agents = listAgentOverviewFromEndpointOperations(restaurantId);
    expect(agents).toHaveLength(1);
    expect(agents[0]).toMatchObject({
      agentId,
      platform: "windows",
      status: "online",
    });
  });
});
