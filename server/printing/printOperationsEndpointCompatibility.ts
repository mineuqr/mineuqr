/**
 * THERMAL-PRINTING-12E.3D — Printer Operations → Endpoint Operations compatibility.
 *
 * Adapters for future UI migration. Existing `printOperationsService` APIs remain
 * unchanged and authoritative for Printer Operations in this phase.
 */
import type { EndpointConnectivityState } from "../../shared/printing/endpoints/endpointConnectivity";
import type { EndpointRecord } from "../../shared/printing/endpoints/endpointRecord";
import type { EndpointType, RuntimeEndpointType } from "../../shared/printing/endpoints/endpointTypes";
import { isRuntimeEndpointType } from "../../shared/printing/endpoints/endpointTypes";
import type { AgentOverviewItem } from "./printOperationsTypes";
import type { EndpointOperationsItem } from "./endpointOperationsTypes";
import { listEndpointOperations } from "./endpointOperationsService";

export function mapEndpointConnectivityToAgentStatus(
  connectivityState: EndpointConnectivityState
): AgentOverviewItem["status"] {
  switch (connectivityState) {
    case "ONLINE":
      return "online";
    case "STALE":
      return "stale";
    case "OFFLINE":
    case "UNKNOWN":
    default:
      return "offline";
  }
}

export function mapEndpointTypeToAgentPlatform(
  endpointType: RuntimeEndpointType
): AgentOverviewItem["platform"] {
  switch (endpointType) {
    case "WINDOWS_AGENT":
      return "windows";
    case "ANDROID_RUNTIME":
      return "android";
    case "IOS_RUNTIME":
      return "ios";
  }
}

export function mapEndpointOperationsItemToAgentOverviewItem(
  item: EndpointOperationsItem,
  options: {
    connectedAt?: string | null;
    reportedProfileCount?: number;
  } = {}
): AgentOverviewItem | null {
  if (!isRuntimeEndpointType(item.endpointType)) {
    return null;
  }

  return {
    agentId: item.endpointId,
    status: mapEndpointConnectivityToAgentStatus(item.connectivityState),
    platform: mapEndpointTypeToAgentPlatform(item.endpointType),
    connectedAt: options.connectedAt ?? null,
    lastHeartbeatAt: item.lastSeenAt?.toISOString() ?? null,
    reportedProfileCount: options.reportedProfileCount ?? 0,
  };
}

export function mapEndpointRecordToAgentOverviewItem(
  record: EndpointRecord
): AgentOverviewItem | null {
  const profileCount =
    typeof record.metadata?.printerInventory === "object" &&
    record.metadata.printerInventory !== null &&
    "profileCount" in record.metadata.printerInventory &&
    typeof record.metadata.printerInventory.profileCount === "number"
      ? record.metadata.printerInventory.profileCount
      : 0;

  const connectedAt =
    typeof record.metadata?.connectedAt === "string" ? record.metadata.connectedAt : null;

  return mapEndpointOperationsItemToAgentOverviewItem(
    {
      endpointId: record.endpointId,
      endpointType: record.endpointType,
      displayName: record.displayName,
      restaurantId: record.restaurantId,
      connectivityState: record.connectivityState,
      lastSeenAt: record.lastSeenAt,
      capabilities: record.capabilities,
    },
    {
      connectedAt,
      reportedProfileCount: profileCount,
    }
  );
}

/**
 * Endpoint-centric alternative to legacy agent overview listing.
 * Not wired to existing Printer Operations APIs in 12E.3.
 */
export function listAgentOverviewFromEndpointOperations(
  restaurantId: number
): AgentOverviewItem[] {
  return listEndpointOperations({ restaurantId })
    .map((item) => mapEndpointOperationsItemToAgentOverviewItem(item))
    .filter((item): item is AgentOverviewItem => item !== null)
    .sort((left, right) => left.agentId.localeCompare(right.agentId));
}

export function isAgentCompatibleEndpointType(
  endpointType: EndpointType
): endpointType is RuntimeEndpointType {
  return isRuntimeEndpointType(endpointType);
}
