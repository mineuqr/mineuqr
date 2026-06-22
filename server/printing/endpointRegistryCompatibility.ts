/**
 * THERMAL-PRINTING-12E.2A / 12E.2B — Agent → Endpoint Registry compatibility layer.
 *
 * Integration boundary for projecting legacy agent-centric runtime state into the
 * platform-neutral endpoint registry. `agentRegistry`, `printerProfileStore`, and
 * `platformCapabilityStore` remain authoritative; endpoint records are read-model
 * projections only.
 *
 * @see docs/thermal-printing/ENDPOINT-REGISTRY-COMPATIBILITY.md
 */
import { calculateAgentStatus } from "../../shared/printing/agentHeartbeat";
import type { AgentPlatform, AgentStatus } from "../../shared/printing/agentTypes";
import type { PlatformCapabilities } from "../../shared/printing/platformCapabilities";
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import type { EndpointCapabilities } from "../../shared/printing/endpoints/endpointCapabilities";
import type { EndpointConnectivityState } from "../../shared/printing/endpoints/endpointConnectivity";
import type { EndpointRecord } from "../../shared/printing/endpoints/endpointRecord";
import type { EndpointType } from "../../shared/printing/endpoints/endpointTypes";
import { getAgent, type RegisteredAgent } from "./agentRegistry";
import { getStoredAgentPlatformCapabilities } from "./platformCapabilityStore";
import {
  getStoredAgentPrinterInventory,
  type AgentPrinterInventoryRecord,
} from "./printerProfileStore";

/**
 * Stable 1:1 identity bridge during migration: legacy `agentId` becomes
 * `endpointId` for runtime endpoints. LAN printers and vendor connectors
 * receive their own ids (not agent ids).
 */
export function mapAgentIdToEndpointId(agentId: string): string {
  return agentId.trim();
}

/**
 * Maps legacy agent platform strings to the normalized endpoint type taxonomy.
 */
export function mapAgentPlatformToEndpointType(
  platform: AgentPlatform
): EndpointType {
  switch (platform) {
    case "windows":
      return "WINDOWS_AGENT";
    case "android":
      return "ANDROID_RUNTIME";
    case "ios":
      return "IOS_RUNTIME";
  }
}

/**
 * Derives endpoint connectivity from a registered agent's heartbeat metadata.
 * Uppercase states align with the endpoint registry; legacy agent status remains
 * lowercase until agentLifecycleService is migrated in 12E.2B+.
 */
export function mapAgentConnectivityToEndpointState(input: {
  isRegistered: boolean;
  agentStatus: "online" | "offline" | "stale";
}): EndpointConnectivityState {
  if (!input.isRegistered || input.agentStatus === "offline") {
    return "OFFLINE";
  }
  if (input.agentStatus === "stale") {
    return "STALE";
  }
  if (input.agentStatus === "online") {
    return "ONLINE";
  }
  return "UNKNOWN";
}

/**
 * Translates agent-reported platform capabilities into endpoint capabilities.
 * Preserves transport booleans and local execution without Windows-only fields.
 */
export function mapPlatformCapabilitiesToEndpointCapabilities(
  platformCapabilities: PlatformCapabilities
): EndpointCapabilities {
  const { transports, execution } = platformCapabilities;

  return {
    transports: {
      usb: transports.usb,
      bluetooth: transports.bluetooth,
      network: transports.network,
      airprint: platformCapabilities.platform === "ios" && transports.network,
      vendorConnector: false,
    },
    execution: {
      localPrinting: execution.localPrinting,
      methods: deriveExecutionMethodsFromPlatform(platformCapabilities),
    },
  };
}

function deriveExecutionMethodsFromPlatform(
  platformCapabilities: PlatformCapabilities
): EndpointCapabilities["execution"]["methods"] {
  const methods: EndpointCapabilities["execution"]["methods"] = [];

  if (platformCapabilities.execution.localPrinting) {
    if (platformCapabilities.transports.usb) {
      methods.push("raw-escpos", "spooler");
    }
    if (platformCapabilities.transports.bluetooth) {
      methods.push("raw-escpos");
    }
    if (platformCapabilities.transports.network) {
      methods.push("raw-escpos");
    }
    if (platformCapabilities.platform === "ios") {
      methods.push("airprint");
    }
  }

  return Array.from(new Set(methods));
}

/**
 * Projects a `RegisteredAgent` into an `EndpointRecord` shape for dual-write or
 * read-model hydration. Does not persist — callers use `endpointRegistry` in
 * 12E.2B when migration begins.
 */
export function projectRegisteredAgentToEndpointRecord(input: {
  agent: RegisteredAgent;
  restaurantId: number;
  displayName?: string;
  connectivityState: EndpointConnectivityState;
  capabilities: EndpointCapabilities;
  metadata?: Record<string, unknown>;
}): EndpointRecord {
  const { agent, restaurantId } = input;
  const endpointId = mapAgentIdToEndpointId(agent.registration.identity.agentId);

  return {
    endpointId,
    endpointType: mapAgentPlatformToEndpointType(agent.registration.identity.platform),
    restaurantId,
    displayName:
      input.displayName?.trim() ||
      `Agent ${agent.registration.identity.agentId}`,
    connectivityState: input.connectivityState,
    lastSeenAt: agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt) : null,
    capabilities: input.capabilities,
    metadata: {
      ...input.metadata,
      legacyAgentId: agent.registration.identity.agentId,
      protocolVersion: agent.registration.identity.protocolVersion,
      connectedAt: agent.registration.connectedAt,
    },
  };
}

/**
 * Printer inventory remains a separate concern from endpoint identity.
 * During migration, inventory is attached as endpoint metadata so resolution
 * can continue reading `printerProfileStore` while observability surfaces
 * unify under the endpoint record.
 */
export function attachPrinterInventoryMetadata(
  inventory: AgentPrinterInventoryRecord
): Record<string, unknown> {
  return {
    printerInventory: {
      profileCount: inventory.profiles.length,
      timestamp: inventory.timestamp,
      updatedAt: inventory.updatedAt,
    },
  };
}

/**
 * Full inventory profiles are not duplicated on the endpoint record by default.
 * A future adapter may embed summarized profile fingerprints for drift detection.
 */
export function fingerprintPrinterInventoryProfiles(
  profiles: PrinterProfile[]
): string {
  return JSON.stringify(
    profiles.map((profile) => ({
      printerId: profile.printerId,
      printerName: profile.printerName,
      transport: profile.transport,
    }))
  );
}

const restaurantProjectionByAgentId = new Map<string, number>();

export function rememberAgentRestaurantProjection(
  agentId: string,
  restaurantId: number
): void {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return;
  }
  restaurantProjectionByAgentId.set(agentId.trim(), restaurantId);
}

export function clearAgentRestaurantProjectionCache(): void {
  restaurantProjectionByAgentId.clear();
}

/**
 * Derives restaurant ownership from agent id suffix (e.g. `mineuqr-agent-720007`).
 */
export function inferRestaurantIdFromAgentId(agentId: string): number | undefined {
  const suffixMatch = agentId.trim().match(/-(\d+)$/);
  if (!suffixMatch) {
    return undefined;
  }

  const restaurantId = Number(suffixMatch[1]);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return undefined;
  }

  return restaurantId;
}

export function resolveRestaurantIdForAgent(
  agentId: string,
  options: { storedRestaurantId?: number } = {}
): number | undefined {
  const normalized = agentId.trim();
  return (
    restaurantProjectionByAgentId.get(normalized) ??
    options.storedRestaurantId ??
    inferRestaurantIdFromAgentId(normalized)
  );
}

export function emptyEndpointCapabilities(): EndpointCapabilities {
  return {
    transports: {
      usb: false,
      bluetooth: false,
      network: false,
      airprint: false,
      vendorConnector: false,
    },
    execution: {
      localPrinting: false,
      methods: [],
    },
  };
}

export function mapPrinterInventoryToEndpointCapabilities(
  profiles: PrinterProfile[]
): EndpointCapabilities {
  const transports = {
    usb: false,
    bluetooth: false,
    network: false,
    airprint: false,
    vendorConnector: false,
  };

  for (const profile of profiles) {
    switch (profile.transport) {
      case "usb":
        transports.usb = true;
        break;
      case "bluetooth":
        transports.bluetooth = true;
        break;
      case "network":
        transports.network = true;
        break;
    }

    if (profile.executionCapabilities.airprint) {
      transports.airprint = true;
    }
    if (profile.executionCapabilities.vendorSdk) {
      transports.vendorConnector = true;
    }
  }

  const methods: EndpointCapabilities["execution"]["methods"] = [];
  if (transports.usb) {
    methods.push("raw-escpos", "spooler");
  }
  if (transports.bluetooth || transports.network) {
    methods.push("raw-escpos");
  }
  if (transports.airprint) {
    methods.push("airprint");
  }
  if (transports.vendorConnector) {
    methods.push("vendor-sdk");
  }

  return {
    transports,
    execution: {
      localPrinting: profiles.length > 0,
      methods: Array.from(new Set(methods)),
    },
  };
}

export function mergeEndpointCapabilities(
  platformCapabilities: EndpointCapabilities | undefined,
  inventoryCapabilities: EndpointCapabilities | undefined
): EndpointCapabilities {
  if (!platformCapabilities && !inventoryCapabilities) {
    return emptyEndpointCapabilities();
  }
  if (!platformCapabilities) {
    return inventoryCapabilities!;
  }
  if (!inventoryCapabilities) {
    return platformCapabilities;
  }

  return {
    transports: {
      usb: platformCapabilities.transports.usb || inventoryCapabilities.transports.usb,
      bluetooth:
        platformCapabilities.transports.bluetooth ||
        inventoryCapabilities.transports.bluetooth,
      network:
        platformCapabilities.transports.network ||
        inventoryCapabilities.transports.network,
      airprint:
        platformCapabilities.transports.airprint ||
        inventoryCapabilities.transports.airprint,
      vendorConnector:
        platformCapabilities.transports.vendorConnector ||
        inventoryCapabilities.transports.vendorConnector,
    },
    execution: platformCapabilities.execution,
  };
}

/**
 * Projects endpoint capabilities from authoritative stores (no duplication).
 */
export function resolveEndpointCapabilitiesFromStores(
  agentId: string
): EndpointCapabilities {
  const platformRecord = getStoredAgentPlatformCapabilities(agentId);
  const inventory = getStoredAgentPrinterInventory(agentId);

  const platformCapabilities = platformRecord
    ? mapPlatformCapabilitiesToEndpointCapabilities(platformRecord.capabilities)
    : undefined;
  const inventoryCapabilities = inventory
    ? mapPrinterInventoryToEndpointCapabilities(inventory.profiles)
    : undefined;

  return mergeEndpointCapabilities(platformCapabilities, inventoryCapabilities);
}

export function resolveAgentStatusForProjection(
  agentId: string,
  options: { now?: Date; staleThresholdMs?: number } = {}
): AgentStatus {
  const agent = getAgent(agentId);
  if (!agent) {
    return "offline";
  }

  return calculateAgentStatus({
    isRegistered: true,
    lastHeartbeatAt: agent.lastHeartbeatAt,
    now: options.now,
    staleThresholdMs: options.staleThresholdMs,
  });
}

export function resolveEndpointConnectivityForAgent(
  agentId: string,
  options: { now?: Date; staleThresholdMs?: number } = {}
): EndpointConnectivityState {
  const agent = getAgent(agentId);
  if (!agent) {
    return "OFFLINE";
  }

  if (!agent.lastHeartbeatAt) {
    return "UNKNOWN";
  }

  return mapAgentConnectivityToEndpointState({
    isRegistered: true,
    agentStatus: resolveAgentStatusForProjection(agentId, options),
  });
}

export function buildEndpointProjectionMetadata(
  agentId: string,
  existingMetadata?: Record<string, unknown>
): Record<string, unknown> | undefined {
  const agent = getAgent(agentId);
  const inventory = getStoredAgentPrinterInventory(agentId);
  const metadata: Record<string, unknown> = {
    ...existingMetadata,
  };

  if (agent) {
    metadata.legacyAgentId = agent.registration.identity.agentId;
    metadata.protocolVersion = agent.registration.identity.protocolVersion;
    metadata.connectedAt = agent.registration.connectedAt;
  }

  if (inventory) {
    Object.assign(metadata, attachPrinterInventoryMetadata(inventory));
    metadata.printerInventoryFingerprint = fingerprintPrinterInventoryProfiles(
      inventory.profiles
    );
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export function shouldProjectWindowsAgent(agent: RegisteredAgent): boolean {
  return agent.registration.identity.platform === "windows";
}

export function hydrateStoredEndpointRecord(
  stored: EndpointRecord,
  options: { now?: Date; staleThresholdMs?: number } = {}
): EndpointRecord {
  const agentId = mapAgentIdToEndpointId(stored.endpointId);
  const agent = getAgent(agentId);

  if (!agent) {
    return {
      ...stored,
      connectivityState: "OFFLINE",
      capabilities: resolveEndpointCapabilitiesFromStores(agentId),
      metadata: buildEndpointProjectionMetadata(agentId, stored.metadata),
    };
  }

  return {
    ...stored,
    endpointType: mapAgentPlatformToEndpointType(agent.registration.identity.platform),
    displayName: stored.displayName || `Agent ${agent.registration.identity.agentId}`,
    connectivityState: resolveEndpointConnectivityForAgent(agentId, options),
    lastSeenAt: agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt) : null,
    capabilities: resolveEndpointCapabilitiesFromStores(agentId),
    metadata: buildEndpointProjectionMetadata(agentId, stored.metadata),
  };
}
