/**
 * THERMAL-PRINTING-12E.2A — Windows Agent → Endpoint Registry compatibility planning.
 *
 * This module documents and prototypes (without wiring) how legacy agent-centric
 * stores map into the multi-endpoint registry introduced in 12E.2A.
 *
 * Full migration belongs to THERMAL-PRINTING-12E.2B and later. Until then:
 * - `agentRegistry` remains authoritative for routing, assignment, and dispatch.
 * - `printerProfileStore` remains authoritative for printer inventory reads.
 * - `endpointRegistry` is domain-only and must not be consulted by print flows.
 *
 * @see docs/thermal-printing/ENDPOINT-REGISTRY-COMPATIBILITY.md
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import type { PlatformCapabilities } from "../../shared/printing/platformCapabilities";
import type { PrinterProfile } from "../../shared/printing/printerProfiles";
import type { EndpointCapabilities } from "../../shared/printing/endpoints/endpointCapabilities";
import type { EndpointConnectivityState } from "../../shared/printing/endpoints/endpointConnectivity";
import type { EndpointRecord } from "../../shared/printing/endpoints/endpointRecord";
import type { EndpointType } from "../../shared/printing/endpoints/endpointTypes";
import type { RegisteredAgent } from "./agentRegistry";
import type { AgentPrinterInventoryRecord } from "./printerProfileStore";

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
